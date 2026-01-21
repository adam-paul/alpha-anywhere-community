# Alpha Anywhere Community: Roadmap

**Last updated:** 2026-01-16

This document outlines what's been built, what's missing, and the recommended build order to take the Community from prototype to production.

---

## Current State

The frontend is production-quality with complete UI flows. Infrastructure is in place: D1 database, Timeback SSO, cookie sessions. User provisioning works. UI still runs against mock data — next step is wiring features to real D1 data.

### Infrastructure (Complete)

| Component | Status | Details |
|-----------|--------|---------|
| **Framework** | ✅ | SvelteKit 5 with runes, TypeScript strict |
| **Styling** | ✅ | Design tokens in `tokens.css`, cel-shaded theme |
| **Deployment** | ✅ | Cloudflare Pages with Workers runtime |
| **Database** | ✅ | D1 (SQLite at edge), schema applied locally |
| **Authentication** | ✅ | Timeback SSO via `timeback/edge`, cookie sessions |
| **Session Management** | ✅ | HMAC-signed cookies, 7-day expiry |
| **User Provisioning** | ✅ | Auto-creates D1 user on first authenticated request |

### Frontend UI (Complete - Mock Data)

| Feature | Location | Status |
|---------|----------|--------|
| **Arcade** | `/arcade` | 12 games, 5 engagement categories, filtering, work-wall |
| **Work Wall** | Integrated in arcade | XP gating UI, progress ring, lock/unlock states |
| **Profiles** | `/profile/[id]` | Avatar, cover, bio, interests, stats, mutual friends |
| **Explore** | `/explore` | Search, 23 interest filters, grid/map toggle |
| **Chat** | `/chat` | 1:1 and group, threads, composer, new chat modal |
| **UI System** | `$lib/components/ui` | Button, Card, Badge, Avatar, Icon, Select with variants |

### Database Schema (Applied Locally)

```
users ←──── profiles (1:1)
  │
  ├──── friendships (M:M, directional with status)
  │
  └──── conversation_participants (M:M) ────→ conversations
                                                    │
                                                    └──→ messages (with moderation fields)
```

**Key files:**
- `migrations/0001_initial.sql` — Schema definition
- `src/lib/server/db/client.ts` — Type-safe D1 client
- `src/lib/server/db/types.ts` — TypeScript interfaces

### What's NOT Wired Yet

| Feature | Status | Notes |
|---------|--------|-------|
| Explore → D1 | Not connected | Still uses `MOCK_STUDENTS` |
| Chat → D1 | Not connected | Still uses `MOCK_CONVERSATIONS`, `MOCK_MESSAGES` |
| Profiles → D1 | Not connected | Still uses mock data |
| Real Gating Data | Not connected | Hardcoded 120 XP; needs LWAI/Timeback API |
| Game Launch | Incomplete | Logs to console; doesn't open Roblox |
| Student Map | Placeholder | UI exists, shows "Coming soon" |
| Profile Editing | None | Profiles are read-only |
| Friend System | None | Schema exists, no UI flow |
| Real-time Presence | None | No "who's online" functionality |
| AI Chat Moderation | None | No content filtering |
| Parent Controls | None | No ToS, no per-child toggles |
| Notifications | None | Schema not yet added |

---

## Development Environment

**Two dev servers:**

| Port | Command | Runtime | D1 Access |
|------|---------|---------|-----------|
| 5174 | `bun run dev` | Vite (hot reload) | ❌ No |
| 8788 | `bun run dev:cf` | Wrangler (Workers) | ✅ Yes |

Use **8788** when testing D1 features. Use **5174** for fast UI iteration.

**Health check:** `http://localhost:8788/api/health` — Shows DB status, user info, user count.

**Credentials:** Currently using Playcademy's Timeback credentials (callback on port 5174). Will switch to dedicated credentials later.

---

## Build Order

### Tier 1: Wire to Real Data

**Goal:** Replace mock data with D1 data. Make the prototype functional.

#### 1.1 ~~Activate Timeback SSO~~ ✅ DONE

- SSO works via `timeback/edge` package
- Cookie-based sessions with HMAC signing
- User provisioned in D1 on first authenticated request
- Using Playcademy credentials temporarily (port 5174 callback)

