# Alpha Anywhere Community: Roadmap

**Last updated:** 2026-02-10

This document outlines what's been built, what's missing, and the recommended build order to take the Community from prototype to production.

---

## Current State

The frontend is production-quality with complete UI flows. Infrastructure is in place: D1 database (local + remote), Timeback SSO, cookie sessions. User provisioning works. Roblox private server deep links working. **Current focus:** Work-wall gating with real LWAI learning data.

### Infrastructure (Complete)

| Component | Status | Details |
|-----------|--------|---------|
| **Framework** | ✅ | SvelteKit 5 with runes, TypeScript strict |
| **Styling** | ✅ | Design tokens in `tokens.css`, cel-shaded theme |
| **Deployment** | ✅ | Cloudflare Pages with Workers runtime |
| **Database** | ✅ | D1 (SQLite at edge), schema applied locally + remote |
| **Authentication** | ✅ | Timeback SSO via `@timeback/sdk`, cookie sessions |
| **Session Management** | ✅ | HMAC-signed cookies, 7-day expiry |
| **User Provisioning** | ✅ | Auto-creates D1 user + profile on first authenticated request |

### Frontend UI

| Feature | Location | Status | Data Source |
|---------|----------|--------|-------------|
| **Arcade** | `/arcade` | Complete | D1 ✅ |
| **Work Wall** | Integrated in arcade | UI complete | Mock XP (LWAI access ready, needs endpoint) |
| **Profiles** | `/profile/[id]` | Complete, editable | D1 ✅ |
| **Explore** | `/explore` | Complete | D1 ✅ |
| **Chat** | `/chat` | Complete | Mock data |
| **UI System** | `$lib/components/ui` | Complete | N/A |

### Database Schema (Applied Locally + Remote)

```
users ←──── profiles (1:1)
  │
  ├──── friendships (M:M, directional with status)
  │
  └──── conversation_participants (M:M) ────→ conversations
                                                    │
                                                    └──→ messages (with moderation fields)

games (standalone, Roblox private server support)
```

**Key files:**
- `migrations/0001_initial.sql` — Core schema (users, profiles, friendships, chat)
- `migrations/0002_games.sql` — Games catalog with private server fields
- `src/lib/server/db/client.ts` — Type-safe D1 client
- `src/lib/server/db/types.ts` — TypeScript interfaces

### What's NOT Wired Yet

| Feature | Status | Notes |
|---------|--------|-------|
| Chat → D1 | Not connected | Still uses `MOCK_CONVERSATIONS`, `MOCK_MESSAGES` |
| Real Gating Data | Not connected | Hardcoded 120 XP; LWAI access working, need query architecture |
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
- Real Timeback ID fetched via M2M OneRoster lookup (see 1.7)

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

#### 1.5 Connect Work-Wall to Real LWAI Data ⏳ IN PROGRESS

**What:** Replace hardcoded XP with real learning progress from LWAI.

**Data source:** `daily_learning_metrics` table via AWS Athena
- Cross-account role: Lambda assumes Coachbot role in AlphaLearn account
- Key fields: `email`, `date`, `active_minutes`

