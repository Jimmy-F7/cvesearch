# Test User Journeys

## Test Date

- March 7, 2026

## Environment

- App build: `npm run build`
- App test suite: `npm test`
- Lint: `npm run lint`
- Local smoke target: `npm start -- --hostname 127.0.0.1 --port 3001`

## Automated Verification

- `npm test` passed: 65/65 tests
- `npm run build` passed
- `npm run lint` passed with one existing Next.js font warning in `src/app/layout.tsx`

## Smoke-Tested Journeys

### 1. Core Page Reachability

The following routes were loaded successfully from the local production server and returned `200`:

- `/`
- `/watchlist`
- `/alerts`
- `/projects`
- `/repos`
- `/settings`
- `/workspace`

### 2. Watchlist and Triage Workflow

Executed flow:

1. Load the watchlist API.
2. Add `CVE-2026-9001` to the watchlist.
3. Read the triage record for `CVE-2026-9001`.
4. Update triage to `investigating` with owner, notes, and tags.
5. Remove the CVE from the watchlist.

Verified endpoints:

- `GET /api/watchlist`
- `POST /api/watchlist`
- `GET /api/triage/[id]`
- `PUT /api/triage/[id]`
- `DELETE /api/watchlist`

### 3. Saved Views and Alerts

Executed flow:

1. Create a saved view for critical OpenSSL results.
2. Create an alert rule from a structured search.
3. Mark a single alert as checked.
4. Mark all alerts as checked.
5. Delete the alert.
6. Delete the saved view.

Verified endpoints:

- `POST /api/saved-views`
- `POST /api/alerts`
- `PATCH /api/alerts/[id]`
- `POST /api/alerts/mark-all`
- `DELETE /api/alerts/[id]`
- `DELETE /api/saved-views/[id]`

### 4. Inventory and Project Workflow

Executed flow:

1. Create an inventory asset.
2. Update the inventory notes.
3. Create a project.
4. Update the project owner, due date, labels, and status.
5. Add a CVE to the project.
6. Update the project item with owner, remediation state, SLA due date, and exception metadata.
7. Remove the project item.
8. Delete the project.
9. Delete the inventory asset.

Verified endpoints:

- `POST /api/inventory`
- `PATCH /api/inventory/[id]`
- `DELETE /api/inventory/[id]`
- `POST /api/projects`
- `PATCH /api/projects/[id]`
- `POST /api/projects/[id]/items`
- `PATCH /api/projects/[id]/items`
- `DELETE /api/projects/[id]/items`
- `DELETE /api/projects/[id]`

### 5. Notifications and Digest Delivery

Executed flow:

1. Load notification schedules and delivery history.
2. Create a daily in-app schedule for `#vuln-ops`.
3. Run the schedule manually.
4. Toggle the schedule to disabled.
5. Delete the schedule.

Verified endpoints:

- `GET /api/notifications`
- `POST /api/notifications`
- `POST /api/notifications/run`
- `PATCH /api/notifications/[id]`
- `DELETE /api/notifications/[id]`

Note:

- A bug in `PATCH /api/notifications/[id]` was caught during smoke testing and fixed before the final verification run.

### 6. Conversational Workspace

Executed flow:

1. Create a workspace conversation with the prompt `Give me a workspace overview`.
2. Append a follow-up question: `Show project SLA risk`.
3. Confirm the assistant returned multi-message conversation state with stored references.

Verified endpoints:

- `POST /api/workspace/conversations`
- `POST /api/workspace/conversations/[id]/messages`

### 7. AI Read-Only Flows

Executed flow:

1. Generate a digest from explicit watchlist, alert, and project payloads.
2. Generate a search interpretation from a natural-language prompt.

Verified endpoints:

- `POST /api/ai/digest`
- `POST /api/ai/search`

### 8. Workspace Export

Executed flow:

1. Export the current workspace snapshot after creating workflow data.
2. Confirm the export contained `projects` and `watchlist` arrays.

Verified endpoint:

- `GET /api/workspace/export`

### 9. GitHub / Repos Surface

Executed flow:

1. Load monitored repositories.
2. Attempt a dependency scan for `acme/repo`.

Verified endpoints:

- `GET /api/github/monitored`
- `POST /api/github/scan`

Observed result:

- The monitored repo list endpoint responded successfully.
- The scan endpoint returned an upstream GitHub error (`502`, `GitHub API error: Not Found`) in the local environment.

## Coverage Notes

- Repo scan history persistence is covered by automated tests in `tests/repo-scans-store.test.ts`.
- Notification scheduling and workspace assistant behavior are covered by automated tests in `tests/notifications-store.test.ts` and `tests/workspace-assistant.test.ts`.
- Full live GitHub dependency scanning and fix PR creation were not validated end to end in this environment because the local runtime did not have a known-good GitHub token and repository target.
