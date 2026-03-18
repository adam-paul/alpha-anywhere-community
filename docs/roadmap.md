# Alpha Anywhere Community: Roadmap

**Last updated:** 2026-03-18

---

## Current State

Production-quality frontend with complete UI flows. Infrastructure in place: D1 database (local + remote), Timeback SSO, cookie sessions, auto-provisioned users. Roblox private server deep links working. Work-wall gating live for both LWAI (300 min/week via Lambda proxy) and Timeback (120 XP/day via EduBridge Analytics). Per-student gating source detection cached in D1. Friend system fully wired. Admin role gating with inline admin tools (game CRUD with Roblox lookup, DevTools).

### Infrastructure (Complete)

| Component              | Status | Details                                                       |
| ---------------------- | ------ | ------------------------------------------------------------- |
| **Framework**          | ✅     | SvelteKit 5 with runes, TypeScript strict                     |
| **Styling**            | ✅     | Design tokens in `tokens.css`, cel-shaded theme               |
| **Deployment**         | ✅     | Cloudflare Pages with Workers runtime                         |
| **Database**           | ✅     | D1 (SQLite at edge), schema applied locally + remote          |
| **Authentication**     | ✅     | Timeback SSO via `@timeback/sdk`, cookie sessions             |
| **Session Management** | ✅     | HMAC-signed cookies, 7-day expiry                             |
| **User Provisioning**  | ✅     | Auto-creates D1 user + profile on first authenticated request |

### Frontend UI

| Feature         | Location             | Status             | Data Source                     |
| --------------- | -------------------- | ------------------ | ------------------------------- |
| **Arcade**      | `/arcade`            | Complete           | D1 ✅                           |
| **Work Wall**   | Integrated in arcade | Complete           | LWAI ✅ / Timeback XP ✅        |
| **Profiles**    | `/profile/[id]`      | Complete, editable | D1 ✅ (friends, mutual friends) |
| **Explore**     | `/explore`           | Complete           | D1 ✅                           |
| **Chat**        | `/chat`              | Complete           | Mock data                       |
| **Admin Tools** | Inline in arcade     | Complete           | D1 ✅ (game CRUD, DevTools)     |
| **UI System**   | `$lib/components/ui` | Complete           | N/A                             |

### Database Schema

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
- `migrations/0003_gating_source.sql` — Per-student gating source cache columns
- `migrations/0004_user_roles.sql` — User roles (`student`/`admin`)
- `src/lib/server/db/client.ts` — Type-safe D1 client
- `src/lib/server/db/types.ts` — TypeScript interfaces
- `src/lib/server/admin.ts` — Admin role guard

### Not Yet Wired

| Feature            | Status        | Notes                                                                                    |
| ------------------ | ------------- | ---------------------------------------------------------------------------------------- |
| Chat → D1          | Not connected | Still uses `MOCK_CONVERSATIONS`, `MOCK_MESSAGES`                                         |
| Student Map        | Placeholder   | UI exists, shows "Coming soon"                                                           |
| Real-time Presence | None          | No "who's online" functionality                                                          |
| Chat Moderation    | None          | No content filtering                                                                     |
| Parent Controls    | None          | No ToS, no per-child toggles                                                             |
| Notifications      | Stopgap       | Pending friend requests shown on profile + sidebar badge; no general notification system |

---

## Development Environment

| Port | Command          | Runtime            | D1 Access |
| ---- | ---------------- | ------------------ | --------- |
| 5173 | `bun run dev`    | Vite (hot reload)  | ❌ No     |
| 6173 | `bun run dev:cf` | Wrangler (Workers) | ✅ Yes    |

Use **6173** (Wrangler) when testing D1 features or auth. Use **5173** (Vite) for fast UI iteration without auth.

**Health check:** `http://localhost:6173/api/health`

**Migrations:**

```bash
bun run db:migrate              # Apply pending migrations (local)
bun run db:migrate:remote       # Apply pending migrations (remote)
bun run db:migrate:status       # List pending migrations (local)
bun run db:migrate:status:remote # List pending migrations (remote)
```

Order: apply remote migrations **before** deploying new code that depends on schema changes.

---

## Build Order

### Tier 1: Core Experience — ✅ Mostly Complete

SSO, Explore, Profiles, Game Launch, LWAI work-wall, Timeback XP gating, private servers, and Timeback ID resolution are all done. See git history for implementation details.

#### Game Catalog Management — ✅ Complete