**Progress (2026-02-10):**
- ✅ Athena access working (CLI tested, queries return data)
- ✅ Schema confirmed — see `docs/LWAI_Data-Feed-Integration-Guide.md`
- ✅ User mapping resolved: query by **email**
- ✅ Gating criteria decided: **`active_minutes`** (weekly sum, 300 min threshold)
- ✅ Architecture decided: **Lambda proxy** (CF Workers can't do STS AssumeRole)
- ✅ SST project created: `infra/lwai-proxy/`
- ✅ Lambda handler: assumes Coachbot role, queries Athena, returns eligibility
- ✅ AAC integration: `/arcade` fetches gating data, work-wall uses real state

**Gating logic:**
```sql
SELECT COALESCE(SUM(active_minutes), 0) as total_minutes
FROM daily_learning_metrics
WHERE email = '{email}'
  AND date >= date_format(date_trunc('week', current_date), '%Y-%m-%d')
```

**Remaining:**
- Deploy Lambda: `cd infra/lwai-proxy && bunx sst deploy --stage production`
- Set Cloudflare secrets: `LWAI_PROXY_URL`, `LWAI_API_KEY`
- Test end-to-end with real student account
- Handle edge cases: new students, weekends, breaks

---

#### 1.6 ~~Roblox Arcade: Private Servers & Game Management~~ ✅ MOSTLY DONE

**What:** Move from public Roblox game links to Alpha-managed private servers. Admin tooling for game catalog management.

**Done:**
- ✅ Private server deep links working: `roblox://placeId={id}&accessCode={uuid}&linkCode={code}`
- ✅ Games table in D1 with `place_id`, `private_server_access_code`, `link_code` fields
- ✅ Game launcher uses discriminated union types for type-safe launch options
- ✅ Arcade loads games from D1, not mock data
- ✅ Bee Swarm Simulator seeded as first game (local + remote)

**Remaining:**
- Admin API for CRUD on games (currently manual SQL inserts)
- More games need private servers provisioned (see `docs/games-to-add.md`)

**Future — Minecraft Extensibility:**
- Evaluate Minecraft server hosting options (Bedrock vs Java, Realms vs self-hosted)
- `minecraft://` protocol handler support in game launcher (already stubbed)
- Server connection flow for Minecraft (IP/port vs Realms invite)
- Determine if work-wall gating applies per-game or globally

**Future — Presence:**
- Track game sessions: log when a student launches a game
- Display "X students playing" on game cards (UI already supports `playerCount` prop)
- Show which friends are in which game
- Simple approach: record launch event + 30-min TTL, no real Roblox API polling
- Advanced: Roblox API presence endpoint (requires Roblox OAuth)

---

#### 1.7 ~~Fetch Real Timeback ID via M2M API~~ ✅ DONE

**What:** Fetch OneRoster `sourcedId` (Timeback ID) for each user during SSO.

**Implementation:** `src/lib/server/timeback.ts`
- `getM2MToken()` — client credentials flow to get access token
- `resolveTimebackId(email)` — queries OneRoster API for `sourcedId`
- Called in SSO callback; falls back to Cognito `sub` if lookup fails

**Credentials:** Staging in `.env`, production credentials for Cloudflare prod env.

**Note:** Timeback ID is useful for future Timeback APIs (XP, parent-child linking). For LWAI, use email — see 1.5.

---

#### 1.8 Production Deploy ⏳ IN PROGRESS

**What:** Get the app running on Cloudflare Pages with real D1.

**Done:**
- ✅ Migrations applied to remote D1
- ✅ Bee Swarm seeded in remote D1
- ✅ Cloudflare Pages deploys from dev branch

**Remaining:**
- Consider creating a separate D1 database for prod vs preview
- Set secrets for production branch (currently only dev has them via CLI)
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
| ~~Roblox private server access~~ | ~~Dev~~ | ✅ Done | ~~1.6 Private servers~~ |
| ~~Timeback M2M API auth URL~~ | ~~Beyond AI~~ | ✅ Done | ~~1.7 Timeback ID~~ |
| ~~LWAI → Community user mapping~~ | ~~Dev~~ | ✅ Done (use email) | ~~1.5 Work-wall~~ |
| ~~LWAI query from edge runtime~~ | ~~Dev~~ | ✅ Done (Lambda proxy in `infra/lwai-proxy/`) | ~~1.5 Work-wall~~ |
| RTC provider selection | Team | Open | 5.1 Voice |

---

## Architecture Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Database** | Cloudflare D1 | Edge-native, no cold starts, simple, sufficient for MVP |
| **Sessions** | HMAC-signed cookies | Stateless, no session store needed |
| **Auth** | Timeback SSO | Already integrated, handles Cognito |
| **User identity** | Timeback ID (OneRoster sourcedId) | Fetched via M2M API; falls back to Cognito sub |
| **LWAI user mapping** | Query by email | LWAI uses Alpha's 4-digit IDs, not Timeback UUIDs; email is common key |
| **Parent portal** | Link to AlphaLearn | Don't rebuild, just add toggles |
| **Notifications** | Simple D1 table | Multi-channel overkill for MVP |
| **Permissions** | Role column + settings table | Simple, extensible |

---

## Future Consolidation

Technical debt and infrastructure improvements to tackle after core features are stable.

#### Unified Environment Variables

**Problem:** Mixed patterns for accessing env vars — `$env/static/private` for auth secrets (build-time), `$env/dynamic/private` for LWAI proxy (runtime), `platform.env` for D1. Confusing and fragile.

**Goal:** Single approach that works both locally (`.env`) and on Cloudflare (secrets/bindings).

**Work:**
- Refactor `timeback.ts` to lazily initialize (not module-level singleton)
- Refactor `session.ts` to accept secret as parameter
- Use `$env/dynamic/private` consistently everywhere
- Document the pattern in `CLAUDE.md`

---

#### Adaptive Gating (Timeback XP vs LWAI Minutes)

**Problem:** Currently hardcoded to LWAI `active_minutes`. Alpha Anywhere students use LWAI/Coachbot, but most Timeback students use XP from the Timeback system.

**Goal:** Auto-detect which gating source applies to each student and adapt the UI accordingly.

**Work:**
- Add `gatingSource: 'lwai' | 'timeback'` to `GatingState`
- Detect source based on user's school/org (OneRoster data)
- For Timeback students: call Timeback XP API instead of LWAI proxy
- UI shows "minutes" for LWAI, "XP" for Timeback
- Work wall messaging adapts to source

**Deferred until:** LWAI integration stable, Timeback XP API available

---

#### SST Infrastructure Consolidation

**Problem:** Multiple deployment tools — wrangler for Cloudflare (Pages, D1, secrets), SST for AWS Lambda. Different secret management, different deploy commands.

**Goal:** Single `sst deploy` manages everything.

**Work:**
- Migrate SvelteKit app to `sst.cloudflare.SvelteKit`
- Migrate D1 database to `sst.cloudflare.D1`
- Keep existing `sst.aws.ApiGatewayV2` for LWAI proxy
- Unified secrets via SST linking
- Remove wrangler.toml, update CI/CD

**Reference:** SST v3 (Ion) supports multi-provider (AWS + Cloudflare) in single config.

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

1. ~~**Work-wall criteria:**~~ ✅ Decided — `active_minutes` weekly sum, 300 min threshold
2. **Weekly vs daily gating:** AB test, or just go weekly? What happens on weekends/breaks?
3. ~~**LWAI query architecture:**~~ ✅ Decided — Lambda proxy in `infra/lwai-proxy/`
4. **Profile stats:** What metrics to show on student profile pages? Options from LWAI: total levels mastered, active minutes, accuracy rate, streak days.
5. **Roblox private servers:** API access model? Pre-provisioned vs on-demand? Cost per server?
6. **Roblox identity linking:** How to connect AAC accounts to Roblox accounts for private server access?
7. **Minecraft feasibility:** Bedrock vs Java? Realms vs self-hosted? Worth doing in Feb or defer?
8. **Voice provider:** Agora vs Daily.co?
9. **Avatar generation:** Which image model? Cost?

---

## Next Steps (Immediate — February 2026)

1. ~~**Wire Explore to D1**~~ ✅ Done
2. ~~**Wire Profiles to D1**~~ ✅ Done (with editing)
3. ~~**Implement Game Launch**~~ ✅ Done (Roblox private server deep links)
4. ~~**Roblox private servers**~~ ✅ Done (deep link format: `placeId` + `accessCode` + `linkCode`)
5. ~~**Game catalog to D1**~~ ✅ Done (games table with private server fields)
6. ~~**Apply migrations remotely**~~ ✅ Done
7. ~~**Fetch real Timeback ID**~~ ✅ Done — M2M OneRoster lookup implemented (1.7)
8. ~~**LWAI access & exploration**~~ ✅ Done — Athena queries working, schema documented
9. ~~**Design LWAI query architecture**~~ ✅ Done — Lambda proxy in `infra/lwai-proxy/`
10. ~~**Define work-wall criteria**~~ ✅ Done — `active_minutes` weekly sum, 300 min threshold
11. ~~**Implement work-wall endpoint**~~ ✅ Done — Arcade fetches gating data from Lambda proxy
12. **Deploy LWAI Lambda** — `cd infra/lwai-proxy && bunx sst deploy --stage production`
13. **Set Cloudflare secrets** — `LWAI_PROXY_URL`, `LWAI_API_KEY` for production
14. **Explore profile stats metrics** — What LWAI data to surface on student profiles (levels mastered, streaks, etc.)
15. **Provision more private servers** — See `docs/games-to-add.md` for game list
