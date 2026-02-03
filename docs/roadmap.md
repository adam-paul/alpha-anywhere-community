# Alpha Anywhere Community: Roadmap

**Last updated:** 2026-02-02

This document outlines what's been built, what's missing, and the recommended build order to take the Community from prototype to production.

---

## Current State

The frontend is production-quality with complete UI flows. Infrastructure is in place: D1 database, Timeback SSO, cookie sessions. User provisioning works. Some features still use mock data. **Current focus:** Roblox Arcade with private servers and work-wall gating with real LWAI learning data.

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

### Tier 1: Core Experience (Current Focus)

**Goal:** Deliver the two key features that make Community valuable — the gated arcade and the work-wall that gates it.

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

#### 1.3 ~~Wire Profiles to Real Data~~ ✅ DONE

- `src/routes/profile/[id]/+page.server.ts` fetches user + profile from D1
- Handles `/profile/me` as alias for current user's profile
- Edit mode implemented: bio, location, interests editable via `PATCH /api/profile`

---

#### 1.4 ~~Game Launch~~ ✅ DONE

- `src/lib/utils/game-launcher.ts` handles all game types
- Roblox: tries `roblox://placeId=X` protocol, falls back to roblox.com
- Visibility-based detection for protocol success
- Electron support for Timeback wrapper (`shell.openExternal`)
- Web/Minecraft/iframe types supported

---

#### 1.5 Connect Work-Wall to Real LWAI Data 🔥 PRIORITY

**What:** Replace hardcoded 120 XP with real learning progress from the LWAI `daily_learning_metrics` table.

**Data source:** LWAI/coachbot database via AWS (IAM credentials now available in `.env`)
- `daily_learning_metrics` table contains per-student, per-day data:
  - `external_student_id` — matches Alpha/GT School student ID
  - `date` — date in CT timezone
  - `active_minutes` — total minutes worked
  - `correct_questions` — total questions answered correctly
  - `levels_mastered` — levels mastered that day

