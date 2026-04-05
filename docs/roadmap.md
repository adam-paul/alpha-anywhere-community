# Alpha Anywhere Community: Roadmap

**Last updated:** 2026-04-05

---

## Current State

Full-featured community portal with real-time chat, arcade with work-wall gating, student profiles, friend system, notifications, and admin tools. Infrastructure: Cloudflare Pages + D1 + KV, Durable Objects with WebSocket Hibernation API for real-time, LWAI Lambda proxy for learning analytics, Timeback SSO.

### Infrastructure

| Component              | Status | Details                                                                                                              |
| ---------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| **Framework**          | ✅     | SvelteKit 5 with runes, TypeScript strict                                                                            |
| **Styling**            | ✅     | Design tokens in `tokens.css`, cel-shaded theme                                                                      |
| **Deployment**         | ✅     | Cloudflare Pages with Workers runtime                                                                                |
| **Database**           | ✅     | D1 (SQLite at edge), schema applied locally + remote                                                                 |
| **KV Store**           | ✅     | Cloudflare KV for ephemeral data (launch records, TTL-based)                                                         |
| **Authentication**     | ✅     | Timeback SSO via `@timeback/sdk`, cookie sessions, admin impersonation (dev/preview)                                 |
| **Session Management** | ✅     | HMAC-signed cookies, 7-day expiry, cross-subdomain sharing, D1 ID auto-correction on login                           |
| **User Provisioning**  | ✅     | Auto-creates D1 user + profile on first authenticated request                                                        |
| **Realtime**           | ✅     | Durable Object Worker (`alpha-realtime`) with WebSocket Hibernation API, cookie auth via `ws.alpha-community.school` |
| **Shared Types**       | ✅     | `@alpha/shared` workspace package for cross-project contracts                                                        |
| **Local Dev Realtime** | ✅     | `PUBLIC_REALTIME_URL` env var, `bun run dev:realtime` starts Worker locally on port 8787                             |

### Features

| Feature               | Location             | Status   | Data Source                        |
| --------------------- | -------------------- | -------- | ---------------------------------- |
| **Arcade**            | `/arcade`            | Complete | D1 ✅                              |
| **Work Wall**         | Integrated in arcade | Complete | LWAI ✅ / Timeback XP ✅           |
| **Profiles**          | `/profile/[id]`      | Complete | D1 ✅ (friends, mutual friends)    |
| **Explore**           | `/explore`           | Complete | D1 ✅                              |
| **Chat**              | `/chat`              | Complete | D1 ✅ + Durable Object (real-time) |
| **Arcade Presence**   | Integrated in arcade | Complete | KV ✅ + Roblox Presence API        |
| **Platform Presence** | App-wide             | Complete | Durable Object (real-time)         |
| **Notifications**     | App-wide             | Complete | D1 ✅ + WebSocket (real-time)      |
| **Admin Tools**       | Inline in arcade     | Complete | D1 ✅ (game CRUD, DevTools)        |
| **UI System**         | `$lib/components/ui` | Complete | N/A                                |

### Database Schema

```
users ←──── profiles (1:1)
  │
  ├──── friendships (M:M, directional with status)
  │
  ├──── notifications (actor → recipient, polymorphic reference_id)
  │
  └──── conversation_participants (M:M) ────→ conversations
                                                    │
                                                    └──→ messages (with moderation fields)

games (standalone, Roblox private server support)
```

### Not Yet Built

| Feature         | Status      | Notes                                             |
| --------------- | ----------- | ------------------------------------------------- |
| Student Map     | Placeholder | UI exists, shows "Coming soon"                    |
| Chat Moderation | Not started | Schema has moderation fields, no AI filtering yet |
| Parent Controls | Not started | No ToS, no per-child toggles                      |

---

## Build Order

### Tier 1: Core Experience — ✅ Complete

SSO, Explore, Profiles, Game Launch, LWAI work-wall, Timeback XP gating, private servers, Timeback ID resolution, and game catalog management.

---

### Tier 2: Social & Communication — ✅ Complete

