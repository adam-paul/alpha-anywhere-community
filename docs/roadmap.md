# Alpha Anywhere Community: Roadmap

**Last updated:** 2026-04-19

---

## Current State

Full-featured community portal with real-time chat, voice chat, arcade (work-wall gating + per-game lobbies), student profiles with linked Roblox accounts, friend system, notifications, content moderation, and admin tools. Infrastructure: Cloudflare Pages + D1 + KV, Durable Objects for real-time, self-hosted LiveKit for voice, LWAI Lambda proxy for learning analytics, Timeback SSO. Session secrets split between cookie signing (`SESSION_SECRET`) and one-way COPPA user-ID hashing for eval logs (`EVALS_HASH_SECRET`). Eval harness (`@alpha/evals`) for moderation drift tracking. COPPA + security audit captured in `docs/coppa-research-2026-04.md` and `docs/security-audit-2026-04.md`.

### Infrastructure

| Component              | Status | Details                                                                                                                                                                                                      |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Framework**          | ✅     | SvelteKit 5 with runes, TypeScript strict                                                                                                                                                                    |
| **Styling**            | ✅     | Design tokens in `tokens.css`, cel-shaded theme                                                                                                                                                              |
| **Deployment**         | ✅     | Cloudflare Pages with Workers runtime                                                                                                                                                                        |
| **Database**           | ✅     | D1 (SQLite at edge), schema applied locally + remote                                                                                                                                                         |
| **KV Store**           | ✅     | Cloudflare KV for ephemeral data (launch records, TTL-based)                                                                                                                                                 |
| **Authentication**     | ✅     | Timeback SSO via `@timeback/sdk`, cookie sessions, admin impersonation (dev/preview)                                                                                                                         |
| **Session Management** | ✅     | HMAC-signed cookies, 7-day expiry, cross-subdomain sharing, D1 ID auto-correction on login. Split secrets: `SESSION_SECRET` for cookie signing, `EVALS_HASH_SECRET` for one-way user-ID hashing in eval logs |
| **User Provisioning**  | ✅     | Auto-creates D1 user + profile on first authenticated request                                                                                                                                                |
| **Realtime**           | ✅     | Durable Object Worker (`alpha-realtime`) with WebSocket Hibernation API, cookie auth via `ws.alpha-community.school`                                                                                         |
| **Shared Types**       | ✅     | `@alpha/shared` workspace package for cross-project contracts                                                                                                                                                |
| **Voice Chat**         | ✅     | Self-hosted LiveKit on DigitalOcean, Caddy reverse proxy for TLS, TURN on port 3478                                                                                                                          |
| **Local Dev Realtime** | ✅     | `PUBLIC_REALTIME_URL` env var, `bun run dev:realtime` starts Worker locally on port 8787                                                                                                                     |

### Features

| Feature               | Location             | Status   | Data Source                                                                                |
| --------------------- | -------------------- | -------- | ------------------------------------------------------------------------------------------ |
| **Arcade**            | `/arcade`            | Complete | D1 ✅                                                                                      |
| **Work Wall**         | Integrated in arcade | Complete | LWAI ✅ / Timeback XP ✅                                                                   |
| **Profiles**          | `/profile/[id]`      | Complete | D1 ✅ (friends, mutual friends, linked Roblox accounts, avatar source)                     |
| **Explore**           | `/explore`           | Complete | D1 ✅                                                                                      |
| **Chat**              | `/chat`              | Complete | D1 ✅ + Durable Object (real-time)                                                         |
| **Game Lobbies**      | `/arcade/[gameId]`   | Complete | Durable Object (lobby state + ephemeral chat + auto-voice)                                 |
| **Arcade Presence**   | Arcade grid tiles    | Complete | Lobby DO broadcasts (instant, tile counts) + Roblox Presence API (informational, in-lobby) |
| **Platform Presence** | App-wide             | Complete | Durable Object (real-time)                                                                 |
| **Notifications**     | App-wide             | Complete | D1 ✅ + WebSocket (real-time)                                                              |
| **Voice Chat**        | Chat + Arcade        | Complete | LiveKit (self-hosted, WebRTC)                                                              |
| **Text Moderation**   | Chat + Profile       | Complete | Gemini + OpenAI (either-can-veto)                                                          |
| **Eval Harness**      | `@alpha/evals`       | Complete | CLI + D1 (corpus, runs, results)                                                           |
| **Admin Tools**       | Inline in arcade     | Complete | D1 ✅ (game CRUD, DevTools)                                                                |
| **UI System**         | `$lib/components/ui` | Complete | N/A                                                                                        |

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

