# Improvement Plan

## Objective

Make the app trustworthy, shareable, fast, and operationally sound before expanding it into a richer vulnerability research workflow.

## Competitive Benchmark

OpenCVE is now the reference benchmark for missing product surface. See `docs/opencve-benchmark.md`.

The near-term implementation target is not full parity. The goal is to ship the highest-value OpenCVE-inspired features that fit a stateless Next.js app:

- saved views
- watchlist workflow
- stronger prioritization controls
- better analyst navigation

## Guiding Principles

- Correctness before cosmetics
- URL-first state for every user-visible search flow
- Server-rendered data fetching where it improves speed and reliability
- Strong safety nets around all upstream parsing and query logic
- Features should match what the product claims to support

## Phase 1: Fix Search Correctness

### Task 1.1: Define a canonical search model

- Create a single typed search state object for `query`, `vendor`, `product`, `cwe`, `since`, `page`, and future sort fields.
- Centralize query normalization and API parameter construction in one place.
- Remove endpoint-specific branching that silently drops user input.

### Task 1.2: Make filter behavior explicit

- Decide and document how `query`, `vendor`, `product`, `cwe`, and `since` combine.
- Support partial filter combinations such as `vendor` without `product`.
- Show active filters clearly in the UI so users can verify what the search is doing.

### Task 1.3: Add regression tests for search logic

- Add unit tests for query building and filter combination rules.
- Add tests for CVE ID detection and direct CVE lookup behavior.
- Add tests for pagination behavior across filter combinations.

### Definition of done

- No filter combination is silently ignored.
- Search behavior is deterministic and covered by tests.

## Phase 2: Move to URL-First Navigation

### Task 2.1: Persist state in `searchParams`

- Encode search query, filters, and page number in the URL.
- Hydrate the page from URL state on first load.
- Preserve state across refresh, back/forward navigation, and sharing.

### Task 2.2: Convert the homepage to server-first data loading

- Move the initial search execution into the App Router page using `searchParams`.
- Keep interactive controls as client components, but let the page data be server-rendered.
- Add `loading.tsx` and `error.tsx` states where appropriate.

### Task 2.3: Improve detail-page rendering

- Server-render the CVE detail page.
- Keep EPSS and other enrichment efficient and resilient.
- Improve metadata and page titles for detail pages.

### Definition of done

- Opening a shared link reproduces the exact result state.
- First paint includes real result content, not just a client-side loading shell.

## Phase 3: Add Safety Nets

### Task 3.1: Introduce a real test pyramid

- Add unit tests for utility functions and data extraction.
- Add integration tests for API client and proxy behavior.
- Add end-to-end tests for core flows:
  - Search by CVE ID
  - Search by keyword
  - Apply filters
  - Open a CVE detail page

### Task 3.2: Add schema validation

- Validate upstream CIRCL responses with a schema library such as `zod`.
- Fail gracefully when the upstream response shape changes.
- Separate raw API types from normalized app-facing models.

### Task 3.3: Add CI

- Add a CI workflow to run lint, tests, and build on every push and pull request.
- Fail fast on broken builds and parsing regressions.

### Definition of done

- The project has an automated signal for correctness before deploy.

## Phase 4: Harden for Production

### Task 4.1: Harden the proxy

- Add an allowlist for supported upstream paths.
- Add request timeout handling and better upstream error classification.
- Consider retry behavior only for safe idempotent requests.
- Add structured logging for proxy failures.

### Task 4.2: Improve caching strategy

- Cache by request shape rather than only relying on a blanket `revalidate`.
- Treat list pages, detail pages, and enrichment endpoints differently.
- Make cache behavior observable.

### Task 4.3: Fix deploy reliability

- Replace Google font fetching with a self-hosted or local-font strategy.
- Set `turbopack.root` explicitly.
- Document environment and deployment expectations in the repo.

### Definition of done

- Build is reliable in CI and production.
- Upstream failures are visible and degrade gracefully.

## Phase 5: Complete Core Product Features

### Task 5.1: Implement real vendor and product browsing

- Use `getVendors` and `getVendorProducts` in the UI.
- Add autocomplete or combobox-based selection.
- Support dependent vendor-to-product filtering.

### Task 5.2: Add richer filters and sorting

- Add severity filters.
- Add EPSS filters or sorting.
- Add source, published date, and modified date sorting/filtering.
- Show removable filter chips above the results list.

### Task 5.3: Improve CVE detail pages

- Render CWE name and description.
- Render linked vulnerabilities and comments if available.
- Improve affected product and version presentation.
- Render CAPEC and reference metadata in a more structured way.

### Task 5.4: Improve result list usefulness

- Add better summary cards with affected products, CWE labels, and more visible recency/severity cues.
- Add export and copy-link actions.
- Improve empty states and result count messaging.

### Task 5.5: Add OpenCVE-inspired analyst workflow primitives

- Add saved views for reusable searches.
- Add a local watchlist for bookmarked CVEs.
- Add a watchlist page and header navigation.
- Add stronger result prioritization controls such as severity thresholds and sort modes.

### Definition of done

- The shipped UI matches or exceeds the capabilities promised in the README.

## Phase 6: Add Analyst Workflow Features

### Task 6.1: Saved searches and watchlists

- Let users save searches locally or in a future backend.
- Support watchlists for vendors, products, or CVE IDs.

### Task 6.2: Alerts and digests

- Add alert rules such as:
  - New critical CVEs
  - New CVEs for a selected vendor/product
  - High-EPSS vulnerabilities
- Start with local notifications or digest views before building external delivery.

### Task 6.3: Enrichment and prioritization

- Add CISA KEV data if available.
- Add support for additional advisory sources or normalized enrichments.
- Surface prioritization signals in both search results and detail pages.

### Definition of done

- The app becomes useful for repeated security monitoring, not just one-off lookup.

## Recommended Execution Order

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6

## Best Next Three Tasks

1. Implement canonical search state plus URL-driven search params.
2. Add regression tests for filter/query behavior.
3. Convert the homepage to server-rendered search results.

## Execution Backlog

See `docs/execution-backlog.md` for a prioritized implementation backlog with task IDs, estimates, dependencies, and a recommended first sprint.
