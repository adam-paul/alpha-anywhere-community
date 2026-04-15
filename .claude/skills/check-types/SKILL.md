---
name: check-types
description: Audit type organization to ensure types have exactly one home. Use when reviewing code structure or after adding new types.
---

# Type Organization Review

Scan the codebase for type definitions that violate the "exactly one home" principle.

## The Rules

Types are **always abstracted** to dedicated type files. No inline type definitions except `Props`. Keep `types.ts` pure — no runtime code (constants, functions).

| Location                         | What belongs there                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| `packages/shared/src/types.ts`   | Cross-project contracts (WebSocket protocol, LWAI gating). Imported as `@alpha/shared`.    |
| `src/lib/types.ts`               | Domain types — pure type definitions only.                                                 |
| `src/lib/components/ui/types.ts` | UI-internal types (e.g., `IconName`) — not exported via barrel, not imported outside `ui/` |
| `src/lib/constants.ts`           | Runtime metadata for types (labels, colors, descriptions)                                  |
| `src/lib/server/db/types.ts`     | Database-specific types (snake_case, D1 schema)                                            |
| `src/lib/utils/*.ts`             | Helper functions                                                                           |
| Component files                  | **Only** `interface Props` (plus component-local variant types like `Size`, `Variant`)     |
| Utils/stores/routes              | No type definitions — import from `types.ts`                                               |

**Always use path aliases** for imports:

- Use `$lib/types`, not `../types`
- Use `$lib/constants`, not `../constants`
- Use `$lib/server/db/types`, not `../../server/db/types`
- Path aliases don't break when files move and are more explicit

## What to Look For

### 1. Inline Types in Stores (`.svelte.ts` files)

Search for `interface` or `type` declarations in store files:

- `export interface SomeState { ... }`
- `export type SomeMode = 'a' | 'b'`
- Discriminated unions like `type LoadState = { status: 'loading' } | ...`

**These should be in `types.ts`**, even if only used in one file.

### 2. Inline Types in Utils (`src/lib/utils/*.ts`)

Same as stores — interfaces and types should be moved to `types.ts`.

### 3. Types in Route Files (`+page.server.ts`, `+server.ts`, etc.)

API response types, request body types, or any `interface`/`type` declarations.

### 4. Barrel Re-exports (`index.ts` files)

Files that do `export * from './types'` or `export type { Foo } from './other'`.
These violate "one home" because the type now has two import paths.

### 5. Component Files with Non-Props Types

Components should only define `interface Props`. Any other types should be in `types.ts`.

### 6. Relative Imports for Types

Files using `../types` or `../../types` instead of `$lib/types`.
Path aliases are required for type imports — they're more explicit and don't break when files move.

### 7. Cross-Project Type Duplication

Search for identical `interface` or `type` declarations across project boundaries (`src/`, `infra/realtime/`, `infra/lwai-proxy/`, `packages/shared/`). Types used by multiple projects must live in `packages/shared/src/types.ts` and be imported as `@alpha/shared/types` directly — no re-exports through `$lib/types`.

### 8. Runtime Code in types.ts

`types.ts` should contain **only** type definitions. Check for:

- `export const` — constants belong in `constants.ts`
- `export function` — functions belong in `utils/*.ts`

### 9. Cross-Layer Union Duplication (Drift Risk)

Types that describe the same enum at two layers — most commonly a domain type in `$lib/types.ts` and a parallel inline union in `src/lib/server/db/types.ts`.

Examples of smell:

```ts
// src/lib/types.ts
export type UserRole = 'student' | 'admin';

// src/lib/server/db/types.ts
interface DbUser {
  role: 'student' | 'admin'; // ← redeclared, drift waiting to happen
}
```

The compiler can't detect drift between two independent-but-equal unions. When one gets a new value and the other doesn't, writes succeed but types lie. **The DB type must import and reference the domain type**, not redeclare the literals.

Safe direction: server/DB imports from domain. Never the reverse (pulls server code into client bundle).

### 10. Wide Discriminator Kills Narrowing

In discriminated unions, every variant's discriminator field (usually `type`) must be a specific literal — never `string` or another wide type.

```ts
// BAD — ClientMessage acts as a catch-all
interface ClientMessage { type: string; ... }
type ChannelMessage = SystemMessage | PresenceSnapshotMessage | ClientMessage;

// Inside `if (msg.type === 'system:join')`, ClientMessage can't be excluded
// because 'system:join' IS a string. Narrowing fails for the entire union.
```