#### Chat — ✅ Complete

Real-time messaging over WebSocket with D1 persistence. Unified realtime store for both presence and per-conversation chat channels — keepalive, reconnection, and lifecycle managed in one place. Optimistic message sending, lazy-loaded message history, unread counts, mark-as-read. Deep-link to conversations via `?with={userId}` (used by sidebar online friends). Unread badge on sidebar Chat nav item, updated in real-time via `chat:unread` signal on `presence:global`.

**API routes:** `GET/POST /api/chat/messages`, `POST /api/chat/conversations`, `POST /api/chat/conversations/[id]/read`

**Deferred:** Reactions, message editing/deletion UI, typing indicators, mute, attachments, pagination UI (scroll-to-load-more). Non-functional placeholder buttons remain in the UI for these features.

#### Friend System — ✅ Complete

Full API, state-aware profile button, friends list, mutual friends.

#### Arcade Presence — ✅ Complete

Roblox account linking, per-game player counts via KV launch records + Roblox Presence API.

#### Student Map

Geographic visualization of student locations. Geocode to lat/lng, map component (Mapbox or Leaflet), city-level clustering for privacy. High priority — parents frequently ask "who else is in my area?"

#### Platform Presence — ✅ Complete

App-wide `presence:global` WebSocket channel via Durable Object. Client requests snapshot after connecting; DO responds with current online users, then broadcasts `system:join`/`system:leave` in real-time. Presence store maintains online user set. Online indicators on avatars across all pages. Online friends section in sidebar links directly to chat. 30s keepalive ping via Hibernation API auto-response.

#### Notifications — ✅ Complete

Platform-wide notification system replacing the ad-hoc friend request badge.

- **Migration:** `notifications` table (recipient_id, actor_id, type, reference_id, read_at, created_at). Partial index on unread for fast count queries.
- **API:** `GET /api/notifications`, `POST /api/notifications/read` (single or mark-all)
- **UI:** Bell icon in AppHeader with unread count badge, dropdown tray with notification list. Inline accept/decline on friend request notifications. Relative timestamps.
- **Types:** `friend_request_received`, `friend_request_accepted`, `conversation_created`. Extensible via CHECK constraint migration.
- **Delivery:** D1 source of truth, server-loaded initial state, real-time via `notification:push` signal on `presence:global`. Client-side recipient filtering, API fetch on push.
- **Side effects:** Notifications auto-created in friend request, accept, and conversation creation API routes.
- **Chat unread badge:** Separate from notifications. Real-time `chat:unread` signal on `presence:global`, reactive count in notification store, badge on sidebar Chat nav item.

---

### Tier 3: Game Extensibility

#### Minecraft & Beyond

- Evaluate Minecraft server hosting (Bedrock vs Java, Realms vs self-hosted)
- `minecraft://` protocol handler support (already stubbed in game launcher)
- Determine if work-wall gating applies per-game or globally

---

### Tier 4: Gating & Permissions

#### User Roles — ✅ Schema + Gating Done

**Remaining:** OneRoster role mapping during login.

#### Parent Controls

- Parent-child linking (`guardianships` table, sync from Timeback OneRoster)
- Feature settings (`user_settings` table, ToS acceptance)
- Link to AlphaLearn's existing parent dashboard

---

### Tier 5: Safety & Moderation

- **Chat Moderation** — AI moderation (check on send, before persistence). Decision needed: block vs deliver with flag.
- **Staff Escalation** — Protected `/admin/moderation` route with flagged messages, actions, audit log.
- **Report Flow** — Students report messages/users. `reports` table with status tracking.

---

### Tier 6: Differentiation

- **Alpha Voice** — Browser-based voice chat. RTC SDK (Daily.co or Agora). Blocked on provider selection.
- **Avatar Generation** — AI-generated avatars from trait selection. Low priority.

---

## Architecture Decisions

