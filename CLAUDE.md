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
- Comments explain *why*, not *what*.

### Component Design
- Components receive config via props, emit events for actions.
- Keep components decoupled — no deep assumptions about parents.
- State flows down, events flow up.

### Avoid Tech Debt
- Fix warnings immediately, not "later."
- If a pattern feels wrong, stop and fix the architecture.
- Refactor as you go, not in a separate "cleanup phase."
- **After every refactor**: Check for dead code, unused imports, orphaned files. Delete immediately. This is critical.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Bun |
| Framework | Svelte 5 (runes) |
| Language | TypeScript (strict) |
| Styling | CSS custom properties + scoped styles |
| Build | Vite + SvelteKit |
| Deploy | Cloudflare Pages |

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

### State Management
- Component-local: `$state` / `$derived`
- Cross-component: Svelte context (`setContext` / `getContext`)
- No global stores unless absolutely necessary

### Styling
- CSS custom properties for theming (defined in `tokens.css`)
- Scoped styles in components (no global CSS bleed)
- Theme applied via `data-theme` attribute on root

### UI Component System
- **Abstract early**: Unlike business logic (wait for patterns), UI elements should be abstracted into reusable components from the start.
- **Single source of styling**: Every button, input, card, badge, etc. should be a component. Changing border-radius on buttons = one change, not N changes.
- **Variants over duplication**: Use props for size/color/state variants (`<Button size="sm" variant="primary">`), not separate components.
- **Composition**: Build complex UI from simple primitives. A card is a container; card content is separate.
- **No inline styles**: If you're tempted to add a one-off style, make a component or extend an existing one.
- **Design tokens first**: Colors, spacing, typography, radii — all come from `tokens.css`. Components consume tokens, never raw values.

### Events
- Components emit events, parents handle side effects
- Use `createEventDispatcher` for custom events
- Routes handle top-level actions (navigation, API calls)

---

## Commands

```bash
bun install      # Install dependencies
bun run dev      # Start dev server (http://localhost:5173)
bun run build    # Production build
bun run preview  # Preview production build
```

---

## Documentation

- `docs/architecture/embed-primer.md` — Architecture decision record (app-first approach)
- `docs/figma/` — Design mockups (PNG exports)
