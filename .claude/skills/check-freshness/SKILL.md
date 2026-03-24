---
name: check-freshness
description: Audit for stale implementations, dead code, redundant patterns, and unnecessary work left behind by incremental development. Use after implementing a feature, after a refactor, or periodically to catch accumulated debt.
---

# Implementation Freshness Review

Scan the codebase for code that was correct when written but became stale, redundant, or inefficient as the system evolved. This catches the debt that accumulates from piecemeal development — where each change is locally correct but leaves behind artifacts that no longer make sense given the current state.

## What to Look For

### 1. Raw Primitives When Abstractions Exist

Search for direct use of platform APIs when the codebase has a wrapper. The wrapper exists for a reason (lifecycle, reconnection, consistency) — bypassing it means the consumer misses those guarantees.

**Signals:**

- `new WebSocket(` outside of `realtime.svelte.ts` — should use `createRealtimeStore`
- `fetch('/api/` in a store or component when a DB client method exists for that operation
- `crypto.subtle.` outside of `crypto.ts` or `session.ts` — should use the shared helpers
- `cookies.set(` or `cookies.get(` outside of `session.ts` — should use `setSessionCookie` / `getSessionFromCookie`
- Direct `db.prepare(` outside of `client.ts` — should use the DB client

**Skip:** Test scripts, seed scripts, and one-off utilities that intentionally bypass app-level abstractions.

### 2. Duplicate Logic Across Project Boundaries

Search for the same algorithm or business logic implemented in multiple projects (`src/`, `infra/realtime/`, `infra/lwai-proxy/`, `packages/shared/`). Each piece of shared logic should have exactly one implementation.

**Signals:**

- HMAC signing/verification in both `session.ts` and `infra/realtime/src/index.ts`
- Cookie parsing in multiple files
- The same validation logic in both an API route and a store
- Identical type guards or runtime checks

**Note:** Some duplication is unavoidable across runtime boundaries (SvelteKit can't share modules with Cloudflare Workers). Flag it, but note if extraction to `packages/shared/` is feasible.

### 3. Unnecessary Data Fetching

Search for code that queries a data source when the answer is available more cheaply. This often happens when a feature was built before a cache or index was introduced.

**Signals:**

- Querying D1 to get a list of IDs, then checking each against KV — when `KV.list()` gives you the data directly
- Loading all records to count them — when a `COUNT(*)` query would suffice
- Fetching the same data in both `+layout.server.ts` and `+page.server.ts` — when layout data is available to pages via `$page.data`
- N+1 query patterns where a JOIN exists in the DB client (note: N+1s flagged here are for cases where an existing JOIN method is available but not used, not for missing JOINs)

### 4. Dead Exports and Unused Context

Search for functions, stores, and context providers that nothing imports or consumes.

**Signals:**

- `export function` where the function name has zero imports across the codebase
- `setContext(KEY, ...)` where no file calls `getContext(KEY)` (or the corresponding getter function)
- `export interface` / `export type` where the type is never imported
- Event callback props (`onFoo?: () => void`) that no parent ever passes

**How to verify:** For each export, grep for its name across the entire project. If only the defining file references it, it's dead.

### 5. Stale Workarounds

Search for code that works around a limitation that may no longer exist.

**Signals:**

- Comments containing: `temporary`, `workaround`, `hack`, `TODO`, `FIXME`, `HACK`, `XXX`
- Code that converts between two representations when the source format changed
- Fallback paths for missing data that is now always present (e.g., `?? 'student'` default for a role field that's now always populated)
- Feature flags or environment checks that guard shipped features

### 6. Inconsistent Patterns for the Same Problem

Search for the same problem solved differently in different parts of the codebase.

**Signals:**

- One component uses a store via context, another receives the same data as props
- One API route validates input with manual checks, another uses a different validation style
- One page manages WebSocket lifecycle directly, another uses a store
- One component dispatches events via callback props, another uses a different mechanism

**The rule:** Same problem, same solution. If both patterns are valid, pick one and convert the other.

### 7. Orphaned Cleanup Code

Search for cleanup logic (event listeners, intervals, subscriptions) that targets resources that no longer exist.

**Signals:**

- `onDestroy` callbacks that reference variables from a removed feature
- `clearInterval` / `clearTimeout` for timers that were deleted
- `.removeEventListener` for events that are no longer attached
- `$effect` cleanup returns that clean up resources managed elsewhere

## How to Search

```bash
# Raw WebSocket usage outside the store
grep -rn "new WebSocket(" src/ --include="*.svelte" --include="*.ts" | grep -v "realtime.svelte.ts"

# Direct cookie manipulation outside session.ts
grep -rn "cookies\.\(set\|get\|delete\)" src/ --include="*.ts" | grep -v "session.ts"

# Dead exports (search for each export, check if imported elsewhere)
grep -rn "^export function\|^export const\|^export interface\|^export type" src/lib/ --include="*.ts" --include="*.svelte.ts"

# Stale workaround comments
grep -rni "temporary\|workaround\|hack\|todo\|fixme\|xxx" src/ --include="*.ts" --include="*.svelte" --include="*.svelte.ts"

# Context providers (check if corresponding getters are used)
grep -rn "setContext(" src/ --include="*.ts" --include="*.svelte.ts"

# Duplicate logic across boundaries
diff <(grep -n "async function sign" src/lib/server/session.ts) <(grep -n "async function sign" infra/realtime/src/index.ts)

# N+1 patterns: Promise.all with map of individual queries
grep -rn "Promise.all" src/routes/ --include="*.ts" -A 2 | grep "findByUserId\|findById"
```

## Output Format

For each finding, report:

```
### `path/to/file.ts:line` — SEVERITY

**Category:** RAW_PRIMITIVE | DUPLICATE_LOGIC | UNNECESSARY_FETCH | DEAD_EXPORT | STALE_WORKAROUND | INCONSISTENT_PATTERN | ORPHANED_CLEANUP

**Issue:** Brief description of what's stale and why

**Context:** What changed to make this stale (e.g., "the realtime store was added in commit X but this consumer wasn't migrated")

**Fix:** Specific action to take
```

Severity levels:

- **LOW** — Dead code or minor inconsistency, no behavioral impact
- **MEDIUM** — Unnecessary work being done, or pattern inconsistency that affects maintainability
- **HIGH** — Security-relevant duplication, significant wasted resources, or a pattern mismatch that has caused or will cause bugs

## Summary

End with:

1. Count of findings by severity and category
2. Which findings can be fixed independently (no dependencies)
3. Which findings should be fixed together (e.g., migrating all consumers of a raw primitive)
4. Estimated scope of each fix (one-liner, single file, multi-file)