Admin game CRUD via inline modal on arcade page (`/api/admin/games/*`). Roblox URL lookup auto-populates game metadata. Credentials encrypted at write time via AES-256-GCM. Seed script remains for bulk bootstrapping.

**Remaining:**

#### Game Extensibility (Minecraft & Beyond)

- Evaluate Minecraft server hosting (Bedrock vs Java, Realms vs self-hosted)
- `minecraft://` protocol handler support (already stubbed in game launcher)
- Determine if work-wall gating applies per-game or globally

#### Production Deploy ⏳

- Consider separate D1 database for prod vs preview
- Set secrets for production/master branch
- Verify SSO callbacks with production domain
- Smoke test: login → profile → arcade → work-wall flow

---

### Tier 2: Social & Communication

**Goal:** Wire up remaining social features. DB schema already supports these.

#### Wire Chat to Real Messages

Chat UI is complete and DB schema + client methods exist. Ready to wire.

- Create `src/routes/chat/+page.server.ts` — fetch conversations
- `POST /api/messages` — send message
- `GET /api/conversations/[id]/messages` — paginated fetch
- Update `chat.svelte.ts` to use API, remove mock data

#### Friend System — ✅ Complete

Send/accept/decline/unfriend with full API (`/api/friends/{request,accept,remove}`), state-aware ProfileHeader button (hover-to-cancel on pending), friends list on own profile, mutual friends on others' profiles. Decline = delete row (re-request always possible). No `declined` status in schema.

**Not yet done:** General notification system (friend requests currently surfaced via profile page + sidebar badge as stopgap), 30-day request expiry, blocking (separate feature).

#### Student Map

Geographic visualization of student locations. Geocode to lat/lng, map component (Mapbox or Leaflet), city-level clustering for privacy.

**Priority:** High — parents frequently ask "who else is in my area?"

#### Presence (Online + In-Game)

Show who's online and who's playing what.

- **Online presence:** Heartbeat mechanism, green dot on avatars, sidebar friends list. Architecture: Durable Objects or simple polling with short TTL.
- **Game presence:** Track launch events with 30-min TTL, show "X students playing" on game cards (UI already supports `playerCount` prop). Advanced: Roblox API presence endpoint (requires OAuth).

#### Notifications

Full in-app notification system. Currently friend requests are surfaced via the user's own profile page and a sidebar badge — this is a stopgap. A proper system is needed before chat goes live, since chat messages will also need notifications.

- **Migration:** `notifications` table (user_id, type, payload JSON, read_at, created_at)
- **API:** `GET /api/notifications` (list, paginated), `POST /api/notifications/read` (mark read/all-read)
- **UI:** Notification bell in sidebar or header with unread count badge, dropdown or dedicated page for notification list
- **Event sources:** Friend requests (pending), chat messages (new message in conversation), moderation actions, system announcements
- **Delivery:** Start with poll-on-navigation (layout server load). Upgrade to SSE or WebSocket for real-time later
- **Cleanup:** Once live, remove the stopgap pending-request count from layout server load and sidebar badge — replace with general notification count

---

### Tier 3: Gating & Permissions

**Goal:** Role-based access, parent controls.

#### User Roles — ✅ Schema + Gating Done

`role` column on users table (`student`/`admin`, default `student`). Server-side `assertAdmin()` guard on all admin API routes. Admin UI conditionally rendered via `isAdmin` from server load. Role currently set manually via SQL.

**Remaining:** OneRoster role mapping during login — `resolveTimebackId()` already makes the M2M call, just needs to capture the role field.

#### Parent Controls

Connect parent accounts to children, let parents manage per-child feature settings.

- **Parent-child linking:** `guardianships` table, sync from Timeback OneRoster or manual linking
- **Feature settings:** `user_settings` table (community, chat, arcade, voice, location toggles), ToS acceptance flow
- **UI:** Link to AlphaLearn's existing parent dashboard rather than rebuilding

---

### Tier 4: Safety & Moderation

**Goal:** Make it safe for kids.

#### Chat Moderation

AI moderation (OpenAI Moderation API) — check on send, before persistence. Decision needed: block vs deliver with flag.

#### Staff Escalation

Protected `/admin/moderation` route. List flagged messages, actions (dismiss, warn, suspend), audit log.

#### Report Flow

Students report messages/users. `reports` table with status tracking.

---

### Tier 5: Differentiation

**Goal:** Unique high-value features.

#### Alpha Voice