**Work:**
- Determine gating criteria (daily vs weekly, which metrics, thresholds)
- Create server-side LWAI query layer (AWS Athena or direct DB connection)
- Create `GET /api/gating` endpoint returning unlock status + progress
- Map LWAI `external_student_id` to Community user (requires Timeback ID or email bridge)
- Cache strategy (don't hit LWAI on every page load; short TTL or per-session)
- Handle edge cases: new students with no data, weekends, school breaks
- Replace hardcoded XP in work-wall overlay with real progress
- Weekly unlock logic: accumulate across days, unlock when threshold met

**Open questions:**
- What metric(s) define "done"? Active minutes? Levels mastered? A combination?
- Daily unlock vs weekly unlock? (Strategic context says weekly for high schoolers)
- What happens on weekends/breaks — does the wall drop?

---

#### 1.6 Roblox Arcade: Private Servers & Game Management 🔥 PRIORITY

**What:** Move from public Roblox game links to Alpha-managed private servers. Admin tooling for game catalog management.

**Current state:** Arcade UI is complete with game grid, category filters, and Roblox deep-link launching. Games are defined in mock data.

**Work — Private Servers:**
- Research Roblox private server API and access patterns
- Determine server provisioning model: pre-created vs on-demand
- Implement private server URL/code management (store in D1 or config)
- Update game launcher to use private server links instead of public place IDs
- Handle failure cases: server offline, student not logged into Roblox, client not installed
- Identity linking: bridge AAC user ↔ Roblox account (profile field or OAuth)

**Work — Game Catalog:**
- Move game definitions from mock data to D1 (new `games` table)
- Admin API for CRUD on games (add/remove/update games, categories, images)
- Game metadata: title, description, thumbnail, type, platform, server config
- Category/tag management

**Work — Minecraft Extensibility:**
- Evaluate Minecraft server hosting options (Bedrock vs Java, Realms vs self-hosted)
- `minecraft://` protocol handler support in game launcher (already stubbed)
- Server connection flow for Minecraft (IP/port vs Realms invite)
- Determine if work-wall gating applies per-game or globally

**Work — Presence (if feasible):**
- Track game sessions: log when a student launches a game
- Display "X students playing" on game cards
- Show which friends are in which game
- Simple approach: record launch event + 30-min TTL, no real Roblox API polling
- Advanced: Roblox API presence endpoint (requires Roblox OAuth)

---

#### 1.7 Fetch Real Timeback ID via M2M API

**What:** Populate the real Timeback/OneRoster `sourcedId` for each user.

**Current state (workaround):**
- The `timeback_id` column currently stores the **Cognito `sub`** claim, which is pool-specific (different across Cognito app clients)
- We match users by **email** (stable) during upsert to avoid duplicates when switching credentials
- This works but is not the canonical Timeback identity

**Why it matters:**
- The real Timeback ID (OneRoster `sourcedId`) is the canonical identifier across all Timeback systems
- Needed for: parent-child linking, XP/gating queries, LWAI data lookups
- Email lookup is a workaround; Timeback ID should be the unique key
- **Critical for 1.5** — mapping LWAI `external_student_id` to Community users

**Work:**
- Use M2M API credentials to call OneRoster API on user login
- Query: `GET /ims/oneroster/rostering/v1p2/users?filter=email='user@example.com'`
- Extract `sourcedId` from response
- Store in `timeback_id` column (replacing Cognito sub)
- Add `UNIQUE` constraint on `timeback_id` once populated correctly
- Consider caching to avoid API call on every login

**Dependencies:** M2M API credentials (have them), Timeback API auth URL confirmed

---

#### 1.8 Production Deploy

**What:** Get the app running on Cloudflare Pages with real D1.

**Work:**
- Apply migrations to remote D1: `wrangler d1 migrations apply alpha-community --remote`
- Consider creating a separate preview D1 database for non-production branches
- Deploy to Cloudflare Pages
- Verify SSO callbacks work with production domain
- Smoke test: login → profile → arcade → work-wall flow

---

### Tier 2: Social & Communication

**Goal:** Wire up remaining social features. DB schema already supports these — connect when ready.

#### 2.1 Wire Chat to Real Messages

**What:** `/chat` reads/writes messages to D1.

**Note:** Chat UI is complete and DB schema + client methods exist. This is ready to wire whenever it becomes a priority.

**Work:**
- Create `src/routes/chat/+page.server.ts` — fetch user's conversations
- Create `POST /api/messages` — send message
- Create `GET /api/conversations/[id]/messages` — paginated fetch
- Update `chat.svelte.ts` to use API
- Remove `MOCK_CONVERSATIONS`, `MOCK_MESSAGES` imports

---

#### 2.2 Friend System

**What:** Send/accept friend requests.

**Schema already exists:** `friendships` table with status field.

**Work:**
- API routes: send, accept, decline, unfriend
- "Add Friend" button on profiles
- Notifications on friend request
- Update mutual friends to use real data

---

#### 2.3 Student Map

**What:** Geographic visualization of student locations.

**Work:**
- Geocode locations to lat/lng
- Map component (Mapbox or Leaflet)
- City-level clustering for privacy
- "Students near me" filter

**Priority:** High — parents frequently ask "who else is in my area?"

---

#### 2.4 Real-time Presence

**What:** Show who's online across the app (not just in-game).

**Architecture options:**
- Cloudflare Durable Objects (recommended)
- Simple polling with short TTL

**Work:**
- Heartbeat mechanism (ping on page load / interval)
- Green dot on avatars throughout the app
- Sidebar online friends list
- Feeds into arcade player counts (complements game-specific presence in 1.6)

---

#### 2.5 Notifications

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

### Tier 3: Gating & Permissions

**Goal:** Role-based access, parent controls.

#### 3.1 User Roles

**What:** Distinguish students, parents, admins.

**Work:**
- Migration: `ALTER TABLE users ADD COLUMN role`
- Populate from Timeback SSO claims or default to 'student'
- Role check utilities for protected routes

---

#### 3.2 Parent-Child Linking

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

#### 3.3 Per-Child Feature Settings

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

#### 3.4 Link to AlphaLearn Parent Portal

**What:** Parents manage settings via existing AlphaLearn UI.

**Decision:** Don't rebuild parent portal. Add Community-specific toggles to AlphaLearn's existing dashboard.

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
| ~~LWAI IAM credentials~~ | ~~Amanda~~ | ✅ Done | ~~1.5 Work-wall gating~~ |
| ~~Roblox deep link validation~~ | ~~Dev~~ | ✅ Done | ~~1.4 Launch~~ |
| Timeback M2M API auth URL | Beyond AI | Needs confirmation | 1.7 Timeback ID |
| Roblox private server access | Dev | Research needed | 1.6 Private servers |
| LWAI → Community user mapping | Dev | Needs Timeback ID or email bridge | 1.5 Work-wall |
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
- **120 XP threshold** — Interim until Timeback revamps goals; real data from `daily_learning_metrics` now accessible
- **Don't rebuild AlphaLearn** — It's maintenance mode, link don't extend
- **Map is high priority** — Parents constantly ask about nearby students
- **Timeback Electron as launcher** — Community will run inside Electron wrapper
- **Private servers first** — Public Roblox games are a liability; private servers give control over environment
- **Minecraft is a stretch goal** — Architecture should support it, but Roblox is the primary platform
- **Chat is ready but not urgent** — DB schema and client methods exist; wire when socialization features become the focus

---

## Open Questions

1. **Work-wall criteria:** What metrics from `daily_learning_metrics` define "done"? Active minutes, levels mastered, correct questions, or a combination?
2. **Weekly vs daily gating:** AB test, or just go weekly? What happens on weekends/breaks?
3. **LWAI user mapping:** How does `external_student_id` in LWAI map to Community users? Need Timeback ID bridge or email matching.
4. **Roblox private servers:** API access model? Pre-provisioned vs on-demand? Cost per server?
5. **Roblox identity linking:** How to connect AAC accounts to Roblox accounts for private server access?
6. **Minecraft feasibility:** Bedrock vs Java? Realms vs self-hosted? Worth doing in Feb or defer?
7. **Voice provider:** Agora vs Daily.co?
8. **Avatar generation:** Which image model? Cost?

---

## Next Steps (Immediate — February 2026)

1. ~~**Wire Explore to D1**~~ ✅ Done
2. ~~**Wire Profiles to D1**~~ ✅ Done (with editing)
3. ~~**Implement Game Launch**~~ ✅ Done (Roblox deep links with fallback)
4. **Connect work-wall to LWAI data** — Determine criteria, build query layer, replace hardcoded XP (1.5)
5. **Roblox private servers** — Research API, provision servers, update launcher (1.6)
6. **Game catalog to D1** — Move games from mock data to database with admin management (1.6)
7. **Fetch real Timeback ID** — M2M API lookup to get OneRoster `sourcedId` (1.7)
8. **Production deploy** — Apply migrations remotely, deploy to Cloudflare Pages (1.8)