---

#### 1.2 Wire Explore to Real Users

**What:** `/explore` shows real users from D1 instead of `MOCK_STUDENTS`.

**Work:**
- Create `src/routes/explore/+page.server.ts` — fetch `db.users.findAll()` with profiles
- Pass to page as `data.students`
- Update `explore.svelte.ts` store to accept server data
- Remove `MOCK_STUDENTS` imports

---

#### 1.3 Wire Chat to Real Messages

**What:** `/chat` reads/writes messages to D1.

**Work:**
- Create `src/routes/chat/+page.server.ts` — fetch user's conversations
- Create `POST /api/messages` — send message
- Create `GET /api/conversations/[id]/messages` — paginated fetch
- Update `chat.svelte.ts` to use API
- Remove `MOCK_CONVERSATIONS`, `MOCK_MESSAGES` imports

---

#### 1.4 Wire Profiles to Real Data

**What:** `/profile/[id]` shows real profile from D1.

**Work:**
- Create `src/routes/profile/[id]/+page.server.ts`
- Handle "profile not found" state
- Own profile shows edit affordance (UI only for now)

---

#### 1.5 Game Launch

**What:** Clicking a game card actually opens Roblox.

**Work:**
- Implement deep link launch in `arcade/+page.svelte`
- Handle different game types (Roblox, Minecraft, web)
- Optional confirmation modal
- Track launch events

**Open question:** Validate Roblox deep link format across platforms.

---

#### 1.6 Connect Gating to Real XP Data

**What:** Replace hardcoded 120 XP with real learning progress.

