# LMS → AAC Feature Handoff

> Mapping of features built in the AlphaLearn LMS codebase to the Alpha Anywhere Community (AAC) codebase. Identifies what AAC has, what it's missing, and what needs to be built to reach parity.
>
> **Date:** 2026-03-06
> **Author:** notadampaul + Claude

---

## Architecture Comparison

|                | AlphaLearn LMS                                           | Alpha Anywhere Community                                 |
| -------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| **Frontend**   | React 18, TypeScript, TanStack Query, Radix UI, Tailwind | SvelteKit 5 (runes), TypeScript, Tailwind                |
| **Backend**    | Django 4.2, DRF, PostgreSQL, Celery+Redis                | Cloudflare D1 (SQLite), Workers, SvelteKit server routes |
| **Real-time**  | Django Channels (Daphne) + Redis pub/sub                 | None yet                                                 |
| **Auth**       | AWS Cognito + JWT (SimpleJWT)                            | AWS Cognito SSO + HMAC-signed cookies                    |
| **Infra**      | AWS (Cognito, S3, Lambda), Celery Beat                   | Cloudflare (Pages, D1, Workers), AWS Lambda (LWAI proxy) |
| **Encryption** | AES-256-GCM (Django crypto.py)                           | AES-256-GCM (Web Crypto API, crypto.ts)                  |
| **State mgmt** | TanStack Query + React Context                           | Svelte runes + context API                               |

**Key architectural difference:** LMS has a full Django backend with PostgreSQL, Celery workers, and Django Channels for real-time. AAC runs entirely on Cloudflare edge — no persistent server process, no WebSocket layer, no background job runner. This means features that rely on background tasks or persistent connections need different approaches in AAC.

---

## Feature-by-Feature Comparison

### 1. Arcade / Game Catalog

| Capability                                                 | LMS                              | AAC                      | Gap                    |
| ---------------------------------------------------------- | -------------------------------- | ------------------------ | ---------------------- |
| Game model with types (roblox/minecraft/web/iframe)        | Yes                              | Yes                      | None                   |
| Engagement categories (5-rung ladder)                      | Yes                              | Yes                      | None                   |
| Encrypted private server credentials (AES-256-GCM)         | Yes                              | Yes                      | None                   |
| Game CRUD API                                              | Yes (admin endpoint)             | Seed script only         | **Need admin API**     |
| Sort ordering / reorder                                    | Yes (batch reorder API)          | Yes (DB field)           | **Need reorder API**   |
| Roblox metadata lookup (fetch title/thumbnail from Roblox) | Yes                              | No                       | **Need Roblox lookup** |
| Conditional launch data (access gating)                    | Yes (full vs public serializers) | Yes (server-side gating) | None                   |
| Category metadata endpoint                                 | Yes                              | No (hardcoded in client) | Minor                  |

**Summary:** Game catalog is at parity. AAC is missing the admin management APIs (CRUD, reorder, Roblox lookup) — games are currently managed via seed scripts only.

---

### 2. Game Presence ("X Playing")

| Capability                             | LMS                        | AAC | Gap                       |
| -------------------------------------- | -------------------------- | --- | ------------------------- |
| Launch recording (POST on Play click)  | Yes                        | No  | **Need launch endpoint**  |
| Roblox Presence API polling            | Yes (in REST endpoint)     | No  | **Need presence polling** |
| Launch-record + presence-type hybrid   | Yes                        | No  | **Need full system**      |
| Redis launch records with TTL          | Yes (5-min TTL, refreshed) | No  | **Need cache layer**      |
| REST polling for counts (30s interval) | Yes (TanStack Query)       | No  | **Need polling hook**     |
| Player count badge on game cards       | Yes                        | No  | **Need UI**               |

