# Alpha Anywhere Community

## Context

Alpha Anywhere homeschool students lack a "digital campus" for peer discovery and connection. This project builds a **work-walled community portal** where socialization is the reward for completing academic goals.

**Why greenfield**: AlphaLearn is slated for deprecation; Playcademy is a monolith for a different use case and Alpha doesn't want its 2D world.

**Related systems** (do not build on, but will integrate with later):
- **LWAI**: Learning data via AWS Athena (daily_learning_metrics, etc.)
- **Timeback**: XP system, eventual gating source
- **Playcademy**: May port backend services; has S3-hosted games accessible via iframe/deep link

---

## What We're Building

A **launcher widget** — like a simplified Steam library or Xbox Game Pass app:
- Embeddable inside host applications (iframe or component)
- Gated by external academic progress state
- Launches external games (Roblox/Minecraft deep links, web URLs, Playcademy iframes)
- Shows social proof (who's playing)

**Not** a dashboard, CRUD app, or game itself.

### Prototype Deliverables

1. **Arcade widget** — game grid with cards, category badges, player counts
2. **Work-wall states** — locked overlay with progress, unlocked interactive state
3. **Launch simulation** — UX up to launch point (mocked, not actual deep links yet)
4. **Demo harness** — standalone page with dev toggles for testing states
5. **Theming foundation** — CSS custom properties, one theme fully built (Cel Shaded Pro)

### Out of Scope (Prototype)

- Real auth, live data, backend services
- Profiles, friends, messaging, voice, map
- Actual game launching (just mock the UX)

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Bun |
| Framework | Svelte 5 |
| Language | TypeScript |
| Styling | CSS custom properties + scoped styles |
| Build | Vite |
| Deploy | Cloudflare Pages |
| Future backend | Postgres, Cloudflare Workers (or SST/Lambda if AWS required) |

---

## Data Models

```typescript
// src/lib/types.ts

type GameType = 'roblox' | 'minecraft' | 'web' | 'iframe'
type EngagementCategory = 'side-by-side' | 'town-square' | 'ice-breaker' | 'trust-builder' | 'rivalry'
type GatingMode = 'daily' | 'weekly'

interface Game {
  id: string
  title: string
  thumbnailUrl: string
  type: GameType
  engagementCategory: EngagementCategory
  currentPlayers: number
  launchUrl: string // deep link or iframe src
  description?: string
}

interface GatingState {
  mode: GatingMode
  isUnlocked: boolean
  xpCurrent: number
  xpRequired: number
  progressPercent: number // computed: (xpCurrent / xpRequired) * 100
}

interface UserContext {
  id: string
  displayName: string
  avatarUrl?: string
}

interface WidgetConfig {
  theme: 'cel-shaded' | 'pixel' | 'roblox-3d'
  user?: UserContext
  gatingState: GatingState
  games: Game[]
}
```

### Engagement Ladder Reference

| Rung | Category | Description |
|------|----------|-------------|
| 1 | Side-by-Side | Solo play near others, no interaction required |
| 2 | Town Square | Unstructured hangout, optional interaction |
| 3 | Ice Breakers | Short rounds, shared fate with strangers |
| 4 | Trust Builders | Cooperative play requiring coordination |
| 5 | Rivalry | Team vs team competition |

---

## Component Architecture

```
<ArcadeWidget>                    # Root, receives WidgetConfig
├── <WorkWall>                    # Overlay when locked
│   ├── <ProgressRing>            # Visual XP progress
│   └── <MotivationMessage>       # "Keep going! 45/120 XP"
├── <GameGrid>                    # Main content area
│   ├── <FilterBar>               # Category filter tabs
│   └── <GameCard>[]              # Individual game tiles
│       ├── <Thumbnail>
│       ├── <CategoryBadge>
│       ├── <PlayerCount>
│       └── <LaunchButton>
└── <DevTools>                    # Testing toggles (dev only)
    ├── Lock/Unlock toggle
    ├── XP slider
    └── Theme switcher
```

### State Flow

```
WidgetConfig (props)
    ↓
ArcadeWidget (context provider)
    ↓
┌───────────────────┐
│ gatingState.isUnlocked │
│   ? <GameGrid />       │
│   : <WorkWall /> + <GameGrid dimmed /> │
└───────────────────┘
    ↓
GameCard click → emit 'launch' event (parent handles actual navigation)
```

---

## Design System

### Three Themes (build Cel Shaded first)

| Token | Cel Shaded Pro | Pixel Art | Roblox 3D |
|-------|---------------|-----------|-----------|
| `--font-display` | Bold geometric sans | Bitmap/pixel font | Rounded sans |
| `--radius` | 0 (sharp) | 0 | 12px |
| `--border-width` | 3px | 1px | 0 |
| `--shadow` | none | none | soft drop |
| `--color-primary` | #2563eb | #3b82f6 | #00b4d8 |
| `--color-surface` | #fafafa | #1a1a2e | #ffffff |
| `--color-accent` | #f59e0b | #facc15 | #ff6b6b |

### Cel Shaded Pro Aesthetic

- High contrast, flat colors
- Bold black outlines (3px strokes)
- Sharp corners, no border-radius
- Comic/halftone dot accents
- Thick typography
- Category badges: solid fill with dark outline

### Implementation

```css
/* src/lib/styles/themes/cel-shaded.css */
[data-theme="cel-shaded"] {
  --font-display: 'Outfit', sans-serif;
  --font-body: 'Inter', sans-serif;
  --radius: 0;
  --border-width: 3px;
  --border-color: #1a1a1a;
  --shadow: none;

  --color-bg: #fafafa;
  --color-surface: #ffffff;
  --color-primary: #2563eb;
  --color-accent: #f59e0b;
  --color-text: #1a1a1a;
  --color-muted: #6b7280;

  /* Engagement category colors */
  --color-side-by-side: #10b981;
  --color-town-square: #8b5cf6;
  --color-ice-breaker: #06b6d4;
  --color-trust-builder: #f59e0b;
  --color-rivalry: #ef4444;
}
```

---

## File Structure

```
alpha-anywhere-community/
├── CLAUDE.md                      # This file
├── docs/                          # Reference docs (existing)
├── src/
│   ├── lib/
│   │   ├── types.ts               # TypeScript interfaces
│   │   ├── mock-data.ts           # Hardcoded games, users
│   │   ├── stores/
│   │   │   └── widget.ts          # Svelte stores for state
│   │   ├── components/
│   │   │   ├── ArcadeWidget.svelte
│   │   │   ├── WorkWall.svelte
│   │   │   ├── ProgressRing.svelte
│   │   │   ├── GameGrid.svelte
│   │   │   ├── GameCard.svelte
│   │   │   ├── FilterBar.svelte
│   │   │   ├── CategoryBadge.svelte
│   │   │   └── DevTools.svelte
│   │   └── styles/
│   │       ├── tokens.css         # Base design tokens
│   │       └── themes/
│   │           ├── cel-shaded.css
│   │           ├── pixel.css      # Future
│   │           └── roblox-3d.css  # Future
│   ├── routes/
│   │   └── +page.svelte           # Demo harness
│   └── app.html
├── static/
│   └── thumbnails/                # Mock game images
├── package.json
├── svelte.config.js
├── vite.config.ts
└── tsconfig.json
```

---

## Implementation Plan

### Phase 1: Scaffold (Day 1)

1. Initialize Bun + Svelte 5 + Vite project
2. Set up TypeScript config
3. Create file structure
4. Define types in `src/lib/types.ts`
5. Create mock data (5-10 games across all engagement categories)
6. Set up base CSS tokens

**Output**: Empty shell that builds and runs

### Phase 2: Core Components (Days 2-3)

1. `ArcadeWidget.svelte` — root container, context provider
2. `GameCard.svelte` — thumbnail, title, badge, player count
3. `GameGrid.svelte` — responsive grid layout
4. `CategoryBadge.svelte` — styled engagement category pills
5. Wire up mock data to render grid

**Output**: Static game grid displaying mocked games

### Phase 3: Work-Wall (Day 4)

1. `WorkWall.svelte` — overlay component
2. `ProgressRing.svelte` — circular XP progress indicator
3. Conditional rendering based on `gatingState.isUnlocked`
4. Dimmed/disabled state for cards when locked

**Output**: Locked and unlocked states working

### Phase 4: Interactions (Day 5)

1. `FilterBar.svelte` — category filter tabs
2. Card hover/focus states
3. Launch button click → emit event (no actual navigation)
4. Filter state management

**Output**: Interactive prototype with filtering

### Phase 5: Theming & Polish (Day 6)

1. Implement full Cel Shaded Pro theme
2. `DevTools.svelte` — testing toggles
3. Responsive tweaks for desktop
4. Transitions and micro-interactions

**Output**: Polished, themed prototype ready for review

### Phase 6: Embed & Document (Day 7)

1. Test in iframe context
2. Document widget API (props, events)
3. Extract theming system for future themes
4. Write integration guide

**Output**: Embeddable widget with documentation

---

## Embed API (Target)

### Props (via URL params or postMessage)

```typescript
interface EmbedParams {
  theme?: 'cel-shaded' | 'pixel' | 'roblox-3d'
  userId?: string
  userName?: string
  userAvatar?: string
  xpCurrent?: number
  xpRequired?: number
  gatingMode?: 'daily' | 'weekly'
}
```

### Events (emitted via postMessage)

```typescript
type WidgetEvent =
  | { type: 'launch'; gameId: string; gameType: GameType }
  | { type: 'filter'; category: EngagementCategory | 'all' }
  | { type: 'ready' }
```

---

## Future Phases (Post-Prototype)

| Phase | Features |
|-------|----------|
| Backend | Auth, live gating from LWAI/Timeback XP |
| Presence | Real-time player counts, online status |
| Profiles | Student cards, avatars, interests |
| Social | Friends, mutual connections |
| Map | Geographic student discovery |
| Voice | Browser-based voice chat (Agora/Daily) |
| Messaging | DMs with AI moderation |
| Parent Controls | Per-child feature toggles |
| Themes | Pixel Art and Roblox 3D variants |

---

## Commands

```bash
# Install dependencies
bun install

# Run dev server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

---

## Design Reference

Figma exports in `docs/figma/`:
- `student-explore.png` — Grid layout reference
- `profile-page.png` — Card/stats styling reference
- `chat-page.png` — UI patterns reference

Note: No Arcade mockup exists yet. Build based on grid layout from student-explore, adapted for game cards.
