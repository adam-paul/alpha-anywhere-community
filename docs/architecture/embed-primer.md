# Embeddability & Architecture Primer

This document explores what it means for Alpha Anywhere Community to be "embeddable" and how we should architect the system as it grows from a simple arcade widget into a full-featured community platform.

---

## What Does "Embeddable" Mean?

At its core, an embeddable application is one that can live inside another application without requiring the host to deeply integrate with it. Think of it like a picture frame: the host provides the wall and the nail, but the picture is self-contained.

### Spectrum of Embeddability

Embeddability exists on a spectrum:

```
Least Embeddable                                     Most Embeddable
      │                                                      │
      ▼                                                      ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  Linked  │  │  iframe  │  │  iframe  │  │   Web    │  │   npm    │
│   Page   │  │  (basic) │  │ +postMsg │  │Component │  │ Package  │
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
   "Go to       Load in       Two-way       Custom        Import
  our app"     a frame      communication   element      directly
```

**Level 1: Linked Page**
- User clicks a link, leaves host app entirely
- Zero integration
- Example: "Click here to visit our community"

**Level 2: Basic iframe**
- Host loads your app in an iframe
- One-way: host sets src URL, that's it
- No communication between host and embedded app

**Level 3: iframe + postMessage**
- Host and embedded app communicate via `window.postMessage()`
- Host can send config, auth tokens, theme preferences
- Embedded app can emit events (user clicked X, navigation requested)
- This is where we are currently architected

**Level 4: Web Component**
- Embedded app is a custom HTML element: `<alpha-arcade></alpha-arcade>`
- Host imports a JS bundle, uses it like any HTML element
- Attributes/properties for config, custom events for communication
- Works across frameworks (React, Vue, vanilla JS)

**Level 5: npm Package / Framework Component**
- Published as `@alpha/arcade-widget`
- Host imports and renders directly: `import { ArcadeWidget } from '@alpha/arcade-widget'`
- Tightest integration, but requires same framework (or framework adapters)

---

## Current Architecture (Level 3)

Our prototype is architected at **Level 3**: an iframe-embeddable app with event emission.

### What This Looks Like

**Host Application (e.g., AlphaLearn):**
```html
<iframe
  id="arcade"
  src="https://community.alpha.school?theme=cel-shaded&userId=123"
></iframe>

<script>
  window.addEventListener('message', (event) => {
    if (event.origin !== 'https://community.alpha.school') return;

    if (event.data.type === 'launch') {
      // Handle game launch - host decides what to do
      window.location.href = event.data.launchUrl;
    }
  });
</script>
```

**Our Widget:**
```typescript
// When user clicks "Play"
function handleLaunch(game: Game) {
  // Don't navigate directly - emit event to host
  window.parent.postMessage({
    type: 'launch',
    gameId: game.id,
    launchUrl: game.launchUrl
  }, '*');
}
```

### Why This Pattern?

1. **Host controls navigation**: The host app might need to confirm, log analytics, check permissions, or handle the launch differently than we'd assume.

2. **Decoupled auth**: The host manages authentication. We receive user context, we don't create it.

3. **Theme flexibility**: Host can pass theme preference via URL params.

4. **Graceful degradation**: If postMessage isn't set up, the app still works standalone.

### What We're Missing (To Fully Implement Level 3)

Currently we emit events but don't listen for incoming config. To complete the pattern:

```typescript
// src/lib/embed/listener.ts
export function initEmbedListener(onConfig: (config: Partial<WidgetConfig>) => void) {
  window.addEventListener('message', (event) => {
    // In production, validate event.origin
    if (event.data?.type === 'config') {
      onConfig(event.data);
    }
  });

  // Signal ready to host
  window.parent.postMessage({ type: 'ready' }, '*');
}
```

---

## The Dashboard Question

As we add features (profiles, chat, explore, map), the "widget" metaphor starts to strain. A widget is typically:
- Single-purpose
- Stateless or minimally stateful
- Doesn't have its own navigation

A dashboard/app is:
- Multi-purpose
- Stateful (auth, user data, real-time connections)
- Has internal navigation (routes, tabs, views)

**The question: Do we build one big app, or many small widgets?**

---

## Three Architectural Approaches

### Approach A: Single Application

Everything lives in one SvelteKit app with routes:

```
src/routes/
├── +layout.svelte          # Shell, nav, auth
├── +page.svelte            # Home/dashboard
├── arcade/
│   └── +page.svelte        # Game grid
├── explore/
│   └── +page.svelte        # Student discovery
├── profile/
│   └── [id]/+page.svelte   # Individual profiles
├── chat/
│   └── +page.svelte        # Messaging
└── map/
    └── +page.svelte        # Geographic view
```

**Pros:**
- Simple mental model
- Shared state is easy (layout provides context)
- Standard SvelteKit patterns

**Cons:**
- All or nothing: host must embed the whole app
- Can't use just the arcade in one place and just chat in another
- Larger bundle even if host only needs one feature

**Best for:** When there's one primary host (or standalone deployment) and features are tightly coupled.

---

### Approach B: Micro-Frontends

Each feature is its own independently deployable application:

```
packages/
├── arcade/           # Standalone arcade app
├── chat/             # Standalone chat app
├── explore/          # Standalone explore app
├── profiles/         # Standalone profiles app
└── shell/            # Thin shell that composes them
```

The shell might use Module Federation, iframe composition, or a custom loader:

```html
<!-- Shell composes features -->
<div id="nav">...</div>
<div id="content">
  <iframe src="https://arcade.alpha.school" />
  <!-- or -->
  <alpha-arcade></alpha-arcade>
  <!-- or dynamically loaded module -->
</div>
```

