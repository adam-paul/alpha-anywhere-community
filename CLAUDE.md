# Alpha Anywhere Community

## Project Context

A work-walled community portal for Alpha Anywhere homeschool students. Students browse games, see who's online, and connect with peers — gated behind completing daily/weekly learning goals. Socialization is the reward.

**Related systems** (integrate with later, don't build on):

- **LWAI**: Learning data (AWS Athena)
- **Timeback**: XP system, gating source
- **Playcademy**: S3-hosted games, possible backend port

---

## Architectural Principles

### DRY (Don't Repeat Yourself)

- Single source of truth for state. If a value is derived, derive it once.
- Before adding code, ask: can this be deleted instead?
- Prop-drill one level is fine; deeper nesting → use context.

### Minimize Code

- The best code is no code. Fewer lines = fewer bugs.
- Delete stale code immediately. No "commented out for later."
- For business logic: avoid abstractions until the third use case.
- For UI components: abstract early (see UI Component System below).

### Explicit Over Implicit

- Props over global state where practical.
- Name things for what they do, not how they're implemented.
- Comments explain _why_, not _what_.

### Component Design

- Components receive config via props, emit events for actions.
- Keep components decoupled — no deep assumptions about parents.
- State flows down, events flow up.

### Minimize Rules

- Prefer one rule that applies everywhere over granular rules with thresholds. If a decision requires counting or judgment calls, simplify the rule until it doesn't.
- Architectural conventions should be deterministic: given the same input, any developer (or agent) should make the same decision.

### Avoid Tech Debt

- Fix warnings immediately, not "later."
- If a pattern feels wrong, stop and fix the architecture.
- Refactor as you go, not in a separate "cleanup phase."
- **After every refactor**: Check for dead code, unused imports, orphaned files. Delete immediately. This is critical.

---

## Tech Stack

| Layer     | Choice                                |
| --------- | ------------------------------------- |
| Runtime   | Bun                                   |
| Framework | Svelte 5 (runes)                      |
| Language  | TypeScript (strict)                   |
| Styling   | CSS custom properties + scoped styles |
| Build     | Vite + SvelteKit                      |
| Deploy    | Cloudflare Pages                      |

**Svelte 5 notes:**

- Use `$state`, `$derived`, `$effect` runes
- Runes in `.svelte.ts` files, not `.ts`
- Props via `$props()`, not `export let`

---

## Key Conventions

### File Naming

- Components: `PascalCase.svelte`
- Utilities/stores: `kebab-case.ts` or `kebab-case.svelte.ts` (if using runes)
- Types: in `types.ts`, exported individually

### Type Organization

Types are **always abstracted** to dedicated type files and have exactly one home. No inline type definitions except `Props`. Keep `types.ts` pure — no runtime code.

| Location                         | What belongs there                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/lib/types.ts`               | Domain types — pure type definitions only                                                  |
| `src/lib/components/ui/types.ts` | UI-internal types (e.g., `IconName`) — not exported via barrel, not imported outside `ui/` |
| `src/lib/constants.ts`           | Runtime metadata for types (labels, colors, descriptions)                                  |
| `src/lib/server/db/types.ts`     | Database-specific types (snake_case, D1 schema)                                            |
| `src/lib/utils/*.ts`             | Helper functions                                                                           |
| Component files                  | **Only** `interface Props` (the component's own API)                                       |
| Utils/stores                     | No type definitions — import from `types.ts`                                               |

**Rules:**

- New type? Put it in `types.ts`. Don't colocate with business logic.
- New constant/metadata for a type? Put it in `constants.ts`.
- New helper function? Put it in the appropriate `utils/*.ts` file.
- Component needs a type? Import it. Only `Props` is defined inline.
- Rare exceptions (tiny helper type truly private to one module) require justification.
- Prefer discriminated unions over optional fields when different variants need different data.
- No duplicates, no re-exports.
- **Same-directory imports**: use relative `./` — expresses cohesion within a unit (`import Icon from './Icon.svelte'`).
- **Cross-directory imports**: use `$lib/` path aliases — expresses location within the project (`import { Icon } from '$lib/components/ui'`, not `'../ui'`).
- **No barrel exports** for app code. Barrels (`index.ts`) are only for library-style APIs with many consumers (e.g., `ui/`). Feature directories use direct file imports.

### State Management

- Component-local: `$state` / `$derived`
- Cross-component: Svelte context (`setContext` / `getContext`)
- No global stores unless absolutely necessary
- **Pass the store, not its pieces.** If a component consumes data from a store, pass the store object — don't destructure it into individual props at the call site. Destructuring loses type narrowing, creates coupled props, and makes the parent responsible for relationships the store already manages. Exception: UI primitives (`components/ui/`) stay domain-agnostic and receive plain props, never stores.

### Avoiding Boolean Flag Creep

When state accumulates multiple boolean flags (`isLoading`, `hasError`, `isDismissed`, `isInitialized`...), stop and refactor. Each conditional check is a "use case" — three scattered `if` statements means it's time to fix.

**Pattern hierarchy:**

1. **Derive instead of track** — If a value can be computed from other state, derive it:

   ```typescript
   // Bad: tracking what can be derived
   let isLoaded = $state(false);

   // Good: derive from actual data
   const isLoaded = $derived(data !== null);
   ```

2. **Discriminated unions** — Replace multiple booleans with a single state that has explicit variants:

   ```typescript
   // Bad: impossible states are representable
   let isLoading = $state(true);
   let hasError = $state(false);
   let data = $state<Data | null>(null);

   // Good: one state, explicit variants
   type LoadState =
     | { status: 'loading' }
     | { status: 'error'; message: string }
     | { status: 'ready'; data: Data };
   let state = $state<LoadState>({ status: 'loading' });
   ```

3. **Encapsulate in a store** — When logic is complex, move it to a dedicated store exposing clean derived values:

   ```typescript
   // Component just consumes clean API
   const gating = createGatingStore(dataPromise);
   // gating.isLoading, gating.showWorkWall, gating.dismiss()
   ```

4. **XState** — For truly complex flows with many states/transitions. Rarely needed; discriminated unions usually suffice.

### Styling

- CSS custom properties for theming (defined in `tokens.css`)
- Scoped styles in components (no global CSS bleed)
- Theme applied via `data-theme` attribute on root

### UI Component System

**Organization** — Components live in four layers:

| Layer               | Location                | Rule                                                                                                                                                                                                                                                                             |
| ------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI primitives       | `components/ui/`        | Fully self-contained and domain-agnostic. Zero imports from outside `ui/`. Could be extracted as a standalone package unchanged. Number of consumers is irrelevant — if it's domain-agnostic, it goes here. Own types live in `ui/types.ts` (internal, not exported via barrel). |
| Feature components  | `components/<feature>/` | Domain-aware, single feature consumer. Every top-level feature gets a directory (arcade, chat, explore, profile, admin). All components live in `$lib/components/`, not colocated with routes.                                                                                   |
| Shared components   | `components/` root      | Domain-aware, 2+ feature consumers. Move here when a second consumer appears. These import from `$lib/types`, `$lib/constants`, etc.                                                                                                                                             |
| Layout (app chrome) | `components/layout/`    | The persistent shell rendered on every page (AppShell, Sidebar, AppHeader). Allowed domain knowledge (nav, auth) because those are app-level concerns.                                                                                                                           |

**Placement rule** — apply in order, first match wins:

1. Could this component exist in a different app unchanged? → `ui/`
2. Does it render on every page as part of the persistent shell? → `layout/`
3. Does it import domain types/constants and have 2+ feature consumers? → `components/` root
4. Otherwise → `components/<feature>/`

**Principles:**

- **Abstract early**: Unlike business logic (wait for patterns), UI elements should be abstracted into reusable components from the start.
- **Single source of styling**: Every button, input, card, badge, etc. should be a component. Changing border-radius on buttons = one change, not N changes.
- **Variants over duplication**: Use props for size/color/state variants (`<Button size="sm" variant="primary">`), not separate components.
- **Composition**: Build complex UI from simple primitives. A card is a container; card content is separate. Feature components compose UI primitives (e.g., `NewChatModal` uses `Modal` for chrome, owns the chat-specific content).
- **No inline styles**: If you're tempted to add a one-off style, make a component or extend an existing one.
- **Design tokens first**: Colors, spacing, typography, radii — all come from `tokens.css`. Components consume tokens, never raw values.

See `/check-ui` skill for the full audit checklist.

### Events

- Components emit events via callback props, parents handle side effects
- Use callback props (`onEvent?: () => void`) not `createEventDispatcher`
- Routes handle top-level actions (navigation, API calls)

---

## Commands

```bash
bun install                # Install dependencies
bun run dev                # Start dev server (http://localhost:5174)
bun run build              # Production build
bun run preview            # Preview production build
bun run db:migrate         # Apply pending D1 migrations (local)
bun run db:migrate:remote  # Apply pending D1 migrations (remote)
```

---

## Known Gotchas

### Cloudflare account_id

**Do NOT add `account_id` to `wrangler.toml`.** Cloudflare Pages projects reject it — the `pages_build_output_dir` key triggers stricter validation that blocks `account_id`. Use the `CLOUDFLARE_ACCOUNT_ID` env var instead. The developer's Cloudflare login has two accounts; the env var disambiguates which one wrangler targets.

---

## Documentation

- `docs/figma/` — Design mockups (PNG exports)