| Decision             | Choice                            | Rationale                                                                       |
| -------------------- | --------------------------------- | ------------------------------------------------------------------------------- |
| **Database**         | Cloudflare D1                     | Edge-native, no cold starts, sufficient for MVP                                 |
| **Sessions**         | HMAC-signed cookies               | Stateless, cross-subdomain (`.alpha-community.school`)                          |
| **Auth**             | Timeback SSO                      | Already integrated, handles Cognito                                             |
| **Realtime**         | Durable Objects + WebSocket       | Hibernation API (cost-efficient), per-channel DO instances                      |
| **Realtime routing** | Separate Worker + custom domain   | SvelteKit can't proxy WebSocket upgrades; Worker at `ws.alpha-community.school` |
| **Realtime URL**     | `PUBLIC_REALTIME_URL` env var     | Configurable per environment; local dev points to `ws://localhost:8787`         |
| **Shared types**     | `@alpha/shared` workspace package | Cross-project contracts (WebSocket protocol, LWAI gating) — one home            |
| **Credentials**      | Encrypted D1 columns              | AES-256-GCM, app-level encrypt at write, decrypt at runtime                     |
| **Admin tools**      | Inline in existing pages          | No separate dashboard; admin sees student view plus admin controls              |
| **Arcade presence**  | KV launch records + Roblox API    | 5-min TTL, refreshed while in-game, polled every 15s                            |
| **Roblox linking**   | Manual username + avatar confirm  | Soft verification only; OAuth upgrade path pending                              |
| **LWAI query**       | Lambda proxy (SST)                | CF Workers can't do STS AssumeRole                                              |
| **Gating state**     | Discriminated union store         | Eliminates boolean flag creep                                                   |
| **Notifications**    | D1 + WebSocket signal             | DB source of truth, `notification:push` on `presence:global` for real-time      |

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

Unify wrangler (Cloudflare) + SST (AWS) into single `sst deploy`. SST v3 supports multi-provider. Would also unify local dev into a single `sst dev` command (currently requires two terminals: `bun run dev:cf` + `bun run dev:realtime`). Low priority — current setup works.

#### Seed Script Architecture

Two seed scripts exist (`seed-games.ts`, `seed-users.ts`) with duplicated utilities (`escapeSQL`, arg parsing, wrangler execution). Extract shared module when adding a third.

#### Auth Beyond Timeback SSO

Timeback SSO is the only production auth path. If the community ever needs users outside the Timeback ecosystem (parents, mentors, alumni), additional OAuth providers or an invite-code flow would be needed.

---

## Loose Ends

Small items that don't belong to a tier but need attention eventually.

- **Harden Roblox account linking** — Currently accepts any username with no verification. Soft-match only (avatar confirmation). Needs stronger identity proof.
- **Add Roblox OAuth** — Replace manual username entry with OAuth flow. Requires Roblox app review/approval.
- **Harden Roblox game launch/auth flow** — If the user isn't logged into Roblox, the deep link loses its params and lands on the Roblox home page (except on Windows). Needs detection or guidance for the user.
- **Production deploy** — Replicate preview environment in production Cloudflare Pages. Separate D1 database, set secrets, verify SSO callbacks, smoke test.
- **Set up docs** — Pick a documentation stack and stand up a docs site.

---

## Strategic Context

- **Weekly goals > daily** — High schoolers plan weekly (LWAI uses weekly; Timeback uses daily)
- **Map is high priority** — Parents constantly ask about nearby students
- **Timeback Electron as launcher** — Community will run inside Electron wrapper
- **Private servers first** — Public Roblox games are a liability; private servers give control
- **Minecraft is a stretch goal** — Architecture should support it, Roblox is primary

---

## Open Questions

1. **Profile stats:** What metrics to show on student profile pages? Options from LWAI: total levels mastered, active minutes, accuracy rate, streak days.
2. **Roblox private servers:** API access model? Pre-provisioned vs on-demand? Cost per server?
3. **Minecraft feasibility:** Bedrock vs Java? Realms vs self-hosted?
4. **Voice provider:** Agora vs Daily.co?
5. **Avatar generation:** Which image model? Cost?
