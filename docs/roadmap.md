# Alpha Anywhere Community: Roadmap

**Last updated:** 2026-01-26

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
| **Authentication** | ✅ | Timeback SSO via `@timeback/sdk`, cookie sessions |
| **Session Management** | ✅ | HMAC-signed cookies, 7-day expiry |
| **User Provisioning** | ✅ | Auto-creates D1 user + profile on first authenticated request |

### Frontend UI

| Feature | Location | Status | Data Source |
|---------|----------|--------|-------------|
| **Arcade** | `/arcade` | Complete | Mock data |
| **Work Wall** | Integrated in arcade | Complete | Mock XP (hardcoded 120) |
| **Profiles** | `/profile/[id]` | Complete, editable | D1 ✅ |
| **Explore** | `/explore` | Complete | D1 ✅ |
| **Chat** | `/chat` | Complete | Mock data |
| **UI System** | `$lib/components/ui` | Complete | N/A |

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
| Chat → D1 | Not connected | Still uses `MOCK_CONVERSATIONS`, `MOCK_MESSAGES` |
| Real Timeback ID | ⚠️ Workaround | Using email lookup; `timeback_id` stores Cognito sub, not real OneRoster ID |
| Real Gating Data | Not connected | Hardcoded 120 XP; needs LWAI/Timeback API |
| Game Launch | ✅ Complete | Roblox deep links with web fallback |
| Student Map | Placeholder | UI exists, shows "Coming soon" |
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
| 5173 | `bun run dev` | Vite (hot reload) | ❌ No |
| 6173 | `bun run dev:cf` | Wrangler (Workers) | ✅ Yes |

Use **6173** (Wrangler) when testing D1 features or auth. Use **5173** (Vite) for fast UI iteration without auth.

**Health check:** `http://localhost:6173/api/health` — Shows DB status, user info, profile info.

**Credentials:** Alpha Anywhere Community's dedicated Cognito credentials (callbacks on ports 5173 and 6173).

---

## Build Order

### Tier 1: Wire to Real Data

**Goal:** Replace mock data with D1 data. Make the prototype functional.

#### 1.1 ~~Activate Timeback SSO~~ ✅ DONE

- SSO works via `@timeback/sdk/edge` package
- Cookie-based sessions with HMAC signing
- User provisioned in D1 on first authenticated request
- Using dedicated Alpha Anywhere Community Cognito credentials

⚠️ **Known limitation:** See 1.7 below — we're not yet fetching the real Timeback ID.

---

#### 1.2 ~~Wire Explore to Real Users~~ ✅ DONE

- `src/routes/explore/+page.server.ts` fetches users with profiles from D1
- `explore.svelte.ts` store accepts `initialStudents` parameter
- Explore page transforms DB data to Student shape

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

#### 1.4 ~~Wire Profiles to Real Data~~ ✅ DONE

- `src/routes/profile/[id]/+page.server.ts` fetches user + profile from D1
- Handles `/profile/me` as alias for current user's profile
- Edit mode implemented: bio, location, interests editable via `PATCH /api/profile`

---

#### 1.5 ~~Game Launch~~ ✅ DONE

- `src/lib/utils/game-launcher.ts` handles all game types
- Roblox: tries `roblox://placeId=X` protocol, falls back to roblox.com
- Visibility-based detection for protocol success
- Electron support for Timeback wrapper (`shell.openExternal`)
- Web/Minecraft/iframe types supported

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

#### 1.7 Fetch Real Timeback ID via M2M API

**What:** Populate the real Timeback/OneRoster `sourcedId` for each user.

**Current state (workaround):**
- The `timeback_id` column currently stores the **Cognito `sub`** claim, which is pool-specific (different across Cognito app clients)
- We match users by **email** (stable) during upsert to avoid duplicates when switching credentials
- This works but is not the canonical Timeback identity

**Why it matters:**
- The real Timeback ID (OneRoster `sourcedId`) is the canonical identifier across all Timeback systems
- Needed for: parent-child linking, XP/gating queries, learning data lookups
- Email lookup is a workaround; Timeback ID should be the unique key

**Work:**
- Use M2M API credentials to call OneRoster API on user login
- Query: `GET /ims/oneroster/rostering/v1p2/users?filter=email='user@example.com'`
- Extract `sourcedId` from response
- Store in `timeback_id` column (replacing Cognito sub)
- Add `UNIQUE` constraint on `timeback_id` once populated correctly
- Consider caching to avoid API call on every login

**Dependencies:** M2M API credentials (have them), Timeback API auth URL confirmed

**Reference:** Cognito SSO only returns email + basic metadata. Real Timeback ID requires M2M lookup. See conversation with hbauer (2026-01-14).

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

#### 3.2 ~~Profile Editing~~ ✅ DONE (pulled forward to Tier 1)

- Edit mode toggle on own profile
- Form: bio, location, interests
- `PATCH /api/profile` endpoint
- Avatar/cover editing deferred to Tier 5

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
| ~~Dedicated Timeback credentials~~ | ~~Beyond AI~~ | ✅ Done | ~~Production deploy~~ |
| Timeback M2M API auth URL | Beyond AI | Needs confirmation | 1.7 Timeback ID |
| LWAI IAM user | Amanda | Pending | 1.6 Gating |
| ~~Roblox deep link validation~~ | ~~Dev~~ | ✅ Done | ~~1.5 Launch~~ |
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

1. ~~**Wire Explore to D1**~~ ✅ Done
2. ~~**Wire Profiles to D1**~~ ✅ Done (with editing)
3. ~~**Implement Game Launch**~~ ✅ Done (Roblox deep links with fallback)
4. **Wire Chat to D1** — Messages persist across refresh
5. **Fetch real Timeback ID** — M2M API lookup to get OneRoster `sourcedId` (1.7)
6. **Production deploy** — Apply migrations remotely, deploy to Cloudflare Pages
