# Alpha Anywhere Community: Roadmap

**Last updated:** 2026-03-23

---

## Current State

Full-featured community portal with real-time chat, arcade with work-wall gating, student profiles, friend system, and admin tools. Infrastructure: Cloudflare Pages + D1 + KV, Durable Objects with WebSocket Hibernation API for real-time, LWAI Lambda proxy for learning analytics, Timeback SSO.

### Infrastructure

| Component              | Status | Details                                                                                                              |
| ---------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| **Framework**          | ✅     | SvelteKit 5 with runes, TypeScript strict                                                                            |
| **Styling**            | ✅     | Design tokens in `tokens.css`, cel-shaded theme                                                                      |
| **Deployment**         | ✅     | Cloudflare Pages with Workers runtime                                                                                |
| **Database**           | ✅     | D1 (SQLite at edge), schema applied locally + remote                                                                 |
| **KV Store**           | ✅     | Cloudflare KV for ephemeral data (launch records, TTL-based)                                                         |
| **Authentication**     | ✅     | Timeback SSO via `@timeback/sdk`, cookie sessions                                                                    |
| **Session Management** | ✅     | HMAC-signed cookies, 7-day expiry, cross-subdomain sharing                                                           |
| **User Provisioning**  | ✅     | Auto-creates D1 user + profile on first authenticated request                                                        |
| **Realtime**           | ✅     | Durable Object Worker (`alpha-realtime`) with WebSocket Hibernation API, cookie auth via `ws.alpha-community.school` |
| **Shared Types**       | ✅     | `@alpha/shared` workspace package for cross-project contracts                                                        |

### Features

| Feature         | Location             | Status   | Data Source                     |
| --------------- | -------------------- | -------- | ------------------------------- |
| **Arcade**      | `/arcade`            | Complete | D1 ✅                           |
| **Work Wall**   | Integrated in arcade | Complete | LWAI ✅ / Timeback XP ✅        |
| **Profiles**    | `/profile/[id]`      | Complete | D1 ✅ (friends, mutual friends) |
| **Explore**     | `/explore`           | Complete | D1 ✅                           |
| **Chat**        | `/chat`              | Wired    | D1 ✅ + WebSocket (real-time)   |
| **Admin Tools** | Inline in arcade     | Complete | D1 ✅ (game CRUD, DevTools)     |
| **UI System**   | `$lib/components/ui` | Complete | N/A                             |

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

### Not Yet Built

| Feature           | Status      | Notes                                                                       |
| ----------------- | ----------- | --------------------------------------------------------------------------- |
| Student Map       | Placeholder | UI exists, shows "Coming soon"                                              |
| Platform Presence | Complete    | Green dots on avatars, online friends in sidebar, chat status integration   |
| Chat Moderation   | Not started | Schema has moderation fields, no AI filtering yet                           |
| Notifications     | Stopgap     | Friend requests via profile + sidebar badge; no general notification system |
| Parent Controls   | Not started | No ToS, no per-child toggles                                                |

---

## Build Order

### Tier 1: Core Experience — ✅ Complete

SSO, Explore, Profiles, Game Launch, LWAI work-wall, Timeback XP gating, private servers, Timeback ID resolution, and game catalog management.

---

### Tier 2: Social & Communication — In Progress

#### Chat — ✅ Wired

Real-time messaging over WebSocket with D1 persistence. Per-conversation Durable Object channels. Optimistic message sending, lazy-loaded message history, unread counts, mark-as-read.

**API routes:** `GET/POST /api/chat/messages`, `POST /api/chat/conversations`, `POST /api/chat/conversations/[id]/read`

**Deferred:** Reactions, message editing/deletion UI, typing indicators, mute, attachments, pagination UI (scroll-to-load-more). Non-functional placeholder buttons remain in the UI for these features.

#### Friend System — ✅ Complete

Full API, state-aware profile button, friends list, mutual friends, sidebar badge for pending requests.

#### Arcade Presence — ✅ Complete

Roblox account linking, per-game player counts via KV launch records + Roblox Presence API.