**Pros:**
- Maximum flexibility: use any piece anywhere
- Independent deployment: update chat without touching arcade
- Teams can work independently

**Cons:**
- Complex: build systems, shared dependencies, versioning
- Performance overhead (multiple bundles, potential duplication)
- Shared state is hard (auth, user context, real-time presence)
- Overkill for a small team

**Best for:** Large organizations with multiple teams, or when features genuinely need to live in completely different hosts.

---

### Approach C: Hybrid (Recommended)

Build a single SvelteKit app, but architect features as decoupled "widget" components that *could* be extracted:

```
src/
├── lib/
│   ├── widgets/
│   │   ├── arcade/
│   │   │   ├── ArcadeWidget.svelte    # Self-contained
│   │   │   ├── components/            # Internal components
│   │   │   ├── stores/                # Widget-specific state
│   │   │   └── index.ts               # Public API
│   │   ├── chat/
│   │   │   ├── ChatWidget.svelte
│   │   │   └── ...
│   │   ├── explore/
│   │   │   ├── ExploreWidget.svelte
│   │   │   └── ...
│   │   └── profile/
│   │       ├── ProfileWidget.svelte
│   │       └── ...
│   ├── services/                      # Shared services
│   │   ├── auth.ts
│   │   ├── presence.ts
│   │   └── api.ts
│   └── shared/                        # Shared components
│       ├── Avatar.svelte
│       ├── Badge.svelte
│       └── ...
├── routes/
│   ├── +layout.svelte                 # Provides services via context
│   ├── arcade/+page.svelte            # Thin wrapper: <ArcadeWidget />
│   ├── chat/+page.svelte              # Thin wrapper: <ChatWidget />
│   └── ...
```

**Key principles:**

1. **Widgets are self-contained**: Each widget in `lib/widgets/` has everything it needs. It receives config via props and emits events. It doesn't reach into other widgets or assume routing exists.

2. **Services are injected**: Widgets don't import `auth.ts` directly. They receive auth context via props or Svelte context. This makes them testable and portable.

3. **Routes are thin wrappers**: The route files do little more than:
   ```svelte
   <script>
     import { ArcadeWidget } from '$lib/widgets/arcade';
     import { getAuthContext } from '$lib/services/auth';

     const auth = getAuthContext();
   </script>

   <ArcadeWidget user={auth.user} gatingState={auth.gatingState} />
   ```

4. **Extraction is possible**: If we later need the arcade as a standalone embed, we can build `lib/widgets/arcade` as its own bundle with minimal effort.

**Pros:**
- Simple to build and reason about (it's just a SvelteKit app)
- Shared state and services are easy
- Extraction is possible if needed, but not required upfront
- Single deployment, single bundle (with code splitting)

**Cons:**
- Requires discipline to keep widgets decoupled
- If extraction becomes necessary, there's still work to do
- Not as flexible as true micro-frontends

**Best for:** Small-to-medium teams building a coherent product that might need to embed pieces elsewhere.

---

## Practical Implications for Alpha Community

### Near Term (Prototype → MVP)

Stick with the current structure. The arcade is already reasonably decoupled. As we add features:

1. Create `src/lib/widgets/` directory
2. Move arcade components there
3. Add chat, explore, profile as sibling widgets
4. Keep `src/routes/` as thin wrappers

### Medium Term (MVP → Production)

1. **Implement proper postMessage protocol** for hosts that need it
2. **Add shared services layer** for auth, presence, API
3. **Consider Web Component export** if multiple hosts need standalone widgets

### Long Term (If Needed)

If we genuinely need micro-frontends (multiple teams, wildly different hosts), we can:
1. Extract widgets into separate packages
2. Use Module Federation or similar for composition
3. Build a proper widget registry/loader

But don't do this prematurely. The hybrid approach gives us 80% of the flexibility with 20% of the complexity.

---

## Technical Considerations

### State Management

**Within a widget:** Use Svelte 5 runes (`$state`, `$derived`) and component-level context. Keep it simple.

**Across widgets:** Use a shared services layer injected via SvelteKit's layout. Example:

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { setContext } from 'svelte';
  import { createAuthService } from '$lib/services/auth';
  import { createPresenceService } from '$lib/services/presence';

  const auth = createAuthService();
  const presence = createPresenceService();

  setContext('auth', auth);
  setContext('presence', presence);
</script>

<slot />
```

Widgets access via `getContext()`, or better, receive as props for maximum portability.

### Styling

**Current approach:** CSS custom properties (tokens) + scoped component styles.

**For embeddability:** This works well. The host can override tokens:

```html
<iframe src="..." style="--color-primary: #ff0000;"></iframe>
```

Or we accept theme via URL params and apply internally.

### Bundle Size

With the hybrid approach, SvelteKit's code splitting handles this automatically. Each route only loads what it needs.

If we extract widgets for standalone use, we'd create separate Vite entry points:

```typescript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      input: {
        main: 'src/main.ts',
        'arcade-widget': 'src/lib/widgets/arcade/standalone.ts',
        'chat-widget': 'src/lib/widgets/chat/standalone.ts',
      }
    }
  }
}
```

---

## Summary

| Aspect | Current State | Recommended Path |
|--------|---------------|------------------|
| Embeddability level | 3 (iframe + events) | Stay here, harden as needed |
| Architecture | Single SvelteKit app | Hybrid (app with decoupled widgets) |
| State management | Component-level | Add services layer as we grow |
| Extraction capability | Possible but not built | Keep widgets decoupled for future option |

The key insight: **Don't over-engineer for hypothetical embedding scenarios.** Build a clean, well-structured SvelteKit app. Keep features decoupled. If real embedding requirements emerge, the architecture will support extraction without a rewrite.