**Work:**
- Create `GET /api/gating` endpoint
- Fetch from LWAI or Timeback API
- Cache strategy (don't hit API on every page load)
- Handle weekly unlock logic

**Dependencies:** LWAI database access (blocked, waiting on IAM user)

---

### Tier 2: Gating & Permissions

**Goal:** Work-wall with real data, parent controls.

#### 2.1 User Roles

**What:** Distinguish students, parents, admins.

**Work:**
- Migration: `ALTER TABLE users ADD COLUMN role`
- Populate from Timeback SSO claims or default to 'student'
- Role check utilities for protected routes

---

#### 2.2 Parent-Child Linking

**What:** Connect parent accounts to children.

**Schema:**
```sql
CREATE TABLE guardianships (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES users(id),
  child_id TEXT REFERENCES users(id),
  relationship TEXT DEFAULT 'parent',
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(parent_id, child_id)
);
```

**Work:**
- Migration for table
- Sync from Timeback (OneRoster agents) or manual linking
- API to fetch parent's children / child's guardians

---

#### 2.3 Per-Child Feature Settings

**What:** Parents can enable/disable features per child.

**Schema:**
```sql
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  community_enabled BOOLEAN DEFAULT false,
  chat_enabled BOOLEAN DEFAULT true,
  arcade_enabled BOOLEAN DEFAULT true,
  voice_enabled BOOLEAN DEFAULT true,
  location_visible BOOLEAN DEFAULT true,
  terms_accepted_at TEXT,
  terms_accepted_by TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);
```

**Work:**
- Migration for table
- Create default settings on user creation
- ToS acceptance flow
- Check settings before rendering features

---

#### 2.4 Link to AlphaLearn Parent Portal

**What:** Parents manage settings via existing AlphaLearn UI.

**Decision:** Don't rebuild parent portal. Add Community-specific toggles to AlphaLearn's existing dashboard.

---

### Tier 3: Social Features

**Goal:** Real social graph and presence.

#### 3.1 Friend System

**What:** Send/accept friend requests.

**Schema already exists:** `friendships` table with status field.

**Work:**
- API routes: send, accept, decline, unfriend
- "Add Friend" button on profiles
- Notifications on friend request
- Update mutual friends to use real data

---

#### 3.2 Profile Editing

**What:** Students can edit their own profile.

**Work:**
- Edit mode toggle on own profile
- Form: bio, location (city), interests
- `PATCH /api/profile` endpoint
- Defer avatar/cover to Tier 5

---

#### 3.3 Real-time Presence

**What:** Show who's online.

**Architecture options:**
- Cloudflare Durable Objects (recommended)
- Simple polling with short TTL

**Work:**
- Heartbeat mechanism
- Green dot on avatars
- Sidebar online friends list
- Arcade real player counts

---

#### 3.4 Notifications

**What:** In-app notifications for friend requests, messages, etc.

**Schema:**
```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data TEXT,
  read_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

**Work:**
- Migration for table
- API: list, mark read
- Notification bell with unread count
- Create notifications on events

---

#### 3.5 Student Map

**What:** Geographic visualization of student locations.

**Work:**
- Geocode locations to lat/lng
- Map component (Mapbox or Leaflet)
- City-level clustering for privacy
- "Students near me" filter

**Priority:** High — parents frequently ask "who else is in my area?"

---

### Tier 4: Safety & Moderation

**Goal:** Make it safe for kids.

#### 4.1 AI Chat Moderation

**What:** Flag inappropriate messages.

**Work:**
- Integrate OpenAI Moderation API
- Check on send, before persistence
- Store moderation result with message
- Decision: block vs deliver with flag?

---

#### 4.2 Staff Escalation Dashboard

**What:** Review flagged content.

**Work:**
- Protected `/admin/moderation` route
- List flagged messages with context
- Actions: dismiss, warn, suspend
- Audit log

---

#### 4.3 Report Flow

**What:** Students can report messages/users.

**Schema:**
```sql
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT REFERENCES users(id),
  reported_user_id TEXT REFERENCES users(id),
  message_id TEXT REFERENCES messages(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

### Tier 5: Differentiation

**Goal:** Unique high-value features.

#### 5.1 Alpha Voice

**What:** Browser-based voice chat for under-13 students.

**Architecture:**
- RTC SDK (Daily.co or Agora)
- Voice pods per game
- Runs in browser while Roblox runs separately

**Safety:** Panic button, recording indicator, optional AI sentiment analysis.

---

#### 5.2 Avatar Generation

**What:** AI-generated avatars from trait selection.

**Approach:** Clickable UI for traits (not free text) to prevent prompt injection.

**Work:**
- Avatar builder UI
- Image generation API (DALL-E, Stability)
- Storage (Cloudflare R2)

---

#### 5.3 Roblox Presence Integration

**What:** Show which game a student is playing.

**Pragmatic approach:**
- Track on game launch click
- Set "Playing [Game]" with 30-min TTL
- Display avatars on game cards

---

## Dependencies & Blockers

| Dependency | Owner | Status | Blocks |
|------------|-------|--------|--------|
| Dedicated Timeback credentials | Amanda | Pending | Production deploy |
| LWAI IAM user | Amanda | Pending | 1.6 Gating |
| Roblox deep link validation | Dev | Not started | 1.5 Launch |
| RTC provider selection | Team | Open | 5.1 Voice |

---

## Architecture Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Database** | Cloudflare D1 | Edge-native, no cold starts, simple, sufficient for MVP |
| **Sessions** | HMAC-signed cookies | Stateless, no session store needed |
| **Auth** | Timeback SSO | Already integrated, handles Cognito |
| **Parent portal** | Link to AlphaLearn | Don't rebuild, just add toggles |
| **Notifications** | Simple D1 table | Multi-channel overkill for MVP |
| **Permissions** | Role column + settings table | Simple, extensible |

---

## Strategic Context

- **Weekly goals > daily** — High schoolers plan weekly
- **120 XP threshold** — Interim until Timeback revamps goals
- **Don't rebuild AlphaLearn** — It's maintenance mode, link don't extend
- **Map is high priority** — Parents constantly ask about nearby students
- **Timeback Electron as launcher** — Community will run inside Electron wrapper

---

## Open Questions

1. **Voice provider:** Agora vs Daily.co?
2. **Weekly vs daily gating:** AB test, or just go weekly?
3. **Avatar generation:** Which image model? Cost?
4. **Roblox presence:** Feasible with private servers?

---

## Next Steps (Immediate)

1. **Wire Explore to D1** — First feature to prove full loop works
2. **Wire Chat to D1** — Messages persist across refresh
3. **Implement Game Launch** — Deep links actually open Roblox
4. **Production deploy** — Apply migrations remotely, deploy to Cloudflare Pages