#### Student Map

Geographic visualization of student locations. Geocode to lat/lng, map component (Mapbox or Leaflet), city-level clustering for privacy. High priority — parents frequently ask "who else is in my area?"

#### Platform Presence — ✅ Complete

App-wide `presence:global` WebSocket channel via existing Durable Object. DO sends `presence:snapshot` on connect (full online user list), then `system:join`/`system:leave` events in real-time. Client-side presence store subscribes via `onMessage()`, maintains online user set. Avatar component gained `online` prop with green indicator dot. Online friends section in sidebar (pinned above footer). Chat components show real online/offline status (conversation list, header, details panel). Explore and profile pages show online dots on avatars. 30s keepalive ping via Hibernation API auto-response.

#### Notifications

Full in-app notification system to replace the friend-request stopgap.

- **Migration:** `notifications` table (user_id, type, payload JSON, read_at, created_at)
- **API:** `GET /api/notifications`, `POST /api/notifications/read`
- **UI:** Notification bell with unread count, dropdown or page
- **Sources:** Friend requests, chat messages, moderation actions, system announcements
- **Delivery:** Poll-on-navigation initially, upgrade to WebSocket later

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
| **Shared types**     | `@alpha/shared` workspace package | Cross-project contracts (WebSocket protocol, LWAI gating) — one home            |
| **Credentials**      | Encrypted D1 columns              | AES-256-GCM, app-level encrypt at write, decrypt at runtime                     |
| **Admin tools**      | Inline in existing pages          | No separate dashboard; admin sees student view plus admin controls              |
| **Arcade presence**  | KV launch records + Roblox API    | 5-min TTL, refreshed while in-game, polled every 15s                            |
| **Roblox linking**   | Manual username + avatar confirm  | Soft verification only; OAuth upgrade path pending                              |
| **LWAI query**       | Lambda proxy (SST)                | CF Workers can't do STS AssumeRole                                              |
| **Gating state**     | Discriminated union store         | Eliminates boolean flag creep                                                   |

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

#### Auth Strategy Beyond Timeback SSO

Currently Timeback SSO is the only auth path — no one without a Timeback account (tied to a `.school` email) can sign in. This creates two problems:

- **Testing:** Only one account per developer. Can't open two browser sessions as different users to test chat, friend requests, presence, etc. No way to simulate multi-user flows.
- **Access scope:** If the community ever needs to support users outside the Timeback ecosystem (parents, mentors, alumni), there's no path for that.

Needs thinking. Options include: test/seed user impersonation (admin-only, dev/preview environments only), additional OAuth providers alongside Timeback, or a lightweight invite-code flow. No public username/password auth — the platform is for a gated community, not open registration.

---

## Loose Ends

Small items that don't belong to a tier but need attention eventually.

- **Harden Roblox account linking** — Currently accepts any username with no verification. Soft-match only (avatar confirmation). Needs stronger identity proof.
- **Add Roblox OAuth** — Replace manual username entry with OAuth flow. Requires Roblox app review/approval.
- **Harden Roblox game launch/auth flow** — If the user isn't logged into Roblox, the deep link loses its params and lands on the Roblox home page (except on Windows). Needs detection or guidance for the user.
- **Production deploy** — Replicate preview environment in production Cloudflare Pages. Separate D1 database, set secrets, verify SSO callbacks, smoke test.
- **Clean up Timeback XP fetch** — Unclear whether EduBridge Analytics integration is returning correct data. Needs investigation and validation.
- **Set up docs** — Pick a documentation stack and stand up a docs site.
- **Local dev WebSocket** — WebSocket connects to deployed Worker only (`ws.alpha-community.school`); no local dev real-time testing. Chat loads conversations and persists messages locally, but real-time delivery between tabs requires the deployed preview environment.

---

## Strategic Context

- **Weekly goals > daily** — High schoolers plan weekly (LWAI uses weekly; Timeback uses daily)
- **Don't rebuild AlphaLearn** — It's maintenance mode, link don't extend
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
