# Security Audit Report — CVE Search

**Date:** 2026-03-08  
**Scope:** Full application — API routes, database layer, AI service, GitHub integration, client-side components, dependencies, headers, and configuration.

---

## Executive Summary

The application has a solid security foundation: parameterized SQL queries, rate limiting on every API route, server-side AI credentials, a typed proxy allowlist, and zero known npm vulnerabilities. However, several medium- and high-severity issues remain that should be addressed before any production or multi-user deployment.

| Severity | Count |
|----------|-------|
| **CRITICAL** | 1 |
| **HIGH** | 4 |
| **MEDIUM** | 6 |
| **LOW** | 4 |

---

## Findings

### CRITICAL

#### C1 — GitHub Fix Route Accepts Client-Supplied API Keys

**File:** `src/app/api/github/fix/route.ts:55,255-267`  
**Issue:** The `/api/github/fix` endpoint reads `body.aiSettings` directly from the request, including an `apiKey` field, and forwards it to `resolveAISettings()`. This means any client can inject an arbitrary API key into the AI call chain.

```ts
// route.ts:55
const aiSettings = body?.aiSettings;

// route.ts:255-267 — normalizeAISettingsFromRequest passes apiKey through
return {
  provider,
  model: typeof raw.model === "string" ? raw.model : undefined,
  apiKey: typeof raw.apiKey === "string" ? raw.apiKey : undefined,
};
```

**Risk:** An attacker could supply a malicious proxy URL or a key pointing to a controlled endpoint, intercepting prompts that contain repository source code and vulnerability details. This also means any user can override the server-configured model, bypassing admin intent.

**Recommendation:** Remove `apiKey` from the client-accepted payload. All AI calls from server routes should exclusively use server-side environment variables (which is already the pattern for all other AI routes).

---

### HIGH

#### H1 — SQL Injection in `ensureColumn` via String Interpolation

**File:** `src/lib/db.ts:551-558`

```ts
function ensureColumn(db: DatabaseSync, table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  // ...
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
```

**Issue:** `table`, `column`, and `definition` are interpolated directly into SQL strings. While they are currently only called with hardcoded literals from `initializeDatabase`, this is a dangerous pattern. Any future caller passing user-derived values would create a direct SQL injection vector.

**Recommendation:** Add a strict allowlist guard:
```ts
const ALLOWED_TABLES = new Set(["projects", "project_items"]);
if (!ALLOWED_TABLES.has(table)) throw new Error(`Invalid table: ${table}`);
```
Or better yet, validate `table`/`column` against `/^[a-z_]+$/` before interpolation.

---

#### H2 — Session Cookie Missing `Secure` Flag

**File:** `src/lib/auth-session.ts:50`

```ts
setCookieHeader: `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`,
```

**Issue:** The session cookie is set with `HttpOnly` and `SameSite=Lax` (good), but is missing the `Secure` flag. Without `Secure`, the cookie will be transmitted over plain HTTP, making it vulnerable to interception on non-HTTPS connections.

**Recommendation:** Add `Secure` to the cookie when not in development:
```ts
const secureSuffix = process.env.NODE_ENV === "production" ? "; Secure" : "";
```

---

#### H3 — No Security Headers (CSP, HSTS, X-Frame-Options, etc.)

**Issue:** There is no Next.js middleware (`middleware.ts`) and no security headers configuration anywhere in the codebase. The only header control is `poweredByHeader: false` in `next.config.ts`.