moderation_events (flagged content audit, 90-day COPPA expiry)
generation_events (every moderation call, user_id hashed, 90-day expiry)
eval_runs ←── eval_case_results (harness metrics + per-case breakdown)
```

### Not Yet Built

| Feature         | Status      | Notes                                                                      |
| --------------- | ----------- | -------------------------------------------------------------------------- |
| Student Map     | Placeholder | UI exists, shows "Coming soon"                                             |
| Parent Controls | Not started | No ToS, no per-child toggles — needed for COPPA 2025 amendments compliance |

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

Tile counts on the arcade grid are lobby-driven: `currentLobby` state carried on each connection's `presence:global` attachment, broadcast via `lobby:state` on enter/leave. Instant, no polling. Roblox account linking has a "Create account" prompt for new users; linking flow resumes a pending game launch on success. Inside a lobby, a "who's currently in-game" panel polls Roblox Presence API + KV launch records (`presence:user:${id}`, 5-min TTL) informationally — useful for coordination but not UX-critical.

#### Game Lobbies — ✅ Complete

Per-game lobby pages at `/arcade/[gameId]` — a full-screen view within the arcade, similar to how a conversation works in chat. Clicking a game card enters the lobby; the lobby owns presence, ephemeral chat, and voice for that game.

- **Presence model**: Mount = join, unmount = leave. Instant lobby state via Durable Object, no polling.
- **Tile counts**: The arcade grid reads `lobby:state` broadcasts to show live in-lobby counts on each card.
- **Ephemeral chat**: Scoped to the lobby instance; not persisted to D1. `lobby:chat` messages relay through the lobby DO.
- **Auto-voice**: Joining the lobby auto-joins the `game:{gameId}` voice room (subject to the one-room-at-a-time rule).
- **Deep-link safety**: Disconnects during the initial join handshake don't produce phantom leave events.
- **Game launch**: Happens from within the lobby (deep link / iframe / etc.); the student stays in the lobby while playing.
- **Roblox Presence API**: Remains available inside the lobby as an informational panel (who's in-game on which server). No longer load-bearing for tile counts.

Retires the prior global arcade-grid presence scan (N-games polled) and the click-to-launch flow. Roblox API is now informational, not load-bearing.

#### Student Map

Geographic visualization of student locations. Geocode to lat/lng, map component (Mapbox or Leaflet), city-level clustering for privacy. High priority — parents frequently ask "who else is in my area?"

#### Platform Presence — ✅ Complete

App-wide `presence:global` WebSocket channel via Durable Object. Client requests snapshot after connecting; DO responds with current online users, then broadcasts `system:join`/`system:leave` in real-time. Presence store maintains online user set. Online indicators on avatars across all pages. Online friends section in sidebar links directly to chat. 30s keepalive ping via Hibernation API auto-response.

#### Voice Chat — ✅ Complete

Browser-based voice chat via self-hosted LiveKit on DigitalOcean. Solves Roblox's 13+ age restriction on Spatial Voice — audio runs in the browser while games play fullscreen.

- **Infrastructure:** LiveKit Server (Go binary) on a 2-vCPU DO droplet, Caddy for TLS termination, TURN on port 3478. ~$18/mo at current scale. See `docs/voice-chat-discovery.md` for SDK evaluation and architecture diagrams.
- **Voice store:** `voice.svelte.ts` wraps LiveKit client SDK. Dynamic import avoids SSR. One room at a time enforced — joining a new room auto-leaves the current one. Map reassignment for Svelte 5 reactivity on participant changes.
- **Token auth:** `POST /api/voice/token` mints LiveKit JWTs server-side. Identity = D1 user ID, grants scoped to specific room. Client connects directly to LiveKit (audio never touches Cloudflare).
- **Chat integration:** Phone icon in ChatHeader with three states (start / join / leave). `voice:joined`/`voice:left` broadcast on per-conversation realtime channel for live state. `voice_call_started` notification fires only when starting a call (not joining). Room name convention: `chat:{conversationId}`.
- **Game integration:** Per-game voice rooms (`game:{gameId}`). Voice join/leave is driven by lobby membership — entering `/arcade/[gameId]` auto-joins the game voice room; leaving the lobby auto-leaves. Replaces the earlier Roblox-presence-poll trigger.
- **Header indicator:** `VoiceIndicator` component in AppHeader (left of bell, separated). Shows room context ("Voice Call" / "In Game"), participant count, mute toggle, leave button. Persists across page navigation.
- **API routes:** `POST /api/voice/token`, `POST /api/voice/notify`

**Deferred:** Voice moderation (STT + AI filtering via LiveKit Agents framework), public/persistent rooms (`is_public` flag on conversations), push-to-talk option, video, COPPA legal review. See `docs/voice-chat-discovery.md`.

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

#### Text Moderation — ✅ Runtime + harness complete

Dual-provider content moderation (Gemini 2.0 Flash + OpenAI omni-moderation-latest, either-can-veto) gates chat send and profile edit. Flagged content is rejected before D1 write with a kid-friendly reason; every call is audit-logged to `generation_events` via `waitUntil` (zero request latency). Eval harness (`bun run eval:moderation`) runs the 527-case AlphaLearn corpus through the live pipeline and persists run + per-case results for drift tracking.

- **Package:** `packages/evals` — pure core (scoring, merge, severity), prompts, providers, harness. Built stack-agnostic so future surfaces (tutor responses, imagen) plug in via `Provider` / `Scorer` interfaces.
- **Wiring:** `moderateAndPersist` in `src/lib/server/evals.ts` owns the runtime contract (moderation_events on flag, generation_events always).
- **Admin:** `POST /api/admin/evals/debug/classify` for on-the-fly prompt probing. No full admin UI yet.
- See `docs/EVAL_STRATEGY.md` for the layered eval philosophy, hard-constraint floors, and the Karpathy-loop framing.

**Remaining for production:**

- **Admin review UI** — `/admin/moderation` route with flagged-content queue, dismiss/escalate actions, corpus CRUD, run history browser.
- **Escalation thresholds** — `ModerationFlag.status` lifecycle (open/reviewed/dismissed), 3-in-24h PII → parent-notify signal, self-harm → immediate escalation. Tied to parent-contact infra.
- **Report flow** — Students report messages/users. `reports` table with status tracking.
- **Content expiry cron** — `content_expires_at` columns exist on both audit tables for COPPA; scheduled Worker to delete expired `input_text` / `flagged_content` is pending.
- **Autoresearch loop (Plan C)** — agent-driven prompt iteration via git commit/reset; gated on a few manual harness runs first.

---

### Tier 6: Differentiation

- **Voice Moderation** — LiveKit Agents framework: silent observer joins rooms, runs STT (Deepgram/Whisper), pipes transcripts through AI content filter. Panic button, auto-mute, staff alerts.
- **Public Voice Rooms** — `is_public` flag on conversations. Admin-seeded persistent rooms ("Homework Hangout"). Student-created ad-hoc rooms (auto-close when empty).
- **Avatar Generation** — AI-generated avatars from trait selection. Schema ready (`avatar_source` enum on `profiles`: `roblox` / `ai` / `custom`); Roblox headshot auto-populates on link. Generation model + UI not implemented. Low priority.

---

## Compliance & Operations

COPPA 2025 amendments apply to this platform. Full analysis in `docs/coppa-research-2026-04.md`; DevOps-facing security audit in `docs/security-audit-2026-04.md`.

### Near-term ops

- **GitHub org migration** — move `adam-paul/alpha-anywhere-community` to the `superbuilders` org. Post-transfer: update git remotes, Cloudflare Pages deploy hooks, any CI referencing the old path.
- **Vendor DPAs** — signed data-processing agreements for Cloudflare, DigitalOcean, Timeback/EduBridge. AWS already covered via existing agreements.
- **AWS-for-PII policy** — DevOps policy "any applications storing student PII beyond simple directory information will be required to use AWS" would force a D1 → AWS migration. Pursuing an exception first via signed Cloudflare DPA + SOC 2 Type II; see the audit for the options analysis.

### COPPA gaps blocking production

- **Verifiable parental consent (VPC)** — no flow exists yet. Blocks production launch for under-13 users. Pairs with Parent Controls (tier 4).
- **Written data retention policy** — codify the existing 90-day TTL on moderation audit tables; extend explicit retention to messages, notifications, voice metadata.
- **Written information security program** — designated owner, annual risk assessment, documented vendor confirmations.
- **Separate VPC for third-party disclosures** — parent consent to collection doesn't automatically cover sharing. Two consents, not one.
- **Audit logging for PII access** — no access logs for PII reads currently.
- **Content expiry cron** — `content_expires_at` columns exist on audit tables; the scheduled Worker to delete expired `input_text` / `flagged_content` is pending (also listed under Tier 5).

### Voice-specific COPPA

Voiceprints are now explicitly PI under the 2025 rule, and real-time peer voice chat does not qualify for the narrow audio-file exception. Implications: (a) VPC required before voice-enabled participation; (b) audio retention must be explicit — current intent is no retention unless flagged for review. See `docs/voice-chat-discovery.md` §COPPA Considerations.

### IaC + tagging

- **SST** is already IaC for the LWAI proxy Lambda.
- **`wrangler.toml`** is declarative but not Terraform; policy may require wrapping Cloudflare resources in Terraform.
- **LiveKit on DigitalOcean** — manual provisioning today; needs codification or at least documented runbook.
- **Resource tagging** — add to SST config for AWS resources.

---

## Architecture Decisions

| Decision             | Choice                                                      | Rationale                                                                                                                                                                      |
| -------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Database**         | Cloudflare D1                                               | Edge-native, no cold starts, sufficient for MVP                                                                                                                                |
| **Sessions**         | HMAC-signed cookies                                         | Stateless, cross-subdomain (`.alpha-community.school`)                                                                                                                         |
| **Auth**             | Timeback SSO                                                | Already integrated, handles Cognito                                                                                                                                            |
| **Realtime**         | Durable Objects + WebSocket                                 | Hibernation API (cost-efficient), per-channel DO instances                                                                                                                     |
| **Realtime routing** | Separate Worker + custom domain                             | SvelteKit can't proxy WebSocket upgrades; Worker at `ws.alpha-community.school`                                                                                                |
| **Realtime URL**     | `PUBLIC_REALTIME_URL` env var                               | Configurable per environment; local dev points to `ws://localhost:8787`                                                                                                        |
| **Shared types**     | `@alpha/shared` workspace package                           | Cross-project contracts (WebSocket protocol, LWAI gating) — one home                                                                                                           |
| **Credentials**      | Encrypted D1 columns                                        | AES-256-GCM, app-level encrypt at write, decrypt at runtime                                                                                                                    |
| **Admin tools**      | Inline in existing pages                                    | No separate dashboard; admin sees student view plus admin controls                                                                                                             |
| **Arcade presence**  | Lobby DO broadcasts (primary) + KV + Roblox API (secondary) | Tile counts: `lobby:state` on `presence:global`, instant, no polling. In-lobby "who's in-game" panel: KV launch records (5-min TTL) + Roblox Presence API, informational only. |
| **Roblox linking**   | Manual username + avatar confirm                            | Soft verification only; OAuth upgrade path pending                                                                                                                             |
| **LWAI query**       | Lambda proxy (SST)                                          | CF Workers can't do STS AssumeRole                                                                                                                                             |
| **Gating state**     | Discriminated union store                                   | Eliminates boolean flag creep                                                                                                                                                  |
| **Notifications**    | D1 + WebSocket signal                                       | DB source of truth, `notification:push` on `presence:global` for real-time                                                                                                     |
| **Voice chat**       | Self-hosted LiveKit on DO                                   | Open source, $0 per-minute, full data sovereignty for COPPA, Agents for moderation                                                                                             |
| **Voice TLS**        | Caddy reverse proxy                                         | Auto Let's Encrypt, WebSocket upgrade support, simpler than nginx for this use case                                                                                            |
| **Voice rooms**      | One room at a time per user                                 | Safety: no side-channel cliques within game servers. Simplifies client state                                                                                                   |

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