Browser-based voice chat for under-13 students. RTC SDK (Daily.co or Agora), voice pods per game. Safety: panic button, recording indicator.

**Blocked on:** RTC provider selection.

#### Avatar Generation

AI-generated avatars from clickable trait selection (not free text — prevents prompt injection). Image generation API + Cloudflare R2 storage. Low priority.

---

## Architecture Decisions

| Decision              | Choice                             | Rationale                                                                     |
| --------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| **Database**          | Cloudflare D1                      | Edge-native, no cold starts, simple, sufficient for MVP                       |
| **Sessions**          | HMAC-signed cookies                | Stateless, no session store needed                                            |
| **Auth**              | Timeback SSO                       | Already integrated, handles Cognito                                           |
| **User identity**     | Dual: D1 internal ID + Timeback ID | `locals.user.id` = D1 hex ID (for DB FKs), `timebackId` = OneRoster sourcedId |
| **LWAI user mapping** | Query by email                     | LWAI uses Alpha's 4-digit IDs, not Timeback UUIDs; email is common key        |
| **LWAI query**        | Lambda proxy (SST)                 | CF Workers can't do STS AssumeRole; Lambda in AlphaLearn account              |
| **Timeback XP**       | EduBridge Analytics API            | `@timeback/edubridge` client, 120 XP/day threshold, fail-open                 |
| **Gating state**      | Discriminated union store          | Eliminates boolean flag creep; see `gating.svelte.ts`                         |
| **Gating source**     | LWAI Athena probe, cached in D1    | One-time `/probe` checks `daily_learning_metrics` existence; result persists  |
| **Credentials**       | Encrypted D1 columns               | AES-256-GCM, app-level encrypt at seed/admin write, decrypt at runtime        |
| **Admin tools**       | Inline in existing pages           | No separate dashboard; admin sees student view plus admin controls            |
| **Admin auth**        | Server-side `assertAdmin()`        | Backend is single source of truth; frontend renders conditionally from server |
| **Parent portal**     | Link to AlphaLearn                 | Don't rebuild, just add toggles                                               |

---

## Future Improvements

#### Adaptive Gating

- **Flip detection order:** Probe Timeback first, fall back to LWAI Athena. Avoids slow Athena probe for majority of users.
- **Remove LWAI probe:** Once Timeback-first detection is reliable, retire `/probe` Lambda endpoint.
- **Source re-evaluation:** Cached `gating_source` in D1 is permanent — need periodic re-probes or admin mechanism for students who switch platforms.
- **New student detection:** Metrics-based probe misclassifies new LWAI students with no history. Needs enrollment/roster signal instead.

#### Gating Result Caching

Every `/arcade` navigation makes a live API call (LWAI Lambda or EduBridge). Need client-side or edge caching for repeat visits. Options: sessionStorage, SvelteKit layout-level data, edge cache (KV/Cache API with short TTL), or hybrid. Cache invalidation matters — short TTL (5 min) or manual refresh may suffice.

#### SST Infrastructure Consolidation

Unify wrangler (Cloudflare) + SST (AWS) into single `sst deploy`. SST v3 supports multi-provider. Low priority — current setup works.

#### Seed Script Architecture

Two seed scripts exist (`seed-games.ts`, `seed-users.ts`) with duplicated utilities (`escapeSQL`, arg parsing, wrangler execution). Extract shared module when adding a third.

---

## Strategic Context

- **Weekly goals > daily** — High schoolers plan weekly (LWAI uses weekly; Timeback uses daily)
- **Don't rebuild AlphaLearn** — It's maintenance mode, link don't extend
- **Map is high priority** — Parents constantly ask about nearby students
- **Timeback Electron as launcher** — Community will run inside Electron wrapper
- **Private servers first** — Public Roblox games are a liability; private servers give control
- **Minecraft is a stretch goal** — Architecture should support it, Roblox is primary
- **Chat is ready but not urgent** — Wire when socialization features become the focus

---

## Open Questions

1. **Profile stats:** What metrics to show on student profile pages? Options from LWAI: total levels mastered, active minutes, accuracy rate, streak days.
2. **Roblox private servers:** API access model? Pre-provisioned vs on-demand? Cost per server?
3. **Roblox identity linking:** How to connect AAC accounts to Roblox accounts for private server access?
4. **Minecraft feasibility:** Bedrock vs Java? Realms vs self-hosted?
5. **Voice provider:** Agora vs Daily.co?
6. **Avatar generation:** Which image model? Cost?