One open-ended variant destroys narrowing for every other variant, because any literal string is assignable to `string`. Fix: enumerate the specific variants with literal `type` fields; use a base interface only for `extends`, not as a union member.

### 11. Closure Narrowing Loss

A value narrowed in outer scope re-widens inside a callback (`.map`, `.filter`, `.forEach`, event handlers, `setTimeout`):

```ts
if (!locals.user) error(401, 'Not authenticated');
// locals.user is narrowed to non-null here
participantIds.map((pid) =>
  db.notifications.create({
    actor_id: locals.user.id // ← error: possibly null
  })
);
```

TS can't prove `locals.user` wasn't reassigned between narrowing and callback invocation. Fix by capturing into a `const` above the closure (`const userId = locals.user.id;`) or using `!` if that's the project's idiom.

### 12. Migration CHECK ↔ TS Union Consistency

Every SQLite `CHECK (col IN (...))` constraint in a migration must be mirrored in exactly one TS union. Audit recipe:

```bash
# List every enum-like CHECK constraint across migrations
grep -n "CHECK (.* IN (" migrations/*.sql

# For each, confirm the values appear in the domain type (src/lib/types.ts)
# and that the DB type (src/lib/server/db/types.ts) references it, not a redeclared union.
```

When a migration adds an enum value (e.g., `0007_voice_notification_type.sql` adding `'voice_call_started'`), the domain type must gain that value too. Code that writes the new value will succeed at the DB layer (CHECK passes) but types will silently lie about the row shape if the TS union wasn't updated.

## Valid Exceptions (Skip These)

1. **`interface Props`** in component files — this is the component's own API
2. **`ReturnType<typeof fn>`** derived types — these are tied to their function's implementation
3. **Generic type parameters** — e.g., `function foo<T>(x: T): T`

## How to Search

```bash
# Find interface/type declarations in stores
grep -rn "^export \(interface\|type\)" src/lib/stores/

# Find interface/type declarations in utils
grep -rn "^export \(interface\|type\)" src/lib/utils/

# Find interface/type declarations in routes
grep -rn "^interface\|^type" src/routes/

# Find barrel re-exports
grep -rn "export \* from\|export type \*" src/

# Find non-Props interfaces in components
grep -rn "^interface" src/lib/components/ | grep -v "Props"

# Find relative type imports (should use $lib/types)
grep -rn "from ['\"]\.\..*types['\"]" src/

# Find runtime code in types.ts (should be in constants.ts or utils/)
grep -n "^export const\|^export function" src/lib/types.ts

# Find inline string-literal unions in DB types (candidates for consolidation with domain types)
grep -n ": '.*' | '" src/lib/server/db/types.ts

# Find wide discriminators in shared/domain types (narrowing killers)
grep -rn "type:\s*string" packages/shared/ src/lib/types.ts

# List every enum-like CHECK constraint across migrations (cross-ref against TS unions)
grep -n "CHECK (.* IN (" migrations/*.sql
```

## Output Format

For each finding, report:

```
### `path/to/file.ts` — VIOLATION

**Type:** `InterfaceName` or `TypeName`

**Issue:** Brief description (e.g., "Discriminated union defined in store file")

**Action:** Move to `types.ts` and update import
```

Violation types:

- **VIOLATION** — Type defined outside `types.ts`, must be moved
- **BARREL** — Re-export creating multiple import paths, delete barrel
- **RELATIVE** — Using `../types` instead of `$lib/types`, update import path
- **RUNTIME** — Constant or function in `types.ts`, move to `constants.ts` or `utils/`
- **DRIFT** — Parallel union declared in two files; consolidate one to import the other (safe direction: server ← domain)
- **NARROW** — Wide discriminator (`type: string`) in a discriminated union; replace with specific literal variants
- **CLOSURE** — Narrowed value reused inside a callback without re-guard; capture to `const` above the closure or use `!`
- **CHECK** — Migration `CHECK` constraint not mirrored in the corresponding TS union
- **VALID** — Exception case (Props, ReturnType), no action needed

## Summary

End with:

1. Count of violations by category
2. List of files that need updating
3. Any barrel files to delete

## After Fixing

Run `bun run build` to verify all imports resolve correctly after moving types.
