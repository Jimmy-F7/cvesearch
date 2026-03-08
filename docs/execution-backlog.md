# Execution Backlog

> **Historical document.** All backlog tasks described below have been completed as of v2.0.0 (2026-03-08). This document is preserved for project history.

## Purpose

This backlog turns the improvement plan into implementation-ready tasks. It is ordered by leverage, not by novelty. The top of the backlog focuses on correctness, trust, and delivery safety.

## Priority Legend

- `P0`: Must do first. These unblock trust and safe iteration.
- `P1`: High-value product completion work.
- `P2`: Differentiating features and long-term workflow value.

## Backlog

| ID | Priority | Task | Estimate | Depends On | Expected Outcome |
|---|---|---|---|---|---|
| BL-001 | P0 | Create a canonical search state model and centralized query builder | 1 day | None | All search inputs map through one typed source of truth |
| BL-002 | P0 | Fix filter semantics so no input is silently ignored | 1 day | BL-001 | Search results become trustworthy |
| BL-003 | P0 | Persist search state in URL `searchParams` | 1.5 days | BL-001 | Searches become shareable and reload-safe |
| BL-004 | P0 | Convert homepage results to server-rendered data loading | 1.5 days | BL-003 | Faster first paint and better App Router usage |
| BL-005 | P0 | Add unit tests for query logic, utilities, and CVE ID handling | 1 day | BL-001 | Search regressions get caught automatically |
| BL-006 | P0 | Server-render the CVE detail page and improve page metadata | 1 day | BL-003 | Detail pages become faster and more indexable |
| BL-007 | P0 | Add CI to run lint, tests, and build | 0.5 day | BL-005 | Every change gets a basic quality gate |
| BL-008 | P0 | Remove build-time Google font dependency and set `turbopack.root` | 0.5 day | None | More reliable CI and production builds |
| BL-009 | P1 | Harden the proxy with path allowlisting, timeouts, and structured errors | 1 day | BL-007 | Better behavior during upstream failures |
| BL-010 | P1 | Add vendor and product autocomplete using existing browse endpoints | 1.5 days | BL-002, BL-003 | The UI matches the intended browse workflow |
| BL-011 | P1 | Add severity, EPSS, source, and date sorting/filtering | 1.5 days | BL-001, BL-003 | Users can prioritize vulnerabilities faster |
| BL-012 | P1 | Improve result cards with active filter chips, better metadata, and export actions | 1 day | BL-011 | Search results become easier to scan and share |
| BL-013 | P1 | Render CWE details, linked vulnerabilities, comments, and CAPEC on the detail page | 2 days | BL-006 | Detail pages become genuinely useful for analysis |
| BL-014 | P1 | Add schema validation for upstream CIRCL responses | 1 day | BL-005 | Safer handling of upstream API changes |
| BL-014A | P1 | Add OpenCVE-inspired saved views for reusable searches | 1 day | BL-003 | Users can store and re-run common search workflows |
| BL-014B | P1 | Add a local watchlist with bookmark actions and a watchlist page | 1.5 days | BL-003 | Users can track high-interest CVEs between sessions |
| BL-014C | P1 | Add stronger prioritization controls such as severity threshold and sort modes | 1 day | BL-011 | Analysts can rank and triage results faster |
| BL-015 | P2 | Add saved searches and watchlists | 2 days | BL-003, BL-007 | The app becomes useful for repeat monitoring |
| BL-016 | P2 | Add alert and digest primitives for critical or high-EPSS findings | 2 days | BL-015 | Users can monitor instead of manually rechecking |
| BL-017 | P2 | Add enrichment sources such as KEV or additional advisory context | 2 days | BL-013, BL-014 | Better prioritization and differentiated value |
| BL-018 | P2 | Add dashboard views for latest critical, highest EPSS, and recent publication windows | 1.5 days | BL-011, BL-017 | The app gains a strong landing workflow |

## Recommended Sprint 1

### Sprint Goal

Ship a trustworthy, shareable MVP search flow with enough safety net to keep iterating.

### Sprint 1 Scope

1. `BL-001` Create canonical search state model and query builder
2. `BL-002` Fix filter semantics
3. `BL-003` Persist search state in URL
4. `BL-004` Server-render homepage results
5. `BL-005` Add unit tests for search logic
6. `BL-007` Add CI
7. `BL-008` Remove build-time font risk and set `turbopack.root`

### Sprint 1 Exit Criteria

- Search and filters behave deterministically
- Refreshing or sharing the URL preserves the current result state
- Homepage search results render on first load from the server
- Query logic is covered by automated tests
- CI runs successfully on every change

## Recommended Sprint 2

### Sprint Goal

Turn the MVP into a credible analyst tool for day-to-day use.

### Sprint 2 Scope

1. `BL-006` Server-render CVE detail page
2. `BL-009` Harden proxy behavior
3. `BL-010` Add vendor/product autocomplete
4. `BL-011` Add richer filters and sorting
5. `BL-012` Improve result cards and export actions
6. `BL-014` Add upstream schema validation
7. `BL-014A` Add saved views
8. `BL-014B` Add local watchlist
9. `BL-014C` Add prioritization controls

## Notes

- Estimates assume one experienced engineer working with the current codebase.
- `P0` should be treated as the minimum foundation before expanding the product surface.
- If time is tight, do not cut tests and URL-state work to make room for more UI. That trade is usually a trap.
- OpenCVE-inspired features should be implemented honestly. Frontend-only versions are fine, but they should not pretend to be multi-user or notification-backed features if that backend does not exist.
