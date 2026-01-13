# Architecture Decision: App-First, Not Embed-First

**Date:** January 2026
**Status:** Decided

---

## Context

Early in development, we considered building Alpha Community as an "embeddable widget" — a self-contained component that could be dropped into other apps (like Timeback or AlphaLearn) via iframe with a postMessage API.

This led to abstractions like:
- `WidgetConfig` prop bundles
- Event dispatching for all actions
- Context wrappers for injected config

## Decision

**We chose app-first architecture.** Build a standard SvelteKit app. Don't optimize for embedding scenarios we don't have yet.

## Rationale

1. **The embed target is ONE known host** (Timeback Electron). We're not building Intercom for thousands of unknown sites.

2. **A full community app isn't a widget.** Chat, profiles, maps, arcade — this is an app with navigation, not a payment form.

3. **Simpler options exist.** Timeback can load us in a webview, or just open a new window. No SDK required.

4. **We can add embedding later.** Any route can be loaded in an iframe. postMessage handlers can be added when actually needed.

## What This Means

- Components render directly in routes, not through widget wrappers
- State lives in stores, not injected config objects
- Actions call functions directly, not emit events
- Standard SvelteKit routing and patterns

## If We Need Embedding Later

If a real requirement emerges:
1. Load specific routes in iframes (e.g., `/arcade` embedded in Timeback)
2. Add postMessage handlers for that specific integration
3. Extract components into standalone bundles only if truly necessary

The current architecture supports this without upfront investment in abstractions we may never use.