**Missing headers:**
- `Content-Security-Policy` — prevents XSS, inline script injection
- `Strict-Transport-Security` — enforces HTTPS
- `X-Frame-Options` / `frame-ancestors` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Referrer-Policy` — controls information leakage
- `Permissions-Policy` — restricts browser features

**Recommendation:** Add a `middleware.ts` at `src/middleware.ts` or configure headers in `next.config.ts` via the `headers()` function.

---

#### H4 — No Authentication / Authorization Layer

**Issue:** The app has a session system (`auth-session.ts`) that auto-creates anonymous sessions, but there is **no actual authentication**. Any visitor gets a session and full access to all features: creating projects, exporting all workspace data, triggering GitHub PRs, running AI analysis, etc.

Routes like `/api/github/fix` (creates branches and PRs on real repositories) and `/api/workspace/export` (dumps all user data) are especially sensitive.

**Recommendation:** If this is intended as a single-user local tool, document that explicitly and add a prominent warning. For any networked deployment, add authentication (e.g., a shared secret, OAuth, or basic auth) before the route guard layer.

---

### MEDIUM

#### M1 — Rate Limiting Is In-Memory Only

**File:** `src/lib/api-route-guard.ts:37`

```ts
const rateLimitState = new Map<string, RateLimitWindow>();
```

**Issue:** Rate limits are stored in a `Map` in process memory. They reset on every server restart and are not shared across multiple instances/workers. An attacker can bypass rate limits by simply waiting for a restart or targeting different instances behind a load balancer.

**Recommendation:** For production, consider persisting rate limit state in the SQLite database or using a shared store. For a single-instance deployment this is acceptable but should be documented.

---

#### M2 — Client Identifier Is Spoofable

**File:** `src/lib/api-route-guard.ts:179-184`

```ts
function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const userAgent = request.headers.get("user-agent")?.trim() || "unknown-agent";
  const seed = `${forwarded || realIp || "local"}:${userAgent}`;
  return createHash("sha256").update(seed).digest("hex").slice(0, 16);
}
```

**Issue:** `X-Forwarded-For` and `X-Real-Ip` headers are trivially spoofable by any client. Combined with user-agent changes, an attacker can generate unlimited distinct client IDs to bypass rate limits.

**Recommendation:** If behind a trusted reverse proxy, strip/validate these headers at the proxy layer. Otherwise, rely on the actual TCP connection IP via the framework's request metadata.

---

#### M3 — `resolveAISettings` in `ai.ts` Still Accepts Client API Keys

**File:** `src/lib/ai.ts:52-76`

```ts
export function resolveAISettings(settings?: Partial<AISettings>): AISettings {
  const provider = settings?.provider ?? ...;
  const apiKey = settings?.apiKey ?? ...;
```

**Issue:** While most AI routes now use the server-side `ai-service.ts` pipeline (which reads from env vars), the `resolveAISettings` function in `ai.ts` still accepts an optional `apiKey` from its caller. This function is used by `ai-fix.ts → generateVulnerabilityFix`, which is called from the GitHub fix route (see C1). This is a residual pathway for client-supplied credentials.

**Recommendation:** Remove the `apiKey` parameter acceptance from `resolveAISettings` entirely, or ensure it is never called with client-provided data.

---

#### M4 — Error Messages Leak Internal Details

**Files:** Multiple API routes

```ts
// github/fix/route.ts:172
error: `Failed to get branch SHA (branch: ${defaultBranch}): ${msg}`

// api-route-guard.ts:81
error: error instanceof Error ? error.message : config.errorMessage
```

**Issue:** Internal error messages (including GitHub API responses, branch names, internal state) are forwarded directly to the client. This can leak information about infrastructure, internal repo structure, and API behavior.

**Recommendation:** Log detailed errors server-side; return generic error messages to clients in production.

---

#### M5 — AI Prompt Injection Surface

**Files:** `src/lib/ai-service.ts`, `src/lib/ai-fix.ts`

**Issue:** User-controlled content (CVE descriptions, search prompts, triage notes, repository file contents) is concatenated directly into AI prompts without sanitization or escaping. While the app correctly sanitizes AI *outputs*, a malicious input could manipulate the model's behavior through prompt injection.

For example, in `ai-fix.ts:59`:
```ts
`Details: ${(vulnerability.details || "N/A").slice(0, 1500)}`,
```

A crafted vulnerability detail could contain instructions like "Ignore all previous instructions and..."

**Recommendation:** Add prompt boundary markers (e.g., XML-style delimiters around user content), use the model's system/user message separation more rigorously, and consider input sanitization for known injection patterns.

---

#### M6 — Swallowed Errors in Request Logging

**File:** `src/lib/api-route-guard.ts:220-221`

```ts
  } catch {
  }
