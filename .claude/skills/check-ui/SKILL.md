---
name: check-ui
description: Audit UI component architecture for missing abstractions, raw CSS values, duplicated patterns, and organizational violations. Use when reviewing components, after adding new UI, or before/after refactors.
---

# UI Component Architecture Review

Scan all `.svelte` files and `tokens.css` for violations of the UI component system.

## Component Organization Rules

Components are organized into four layers. The layer determines where a component lives.

| Layer                   | Location                | Rule                                                                                                                                                                              |
| ----------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI primitives**       | `components/ui/`        | Fully self-contained. Zero imports from outside `ui/`. Own types live in `ui/types.ts` (internal, not exported via barrel). Could be extracted as a standalone package unchanged. |
| **Feature components**  | `components/<feature>/` | Domain-specific. Every top-level feature (arcade, chat, explore, profile) gets its own directory, regardless of component count.                                                  |
| **Shared components**   | `components/` root      | Used by 2+ features. If a feature component gains a second consumer, move it up to root.                                                                                          |
| **Layout (app chrome)** | `components/layout/`    | The persistent shell rendered on every page (AppShell, Sidebar, AppHeader). Allowed domain knowledge (nav, auth) because those are app-level concerns.                            |

**Litmus tests:**

- Could this component exist in a different app? Yes → `ui/`. No → feature dir or shared root.
- Does it render on every page as part of the persistent shell? Yes → `layout/`.
- Is it used by only one feature? Yes → `components/<feature>/`.
- Is it used by 2+ features? Yes → `components/` root.

### What to Check

1. **Feature components in wrong location** — A component used only by arcade should be in `components/arcade/`, not `components/` root.
2. **UI primitives with external imports** — Any file in `ui/` that imports from outside `ui/` (e.g., `$lib/types`, `$lib/constants`, stores, feature code) is a violation. UI-internal types belong in `ui/types.ts` and must not be exported via the barrel (`ui/index.ts`). If a ui/ component needs a type that lives outside `ui/`, either the type should move into `ui/types.ts` (if it's truly a UI concern) or the component doesn't belong in `ui/`.
3. **Shared components in feature directories** — A component in `components/chat/` that is imported by a non-chat file should move to `components/` root.
4. **Non-persistent components in layout/** — A component in `layout/` that is used by individual pages (not the root layout) should move to `ui/` or a feature directory.

## Missing Abstractions

Look for UI patterns that repeat across components without a shared primitive. These are the high-value signals:

### 1. Repeated button-like elements without using Button or IconButton

Search for `<button>` elements that are styled from scratch instead of using a `ui/` component. Especially look for:

- Icon-only buttons (just an Icon child, no text) — should use `IconButton`
- Buttons with custom `.btn-*` or `.*-btn` classes that duplicate Button's job

### 2. Repeated empty state markup

Search for `.empty-state`, `.empty-message`, `.no-results`, or similar classes. These should use the `Placeholder` component. Compare padding, font-size, and layout — inconsistencies indicate a missing shared component.

### 3. Input/textarea elements styled outside of Input/Textarea components

Search for `<input` and `<textarea` elements in files outside `components/ui/`. If they define their own border, background, font-size, focus styles, they should use a shared `Input` or `Textarea` component.

### 4. Modal/dialog patterns

Search for `modal-backdrop`, `position: fixed`, `inset: 0`, or similar overlay patterns. These should use a shared `Modal` component for the shell (backdrop + chrome). Feature-specific content goes in a feature component that composes `Modal`.

### 5. Toggle/switch patterns

Search for `role="switch"` or toggle-like button+thumb markup. Should use a shared `Toggle` component.

### 6. Avatar stack patterns

Search for overlapping avatar positioning (negative margins, absolute positioning on avatar containers). Should use a shared `AvatarStack` component.

## Raw CSS Values

Scan `<style>` blocks in all `.svelte` files. Flag hardcoded values that have a token equivalent in `tokens.css`.

### Must use tokens (flag these)

- **Colors**: Any `#hex`, `rgb()`, `hsl()` value that isn't inside a `var()` fallback
- **Spacing used as padding/margin/gap**: Raw `px`/`rem` values where a `--space-*` token exists (`4px` → `--space-1`, `8px` → `--space-2`, `12px` → `--space-3`, `16px` → `--space-4`, etc.)
- **Font sizes**: Raw `px`/`rem` where a `--font-size-*` token exists
- **Border radius**: Raw values where `--radius` or `--radius-chat` should be used
- **Transitions**: Raw durations where `--transition-fast`, `--transition-base`, `--transition-slow` exist

### Acceptable raw values (skip these)

- **`var()` fallbacks**: `var(--color-progress-fill, #10b981)` is correct CSS
- **Layout constraints**: `grid-template-columns: minmax(280px, 1fr)`, `max-width: 400px` on modals, panel widths — these are structural, not design tokens
- **Tiny offsets**: `translateY(-1px)`, `translateX(20px)` for micro-interactions
- **Border widths**: `2px`, `3px` when used with `solid var(--color-border)` — these are part of the cel-shaded theme's intentional boldness
- **Box shadows**: Cel-shaded offset shadows (`4px 4px 0`, `2px 2px 0`) are theme-specific effects
- **Component-internal sizing**: Fixed dimensions inside a UI primitive (e.g., toggle thumb size inside `Toggle.svelte`) are fine — they're encapsulated
- **DevTools.svelte**: Dev-only component, lower priority

### Should be tokens eventually (note but don't flag as violations)

- **Repeated magic numbers**: If the same `px` value appears in 3+ components (e.g., `36px` for icon button size), note it as a candidate for a new token
- **Panel/sidebar widths**: `200px`, `280px`, `300px` — candidates for `--panel-width-*` tokens

## Duplicated Styling Patterns

Look for near-identical CSS blocks across components. Focus on:

- Same flex centering + color + transition pattern (icon buttons)
- Same border + background + focus pattern (inputs)
- Same padding + text-align + muted color pattern (empty states)
- Same absolute positioning pattern (avatar stacks)

For each duplicate, note which shared component should own it.

## Output Format

For each finding, report:

### `path/to/file.svelte` — SEVERITY

**Type:** MISPLACED | MISSING_ABSTRACTION | RAW_VALUE | DUPLICATION

**Issue:** brief description

**Fix:** what to do (create component, move file, use token, use existing component)

Severity levels:

- **LOW** — Single instance, no duplication yet, but worth noting
- **MODERATE** — Pattern appears 2-3 times, should consolidate
- **HIGH** — Pattern appears 4+ times or creates meaningful inconsistency

End with:

1. Summary counts by severity
2. Proposed new components (if any) with suggested Props interface
3. Proposed new tokens (if any)
4. File moves needed
