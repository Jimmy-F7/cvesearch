# App Review Findings

## Summary

The app already has a clean UI and a decent starting structure, but it is still closer to a polished demo than a trustworthy security workflow. The biggest gaps are correctness, shareability, operational hardening, and feature completeness versus the README promise.

## Key Findings

### 1. Search and filter behavior is misleading

- The `vendor` filter is ignored unless `product` is also set.
- When both `vendor` and `product` are set, the app switches to a separate endpoint and silently drops `query`, `cwe`, and `since`.
- This creates trust issues because users can believe they are running a combined search when the app is actually ignoring part of the input.
- Relevant code:
  - `src/app/page.tsx`
  - `src/components/Filters.tsx`

### 2. The app is fully client-driven and loses context on reload

- Search query, filters, and pagination live only in component state.
- The app does not persist state in the URL, so deep-linking, sharing, reload, and browser navigation are weak.
- Both the search page and CVE detail page fetch after hydration instead of taking advantage of App Router server rendering.
- Relevant code:
  - `src/app/page.tsx`
  - `src/app/cve/[id]/page.tsx`

### 3. The product promise is ahead of the implementation

- The README advertises vendor browsing, CWE details, linked vulnerabilities, and richer detail exploration.
- The code exposes helper functions like `getVendors`, `getVendorProducts`, and `getCWE`, but the UI does not use them.
- Several detail areas are only exposed indirectly through raw JSON instead of a real analyst-facing experience.
- Relevant code:
  - `README.md`
  - `src/lib/api.ts`
  - `src/app/cve/[id]/page.tsx`

### 4. There is no real quality safety net

- `package.json` has no `test` script.
- No unit tests, integration tests, or end-to-end tests were found.
- No CI workflow was found in the repository.
- For an app built on top of an external schema that can evolve, this is a serious reliability gap.
- Relevant code:
  - `package.json`

### 5. The proxy works but is not hardened for production

- The proxy forwards upstream requests without an allowlist for supported paths.
- There are no request timeouts, retries, upstream response validation, or rate limiting.
- The current implementation is enough for a demo but weak for a public-facing app that depends on a third-party service.
- Relevant code:
  - `src/app/api/proxy/route.ts`

### 6. Build and deploy reliability need attention

- `npm run lint` passed.
- `npm run build` failed in this environment because `next/font/google` could not fetch `Geist` and `Geist Mono`.
- Next.js also warns that the workspace root is ambiguous because multiple lockfiles exist higher in the directory tree.
- These are avoidable deployment risks.
- Relevant code:
  - `src/app/layout.tsx`
  - `next.config.ts`

## Missing Features

- URL-driven search state and shareable result pages
- Real vendor and product browsing with autocomplete
- Sorting and filtering by severity, EPSS, source, published date, and modified date
- Rich CWE detail rendering instead of only showing raw CWE IDs
- Linked vulnerability views and better rendering for comments, CAPEC, and affected version ranges
- Saved searches and watchlists
- Export options such as CSV and JSON
- Analyst dashboards such as latest critical CVEs, highest EPSS, and new vulnerabilities by date window
- Better empty states, filter chips, and active-query visibility
- Observability and operational telemetry for upstream failures

## Suggested Product Direction

The highest-leverage move is to turn the app from a visually strong search page into a trustworthy analyst tool:

1. Fix correctness and state handling first.
2. Move to URL-first, server-rendered search flows.
3. Add tests and CI before shipping more complexity.
4. Complete the features the README already claims.
5. Add differentiated workflow features like saved searches, alerts, and enrichment feeds.