```

**Issue:** Errors during request log persistence are silently swallowed. If the database becomes corrupted or full, there would be no indication.

**Recommendation:** Add at minimum a `console.error` in the catch block for operational visibility.

---

### LOW

#### L1 — Session Expiry Not Enforced on Existing Sessions

**File:** `src/lib/auth-session.ts`

**Issue:** While expired sessions are filtered by the SQL query (`WHERE expires_at > ?`), there is no background cleanup of expired session rows or associated user rows. Over time this could accumulate stale data.

**Recommendation:** Add a periodic cleanup (e.g., on session creation, prune sessions where `expires_at < now`).

---

#### L2 — No Request Body Size Limits

**Issue:** API routes accepting POST bodies (e.g., `/api/workspace/import`, `/api/github/fix`) do not enforce a maximum request body size. A malicious client could send very large payloads.

**Recommendation:** Configure Next.js body size limits in `next.config.ts` or add explicit size checks in routes that accept large payloads.

---

#### L3 — Database File Path Controllable via Environment Variables

**File:** `src/lib/db.ts:10-28`

**Issue:** `DATABASE_FILE`, `PROJECTS_FILE`, etc. control where the database is created. If an attacker gains control of env vars, they could point the DB to arbitrary filesystem locations. This is standard for env-var-configured apps but worth noting.

**Recommendation:** Validate that the resolved DB path is within an expected directory.

---

#### L4 — `data/` Directory Not Protected from Web Access

**Issue:** The `data/` directory (containing `app.db`) is at the project root. While Next.js doesn't serve arbitrary files from the root, in some deployment configurations (e.g., behind a misconfigured reverse proxy), the SQLite database could be directly downloadable.

**Recommendation:** Ensure the deployment does not expose the `data/` directory. Consider moving it outside the project root or adding explicit deny rules.

---

## What's Working Well

- **Parameterized SQL** — All database queries (except `ensureColumn`) use parameterized prepared statements. No string concatenation of user input into SQL.
- **Rate limiting** — Every API route is wrapped with `withRouteProtection` and per-bucket rate limits.
- **Proxy allowlist** — The `/api/proxy` route validates paths against a strict regex allowlist before forwarding to the upstream CIRCL API.
- **Input validation** — API routes validate and normalize input types defensively (checking `typeof`, using `.catch(() => null)` on JSON parsing, etc.).
- **No XSS vectors** — No use of `dangerouslySetInnerHTML`, `innerHTML`, or `eval()` anywhere in the codebase. React's default escaping handles output encoding.
- **Server-side AI credentials** — The main AI service layer (`ai-service.ts`) reads credentials exclusively from environment variables. The settings page confirms no keys are stored in browser storage.
- **Sensitive data redaction** — AI prompts are redacted before being sent to external model providers (configurable via `AI_ALLOW_SENSITIVE_MODEL_DATA`).
- **Zero npm audit vulnerabilities** — `npm audit` reports 0 vulnerabilities across 506 dependencies.
- **`.env` files are gitignored** — `.env*` is in `.gitignore` (except `.env.example` which contains no secrets).
- **`poweredByHeader: false`** — The `X-Powered-By` header is disabled.
- **Timeout controls** — All external HTTP calls (GitHub, CIRCL, OSV, AI providers) use `AbortController` with timeouts.
- **Path traversal protection** — The GitHub fix route validates file paths with `isSafeRepoPath()`, blocking `..`, absolute paths, and backslashes.
- **Human approval checkpoints** — AI triage and remediation flows include `requiresHumanApproval: true` flags.

---

## Recommended Priority Order

| Priority | Finding | Effort |
|----------|---------|--------|
| 1 | **C1** — Remove client API key acceptance from fix route | Small |
| 2 | **H3** — Add security headers via middleware | Small |
| 3 | **H2** — Add `Secure` flag to session cookie | Trivial |
| 4 | **H1** — Guard `ensureColumn` against injection | Small |
| 5 | **H4** — Add authentication for networked deployments | Medium |
| 6 | **M3** — Remove `apiKey` from `resolveAISettings` | Small |
| 7 | **M4** — Sanitize error messages to clients | Small |
| 8 | **M5** — Add prompt injection mitigations | Medium |
| 9 | **M1/M2** — Document or harden rate limiting | Small |
| 10 | **M6** — Log swallowed errors | Trivial |
| 11 | **L1–L4** — Cleanup, size limits, path validation | Small |