#### Lobby Presence Broadcast Scaling

Lobby tile counts are derived from `currentLobby` state carried in each connection's `presence:global` attachment, with `lobby:state` broadcasts fanning out to every connected client on every enter/leave. Traffic is O(N) per event where N is total concurrent online users — trivial at current scale (hundreds). If N grows into the many-thousands and lobby-hopping is frequent, every user receives every lobby-change event including ones they don't care about. Fix options: (a) clients subscribe to a scoped `lobby:counts` stream instead of raw state, (b) DO only broadcasts `lobby:state` to clients that have registered interest. Not a current risk; documented here so the coupling shape is captured.

---

## Loose Ends

Small items that don't belong to a tier but need attention eventually.

- **Voice presence pulse doesn't persist across navigation** — The pulsing phone icon indicating an active voice call in a conversation only shows while the `voice:joined` broadcast is in-flight. Navigating away and returning drops it back to the plain icon because the conversation DO doesn't replay current voice state on connect. Fix options: (a) client pulls current LiveKit room participants via a small API endpoint on mount, (b) DO tracks voice participants in its per-conversation state and broadcasts a `voice:snapshot` on connect (mirrors the existing `presence:snapshot`). (b) is the right long-term answer; pair with voice moderation work.
- **Harden Roblox account linking** — Currently accepts any username with no verification. Soft-match only (avatar confirmation). "Create account" link added for students without Roblox. Linking flow resumes pending game launch on success. Still needs stronger identity proof.
- **Add Roblox OAuth** — Replace manual username entry with OAuth flow. Requires Roblox app review/approval.
- **Harden Roblox game launch/auth flow** — If the user isn't logged into Roblox, the deep link loses its params and lands on the Roblox home page (except on Windows). Needs detection or guidance for the user.
- **Production deploy** — Replicate preview environment in production Cloudflare Pages. Separate D1 database, set secrets, verify SSO callbacks, smoke test.
- **Codebase docs** — Developer-facing: API reference, component catalog, deployment guides. Evaluate Starlight, VitePress, or in-app `/docs` route.
- **Knowledge base** — Team-facing: specs, discovery docs, research, context dumps. Evaluate Obsidian, Notion, or similar. Currently scattered across `docs/` markdown files.

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
4. **Avatar generation:** Which image model? Cost?
