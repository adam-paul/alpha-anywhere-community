# Alpha Anywhere Community: Prototype PRD

## What We're Building

A social/arcade portal for homeschool students. Students browse a grid of curated games (primarily Roblox private servers), see who else is online, and launch games together—all gated behind completing their daily learning goals.

### Why This Exists

Alpha Anywhere students are geographically isolated. They lack a "digital campus" where they can see classmates, signal interests, and form friendships. The Community is that campus—but it's **work-walled**: you must finish your schoolwork to unlock access.

### Key Insight

Socialization is the reward, not a distraction. By gating the Community behind academic goals, we turn play into motivation.

---

## Prototype Scope

Build the **Arcade** with mocked data. Validate the UX before committing to backend architecture.

### In Scope (Prototype)

- Game grid with cards
- Work-wall locked/unlocked states
- Deep link launcher for external games
- Mocked player counts, gating state, and game catalog
- Embeddable (should work in an iframe)

### Out of Scope (Prototype)

- Real authentication
- Live data from learning systems
- Profiles, friends, messaging, voice chat
- Backend services

---

## Core UX

### Arcade Grid

A grid of game cards. Each card shows:
- Thumbnail image
- Game title
- Engagement category badge (see below)
- Live player count: "12 students playing"

Clicking a card launches the game via deep link (opens external app).

### Work-Wall

When the student hasn't completed their daily goal:
- Arcade is visible but locked
- Progress indicator: "45 min / 2 hr completed"
- Cards are dimmed/unclickable
- Motivational state: can see friends are online, can't join yet

When goal is complete:
- Full access unlocked
- Cards are interactive

### Game Types

Games launch via **deep link**, not iframe. The portal opens the external app directly.

| Type | Launch URL Pattern |
|------|-------------------|
| Roblox | `roblox://placeId=XXX&gameInstanceId=YYY` |
| Minecraft | `minecraft://?addExternalServer=...` |
| Web | Standard URL, opens in new tab |

### Engagement Ladder

Games are categorized by social intensity. This helps students find games matching their comfort level.

| Rung | Category | Description | Example |
|------|----------|-------------|---------|
| 1 | Side-by-Side | Solo play near others, no interaction required | Bee Swarm Simulator |
| 2 | Town Square | Unstructured hangout, optional interaction | Brookhaven |
| 3 | Ice Breakers | Short rounds with strangers, shared fate | Natural Disaster Survival |
| 4 | Trust Builders | Cooperative play requiring coordination | Work at a Pizza Place |
| 5 | Rivalry | Team vs team competition | BedWars |

Display as a badge/tag on each game card.

---

## Data Structures (For Mocking)

### Game

```typescript
interface Game {
  id: string
  title: string
  thumbnailUrl: string
  type: 'roblox' | 'minecraft' | 'web'
  engagementCategory: 'side-by-side' | 'town-square' | 'ice-breaker' | 'trust-builder' | 'rivalry'
  currentPlayers: number
  // Deep link data (varies by type)
  launchUrl: string
}
```

### Gating State

```typescript
interface GatingState {
  isUnlocked: boolean
  minutesCompleted: number
  minutesRequired: number  // e.g., 120 for 2 hours
  progressPercent: number  // 0-100
}
```

### User Context

```typescript
interface User {
  id: string
  displayName: string
  avatarUrl?: string
}
```

---

## Architecture (Conceptual)

```
┌────────────────────────────────────────┐
│          HOST APPLICATION              │
│   (could be any web app, Electron)     │
│                                        │
│   ┌────────────────────────────────┐  │
│   │    Alpha Community Widget      │  │
│   │                                │  │
│   │   ┌─────────────────────────┐ │  │
│   │   │        Arcade           │ │  │
│   │   │   (Game Grid + Launch)  │ │  │
│   │   └─────────────────────────┘ │  │
│   │                                │  │
│   │   Future: Profiles, Map,      │  │
│   │   Friends, Chat, Voice        │  │
│   └────────────────────────────────┘  │
└────────────────────────────────────────┘
              │
              ▼
┌────────────────────────────────────────┐
│           BACKEND (Future)             │
│                                        │
│  • Auth (token from host app)          │
│  • Learning data (gating decisions)    │
│  • Presence (who's online)             │
│  • Game catalog                        │
│  • Community data (profiles, friends)  │
└────────────────────────────────────────┘
```

The widget should be designed to be **embeddable**—it will eventually live inside other applications via iframe or as a component.

---

## Prototype Deliverables

1. **Game Grid View**
   - Responsive grid of game cards
   - Category badges
   - Player count display (mocked)

2. **Work-Wall States**
   - Locked view with progress bar
   - Unlocked view (interactive)
   - Toggle for testing both states

3. **Game Launcher**
   - Click card → generate deep link → open external app
   - Handle different game types

4. **Mock Data Layer**
   - Hardcoded game catalog (5-10 games across categories)
   - Toggleable gating state
   - Static player counts

5. **Embed Container**
   - Works when loaded in an iframe
   - Accepts basic config (theme, user context) via URL params or postMessage

---

## Future Phases (For Context Only)

After prototype validation, subsequent phases will add:

| Phase | Features |
|-------|----------|
| Backend & Auth | Real auth, live gating from learning data |
| Presence | Real-time player counts, who's online |
| Profiles | Student profiles, avatars, interests |
| Friends | Friend requests, mutual friends |
| Map | Geographic student discovery |
| Voice | Browser-based voice chat for games |
| Messaging | Direct messages with AI moderation |
| Parent Controls | Per-child feature toggles |

---

## Open Questions (To Resolve During Prototype)

1. **Visual style**: What aesthetic? (Figma designs will clarify)
2. **Roblox deep links**: Need to validate the URL scheme works reliably across platforms
3. **Embed requirements**: What config does the host need to pass in?
4. **Mobile**: Is this desktop-only for MVP, or responsive?

---

## Reference Context

This project is related to but **separate from**:
- **Playcademy**: An existing arcade/game platform with similar features. Some backend infrastructure may be ported later.
- **AlphaLearn**: An existing learning portal for Alpha Anywhere. Community may eventually embed there.
- **LWAI**: The learning data system that tracks student progress. Will be the source for gating decisions.

## Preferred Architecture

Bun, Svelte, Cloudflare, Postgres