**Summary:** Game presence is entirely missing from AAC. The LMS implementation uses a launch-record + Roblox presence-type hybrid (because the Roblox API doesn't return `placeId` with API key auth). AAC will need: (1) a launch recording endpoint, (2) a presence polling endpoint that cross-references Roblox `userPresenceType == 2` with launch records, (3) a caching layer (KV or D1), and (4) frontend polling + UI.

**AAC consideration:** Without Celery/Redis, presence polling needs to be demand-driven (called by client REST requests) with Cloudflare KV or D1 as the cache layer instead of Redis.

---

### 3. Work-Wall / Gating

| Capability                           | LMS                   | AAC                                   | Gap          |
| ------------------------------------ | --------------------- | ------------------------------------- | ------------ |
| Weekly minutes threshold (300 min)   | Yes (via LWAI Lambda) | Yes (dual-source: LWAI + Timeback XP) | None         |
| Progress ring UI                     | Yes                   | Yes                                   | None         |
| Work-wall blocking overlay           | Yes                   | Yes                                   | None         |
| LWAI/CoachBot integration            | Yes                   | Yes                                   | None         |
| Dual gating source (LWAI + Timeback) | No (LWAI only)        | Yes                                   | AAC is ahead |
| Dev tools for gating override        | No                    | Yes                                   | AAC is ahead |

**Summary:** AAC is actually ahead here — it supports dual gating sources (LWAI minutes + Timeback XP) with auto-detection, plus dev tools for testing. LMS only uses LWAI.

---

### 4. Profiles

| Capability                                     | LMS                      | AAC                 | Gap                          |
| ---------------------------------------------- | ------------------------ | ------------------- | ---------------------------- |
| Basic profile (avatar, display name, bio)      | Yes                      | Yes                 | None                         |
| Username system with uniqueness check          | Yes                      | No                  | **Need username system**     |
| Theme presets (8 visual themes)                | Yes                      | No                  | **Need themes**              |
| About-me font/background styling               | Yes                      | No                  | **Need styling options**     |
| Interests (curated list, multi-select)         | Yes                      | Yes (23 categories) | None                         |
| Location (Google Places validated)             | Yes (parent-set)         | Yes (user-set)      | Different model              |
| Age band / level badges (L1/L2/MS/HS)          | Yes                      | No                  | **Need age bands**           |
| Onboarding progress tracking                   | Yes (milestones)         | No                  | **Need onboarding flow**     |
| Profile guided tour                            | Yes                      | No                  | **Need tour**                |
| Profile visibility toggles (parent-controlled) | Yes (granular per-field) | No                  | **Need visibility controls** |
| Cover image                                    | No                       | Yes (in schema)     | LMS is behind                |

**Summary:** LMS has a more mature profile system with onboarding, themes, styling, age bands, and parent-controlled visibility. AAC has the basic schema but is missing the social polish and parental controls.

---

### 5. Avatar Generation

| Capability           | LMS                      | AAC | Gap                 |
| -------------------- | ------------------------ | --- | ------------------- |
| AI avatar generation | Yes (with rate limiting) | No  | **Need avatar gen** |
| Avatar crop/save     | Yes                      | No  | **Need crop flow**  |
| Avatar history       | Yes                      | No  | **Need history**    |

**Summary:** AI avatar generation is entirely missing from AAC.

---

### 6. Roblox Account Linking

| Capability                      | LMS | AAC | Gap                   |
| ------------------------------- | --- | --- | --------------------- |
| Roblox username lookup API      | Yes | No  | **Need lookup**       |
| Link/unlink Roblox account      | Yes | No  | **Need link/unlink**  |
| Store roblox_user_id on profile | Yes | No  | **Need DB field**     |
| Roblox avatar URL fetching      | Yes | No  | **Need avatar fetch** |
| Linking modal in arcade         | Yes | No  | **Need UI**           |

**Summary:** Roblox account linking is entirely missing from AAC. This is a prerequisite for game presence tracking. The LMS implementation stores `roblox_user_id`, `roblox_username`, and `roblox_avatar_url` on `StudentProfile`.

---

### 7. Friends System

| Capability                                                        | LMS                    | AAC               | Gap                    |
| ----------------------------------------------------------------- | ---------------------- | ----------------- | ---------------------- |
| Friend request model (pending/accepted/ignored/cancelled/expired) | Yes                    | Yes (schema only) | **Need API**           |
| 30-day request expiry                                             | Yes                    | No                | **Need expiry logic**  |
| Accept/ignore/cancel actions                                      | Yes (full API)         | No                | **Need API endpoints** |
| Friends list                                                      | Yes                    | No                | **Need API + UI**      |
| Mutual friends                                                    | Yes (API + UI preview) | No                | **Need API + UI**      |
| Friend request button component                                   | Yes                    | No                | **Need UI**            |
| Canonical friendship edge (user1.id < user2.id)                   | Yes                    | Yes (in schema)   | None                   |

**Summary:** AAC has the database schema for friendships but zero API endpoints or UI. LMS has a complete friend system with request lifecycle, mutual friends, and UI components.

---

### 8. Blocking

| Capability                         | LMS | AAC | Gap                       |
| ---------------------------------- | --- | --- | ------------------------- |
| Block/unblock API                  | Yes | No  | **Need API**              |
| Auto-remove friendship on block    | Yes | No  | **Need side effects**     |
| Cancel pending requests on block   | Yes | No  | **Need side effects**     |
| Bidirectional visibility filtering | Yes | No  | **Need discovery filter** |
| Parent notifications on block      | Yes | No  | **Need notification**     |
| Block list UI                      | Yes | No  | **Need UI**               |

**Summary:** Blocking is entirely missing from AAC beyond the DB schema. LMS has a complete implementation including cascading side effects and parent notifications.

---

### 9. Discovery / Explore

| Capability                      | LMS               | AAC                            | Gap                    |
| ------------------------------- | ----------------- | ------------------------------ | ---------------------- |
| Student grid with profile cards | Yes               | Yes                            | None                   |
| Search by name/bio/interests    | Yes               | Yes                            | None                   |
| Filter by interest              | Yes               | Yes                            | None                   |
| Interactive map view            | Yes (Google Maps) | Stubbed (UI exists, not wired) | **Need map backend**   |
| Location-based filtering        | Yes               | No                             | **Need geo queries**   |
| Age-appropriate matching        | Yes               | No                             | **Need age filtering** |
| Block-aware filtering           | Yes               | No                             | **Need block filter**  |
| Pagination                      | Yes               | No                             | **Need pagination**    |

**Summary:** Basic explore grid works in both. LMS has more sophisticated filtering (location, age, blocks) and a working map view. AAC has the map UI stubbed but not connected.

---

### 10. Real-Time Presence (Online Status)

| Capability                               | LMS                   | AAC | Gap                        |
| ---------------------------------------- | --------------------- | --- | -------------------------- |
| WebSocket presence consumer              | Yes (Django Channels) | No  | **Need WS layer**          |
| Online user tracking (Redis-backed)      | Yes (75s TTL)         | No  | **Need presence store**    |
| Presence circles / indicators            | Yes                   | No  | **Need UI**                |
| Location updates (which page user is on) | Yes                   | No  | **Need location tracking** |
| Heartbeat/keepalive protocol             | Yes (30s ping/pong)   | No  | **Need protocol**          |
| Exponential backoff reconnection         | Yes                   | No  | **Need reconnection**      |
| Global presence provider (React Context) | Yes                   | No  | **Need state provider**    |

**Summary:** Real-time presence is entirely missing from AAC. This is a significant architectural challenge because Cloudflare Workers don't natively support long-lived WebSocket connections the way Django Channels + Daphne does. AAC will need to use Cloudflare Durable Objects or an external WebSocket service (e.g., Partykit, Ably, Pusher).

---

### 11. Chat / Direct Messaging

| Capability                                     | LMS | AAC                  | Gap                     |
| ---------------------------------------------- | --- | -------------------- | ----------------------- |
| Chat UI (conversation list, threads, composer) | No  | Yes (fully built)    | LMS is behind           |
| Message persistence (DB)                       | No  | Schema ready, no API | **Need API**            |
| Real-time messaging                            | No  | No                   | **Need real-time**      |
| Group conversations                            | No  | Schema ready         | **Need implementation** |
| Message moderation                             | No  | Schema ready (flags) | **Need moderation**     |
| Unread tracking                                | No  | Schema ready         | **Need implementation** |

**Summary:** AAC is actually ahead on chat — it has a complete chat UI with conversation list, message threads, composer, and new-chat modal. It just needs backend persistence and real-time delivery. LMS has no chat implementation at all.

---

### 12. Content Moderation

| Capability                                        | LMS                              | AAC             | Gap                         |
| ------------------------------------------------- | -------------------------------- | --------------- | --------------------------- |
| Dual-model AI moderation (Gemini + OpenAI)        | Yes                              | No              | **Need moderation service** |
| Moderation flag model                             | Yes                              | Yes (DB schema) | **Need API**                |
| Severity levels (low/medium/high/critical)        | Yes                              | Yes (in schema) | None                        |
| Auto-escalation thresholds                        | Yes (3+ PII, 3+ harmful, 5+ any) | No              | **Need escalation logic**   |
| Self-harm detection + immediate escalation        | Yes                              | No              | **Need safety protocol**    |
| Admin moderation queue                            | Yes (full UI + API)              | No              | **Need admin UI**           |
| Review/dismiss workflow                           | Yes                              | No              | **Need workflow**           |
| Moderation statistics dashboard                   | Yes                              | No              | **Need stats**              |
| COPPA-compliant content expiration (90-day)       | Yes (Celery task)                | No              | **Need expiration job**     |
| Fail-closed design (if AI fails, content blocked) | Yes                              | No              | **Need safety design**      |

**Summary:** Content moderation is one of the largest gaps. LMS has a sophisticated dual-model pipeline with escalation thresholds, admin tooling, and COPPA compliance. AAC has the DB schema ready but no implementation.

**AAC consideration:** Without Celery, COPPA content expiration could be handled by a Cloudflare Cron Trigger (Workers scheduled events).

---

### 13. Event Logging / Audit Trail

| Capability                                   | LMS                   | AAC | Gap                   |
| -------------------------------------------- | --------------------- | --- | --------------------- |
| Immutable event log (append-only)            | Yes                   | No  | **Need event system** |
| Dot-notation event types                     | Yes                   | No  | **Need taxonomy**     |
| Actor/target/resource model                  | Yes                   | No  | **Need schema**       |
| Severity levels                              | Yes                   | No  | **Need levels**       |
| COPPA-compliant sensitive content expiration | Yes                   | No  | **Need expiration**   |
| Parent event feed                            | Yes (API + filtering) | No  | **Need parent view**  |
| Admin event viewer + CSV export              | Yes                   | No  | **Need admin UI**     |

**Summary:** Event logging/audit trail is entirely missing from AAC. This is critical for COPPA compliance and parent transparency.

---

### 14. Parent Controls & Settings

| Capability                                                 | LMS | AAC | Gap                     |
| ---------------------------------------------------------- | --- | --- | ----------------------- |
| Parent settings model (community_enabled, feature toggles) | Yes | No  | **Need settings model** |
| Terms of Service acceptance flow                           | Yes | No  | **Need ToS flow**       |
| Feature toggles (arcade, voice, messaging)                 | Yes | No  | **Need toggles**        |
| Profile visibility toggles (per-field)                     | Yes | No  | **Need visibility**     |
| Parent notification preferences                            | Yes | No  | **Need preferences**    |
| Parent-student relationship model                          | Yes | No  | **Need relationship**   |
| Age band data (birth year → level)                         | Yes | No  | **Need age data**       |
| Parent location setting (Google Places)                    | Yes | No  | **Need location flow**  |
| Student access check endpoint                              | Yes | No  | **Need access API**     |

**Summary:** Parent controls are entirely missing from AAC. The LMS has a complete parent permission system with granular feature toggles, visibility controls, and notification preferences. This is a prerequisite for production launch with minors.

---

### 15. Admin Features

| Capability                             | LMS                 | AAC | Gap                      |
| -------------------------------------- | ------------------- | --- | ------------------------ |
| Admin game management (CRUD + reorder) | Yes (full UI + API) | No  | **Need admin arcade**    |
| Admin Roblox metadata lookup           | Yes                 | No  | **Need lookup**          |
| Admin user list                        | Yes                 | No  | **Need user management** |
| Admin event log viewer + export        | Yes                 | No  | **Need event viewer**    |
| Admin moderation queue                 | Yes                 | No  | **Need mod queue**       |
| Admin flag review/dismiss              | Yes                 | No  | **Need review workflow** |
| Admin moderation statistics            | Yes                 | No  | **Need stats**           |

**Summary:** Admin tooling is entirely missing from AAC. LMS has a complete admin panel for games, users, events, and moderation.

---

## Gap Summary by Priority

### P0 — Required for Production with Minors

These are non-negotiable for launching a community product used by children:

| Feature                         | Effort | Notes                                                                 |
| ------------------------------- | ------ | --------------------------------------------------------------------- |
| **Content Moderation Pipeline** | Large  | Dual-model AI, escalation, fail-closed. Can reuse LMS service design. |
| **Parent Controls & Settings**  | Large  | Feature toggles, visibility, ToS. Foundation for all gated features.  |
| **Event Logging / Audit Trail** | Medium | Immutable log, COPPA expiration. Use Cloudflare Cron for expiry.      |
| **Blocking**                    | Medium | Block/unblock with cascading side effects. Schema exists.             |

### P1 — Required for Feature Parity

| Feature                     | Effort       | Notes                                                                 |
| --------------------------- | ------------ | --------------------------------------------------------------------- |
| **Friends System**          | Medium       | Schema exists. Need API + UI.                                         |
| **Admin Arcade Management** | Medium       | CRUD + reorder + Roblox lookup. Replace seed scripts.                 |
| **Roblox Account Linking**  | Small-Medium | Lookup + link/unlink + profile fields. Prerequisite for presence.     |
| **Game Presence**           | Medium       | Launch records + Roblox polling. Use KV instead of Redis.             |
| **Real-Time Presence**      | Large        | Needs architectural decision: Durable Objects vs external WS service. |
| **Profile Enhancements**    | Medium       | Usernames, themes, age bands, onboarding, visibility toggles.         |

### P2 — Nice to Have / Can Defer

| Feature                              | Effort | Notes                                                   |
| ------------------------------------ | ------ | ------------------------------------------------------- |
| **Chat Backend**                     | Large  | UI exists. Need persistence + real-time + moderation.   |
| **AI Avatar Generation**             | Medium | Rate-limited generation + crop + history.               |
| **Discovery Enhancements**           | Medium | Map view, location filtering, age matching, pagination. |
| **Admin Users/Events/Moderation UI** | Medium | Full admin panel. Can be built incrementally.           |

---

## Architectural Decisions Needed for AAC

### 1. Real-Time Communication

LMS uses Django Channels + Daphne + Redis. AAC on Cloudflare needs a different approach:

- **Cloudflare Durable Objects** — Native, but complex. Good for presence + chat.
- **Partykit** — Built on Durable Objects, simpler API. Good fit for real-time features.
- **External service** (Ably, Pusher, Livekit) — Managed, but adds dependency.

This decision affects: presence, chat, game presence updates, and future voice/video.

### 2. Background Jobs

LMS uses Celery Beat for scheduled tasks (COPPA expiration, presence polling). AAC options:

- **Cloudflare Cron Triggers** — Built-in, runs Workers on schedule. Good for expiration jobs.
- **Client-driven polling** — REST endpoints triggered by frontend (current game presence approach in LMS). Good for demand-driven tasks.

### 3. Caching Layer

LMS uses Redis for caching (game presence, launch records). AAC options:

- **Cloudflare KV** — Global, eventually consistent. Good for game presence counts.
- **D1** — Already in use. Good for launch records that need consistency.
- **In-memory (Durable Objects)** — If using DOs for real-time, can co-locate cache.

### 4. Content Moderation

LMS calls Gemini + OpenAI APIs from Django. AAC can:

- **Call from Workers** — Direct API calls from Cloudflare Workers. Simple, but adds latency.
- **Workers AI** — Cloudflare's built-in AI. May not have moderation-specific models.
- **Proxy through existing LWAI Lambda** — Reuse infra, but couples to AWS.

---

## What AAC Has That LMS Doesn't

Worth noting features where AAC is ahead:

| Feature                                     | Notes                                                 |
| ------------------------------------------- | ----------------------------------------------------- |
| **Dual gating source** (LWAI + Timeback XP) | LMS only uses LWAI                                    |
| **Gating dev tools**                        | Override gating state for testing                     |
| **Chat UI**                                 | Complete conversation UI (just needs backend)         |
| **Cover images** on profiles                | LMS profiles don't have cover images                  |
| **Edge deployment** (Cloudflare)            | Lower latency, no server management                   |
| **Multi-game support** beyond Roblox        | Architecture supports Minecraft, web, iframe natively |
| **Gating source auto-detection**            | Probes LWAI, falls back to Timeback automatically     |

---

## Recommended Sequencing

Based on the Hive project board priorities for March 2026:

1. **Roblox Account Linking** (already planned) → unblocks game presence
2. **Game Presence** → quick win after linking, visible user value
3. **Friends API** → schema exists, medium effort, high social value
4. **Content Moderation** → blocks chat launch, start early
5. **Chat Backend** → UI already built, wire up persistence + moderation
6. **Parent Controls** → required before wider beta
7. **Admin Tooling** → build incrementally alongside features
8. **Real-Time Presence** → large effort, schedule after architectural decision
