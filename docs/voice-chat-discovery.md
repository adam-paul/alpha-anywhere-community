# Voice Chat — Discovery & Architecture

Discovery doc for real-time voice chat in Alpha Anywhere Community. Captures decisions made, open questions, and the planned technical approach. Living document — update as implementation proceeds.

**Status:** Discovery complete, pre-implementation  
**Date:** April 2026  
**Related:** [Alpha Voice spec in brainlift](./alpha-anywhere-community-brainlift.md), [Notion: Voice Pods project](https://www.notion.so/2f52901d7908803eb675cbf4d6c05a10)

---

## Why Voice

Typing is too slow for cooperative gameplay. Rung 4 games (Trust Builders like Pizza Place, Build a Boat) and Rung 5 games (Rivalry like Arsenal) require real-time coordination. For 8-10 year olds especially, voice is the difference between meaningful cooperation and frustration.

Roblox restricts Spatial Voice to 13+ with ID verification. A significant portion of our student body is under 13. Alpha Voice is a browser-based sidecar that solves this — audio runs in the browser while Roblox plays fullscreen.

Beyond games, unstructured voice hanging out may be _more_ valuable than game voice for geographically isolated homeschool kids. The hallway, the lunch table, the bus ride — ambient social time that public school provides for free. Voice rooms that don't require a game give kids that space.

---

## Core Design Decisions

### One system, multiple surfaces

Voice is not a separate feature — it's a capability layered onto the existing conversation system. A voice session is just a conversation with an active RTC room. This means:

- No new entity to manage. Conversations already handle participants, permissions, and history.
- Permissions are already solved. Conversation participants = voice participants.
- Chat persists around voice sessions (links, screenshots while talking).
- Fits existing UI. Voice indicator on conversation items, "join call" button in chat header.

Voice shows up in two places with the same underlying infrastructure:

| Surface    | How it works                                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Arcade** | Each game server instance has an auto-provisioned voice room. Students see it on the server browser and join when they enter the game. |
| **Social** | Any conversation (1:1, group, public) can start a voice session on demand. "Hop on voice" from the chat.                               |

### Public and private via a single flag

Conversations gain an `is_public` flag (default false). Combined with voice, this produces four natural modes:

|             | No voice          | Active voice                       |
| ----------- | ----------------- | ---------------------------------- |
| **Private** | Normal group chat | Friend call / squad voice          |
| **Public**  | Open text channel | Drop-in voice room / "lunch table" |

- Discord-style voice channels = public + voice
- Discord-style DM calls = private + voice
- Admins can seed persistent public rooms ("Homework Hangout", "Game Night Friday")
- Students can create ad-hoc public rooms (auto-close when empty to prevent clutter)

### Game server instance rooms

Each Roblox private server instance gets its own voice room, auto-provisioned. We already control server assignment via access codes/link codes, so:

- Student picks a server from the server browser (sees player counts, who's in voice)
- Launching gives them the right deep link + voice room in one action
- Voice is scoped to the server instance, not the game — players on Server A can't hear Server B

### One room at a time, always

**Joining a game server = joining that server's voice room, leaving any other voice room.** This is a safety rule:

- Eliminates clique-within-a-game dynamics (no side channels excluding other players on the same server)
- Simplifies engineering (no multi-room mixing, no "which room am I in?" ambiguity)
- Clean mental model: you're in one voice room or none

Post-game behavior: **clean slate.** Leaving a game disconnects from voice entirely. The student can manually rejoin a social room from their chat list, but there's no auto-rejoin — it would be jarring after 45 minutes of gameplay.

---

## SDK Selection: LiveKit

### Why not the others

| SDK          | Verdict                                      | Reason                                                                                                                                                                                                                     |
| ------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agora**    | Too expensive at scale                       | $0.99/1K min. At 500 concurrent users: ~$2,400/mo. No self-host option. Audio routes through their global edge network — COPPA concern with children's voice data transiting third-party infrastructure.                   |
| **Daily.co** | Even more expensive, less moderation tooling | $4.00/1K min. At 500 concurrent users: ~$9,600/mo. No self-host option. Moderation capabilities are minimal.                                                                                                               |
| **LiveKit**  | Selected                                     | $0.40/1K min on cloud, $0 self-hosted. Open source. Agents framework enables real-time moderation. Self-hosting gives full data sovereignty for COPPA. Same APIs whether cloud or self-hosted — no code changes to switch. |

### LiveKit pricing comparison (audio-only, 4 hrs/day avg, 20 school days/mo)

| Concurrent users | Agora       | Daily       | LiveKit Cloud | LiveKit Self-Host      |
| ---------------- | ----------- | ----------- | ------------- | ---------------------- |
| 50               | ~$238/mo    | ~$960/mo    | ~$96/mo       | ~$18-24/mo (infra)     |
| 500              | ~$2,376/mo  | ~$9,600/mo  | ~$960/mo      | ~$100-200/mo (infra)   |
| 5,000            | ~$23,760/mo | ~$96,000/mo | ~$9,600/mo    | ~$500-1,500/mo (infra) |

### Plan

**Self-hosted from day one** on a DigitalOcean droplet. The cloud tier doesn't justify the per-minute cost or the data-sovereignty tradeoff when a $18/mo droplet handles early scale and gives full COPPA control. LiveKit Cloud remains a fallback if ops burden becomes an issue — same APIs, no code changes to switch.

---

## Why a Separate Server (Not Cloudflare)

Voice requires **UDP**. Every voice system uses UDP because a late audio packet is worse than a lost one — if packet #47 drops, you're already hearing #50, and TCP's insistence on retransmitting #47 before delivering #48-50 causes audible stuttering (head-of-line blocking).

Cloudflare Workers and Durable Objects **only handle HTTP and WebSocket (TCP)**. They cannot receive or send UDP packets. This is a platform constraint with no workaround.

> Cloudflare does have a product called Cloudflare Calls that provides low-level WebRTC relay. But it's a raw building block — no rooms, no permissions, no token auth, no participant management, no agents, no moderation hooks. Building LiveKit from scratch on top of it is not viable.

The VPS runs a **Selective Forwarding Unit (SFU)** — a process that receives UDP audio from each participant and selectively forwards it to everyone else in the room. This is what LiveKit Server is.

### Minimal VPS spec

LiveKit Server is a single Go binary (~50MB) with built-in TURN for NAT traversal.

| Scale              | Spec            | Cost (DigitalOcean) |
| ------------------ | --------------- | ------------------- |
| <50 concurrent     | 2 vCPU, 2GB RAM | ~$18/mo             |
| 50-200 concurrent  | 2 vCPU, 4GB RAM | ~$24/mo             |
| 200-500 concurrent | 4 vCPU, 8GB RAM | ~$48/mo             |

The moderation agent (STT + content filtering) runs on the same droplet as a second container. At early scale, everything fits on one machine.

---

## Architecture

```
Browser (Student)
  |
  | 1. "Join voice for BedWars Server 2" (HTTPS)
  v
+------------------------------------------+
|  Cloudflare (existing infrastructure)    |
|                                          |
|  SvelteKit API routes:                   |
|  - Verify auth (session cookie)          |
|  - Check voice_chat_enabled permission   |
|  - Create/find LiveKit room via API  ---------> 2. HTTP to LiveKit
|  - Mint LiveKit JWT token                |       (room lifecycle)
|  - Return token + server URL to client   |
|                                          |
|  Durable Objects (unchanged):            |
|  - Chat, presence, notifications         |
+------------------------------------------+
  |
  | 3. Token + URL returned
  v
Browser (Student)
  |
  | 4. Direct WebRTC/UDP connection (bypasses Cloudflare)
  v
+------------------------------------------+
|  DigitalOcean Droplet (new)              |
|                                          |
|  LiveKit Server:                         |
|  - Receives/forwards audio (UDP/SFU)    |
|  - Manages room state                   |
|  - Built-in TURN for NAT traversal      |
|                                          |
|  Moderation Agent:                       |
|  - Joins every room silently            |
|  - STT -> transcription -> AI filter    |
|  - Flags violations -----------------------> 5. Webhook to SvelteKit
+------------------------------------------+     (notification, mute, etc.)
```

### Four touchpoints between Cloudflare and the VPS

1. **Token minting** — SvelteKit API route checks auth/permissions, calls LiveKit server SDK to generate a JWT encoding: which room, participant identity, permissions (speak, listen, admin-mute). Simple HTTP call, ~10 lines of code.

2. **Room lifecycle** — SvelteKit API routes create/destroy rooms via LiveKit REST API. "Student joins BedWars Server 2" -> ensure room `game:bedwars:server-2` exists -> return token. Rooms auto-close on configurable empty timeout.

3. **Client audio** — Browser loads LiveKit JS SDK (~100KB), connects directly to the droplet via WebRTC. Audio flows browser <-> droplet. Cloudflare never sees or touches audio data. Good for COPPA — the main application doesn't process voice.

4. **Webhooks** — LiveKit sends webhooks on events (participant joined/left, room closed, moderation flags). These hit SvelteKit API routes on Cloudflare to update presence, send notifications, handle moderation alerts.

**Key principle:** Cloudflare decides _who can talk to whom_. The droplet _makes the talking happen_.

### What changes in the SvelteKit app

- New API routes: `/api/voice/token`, `/api/voice/webhook` (plus room management helpers)
- LiveKit JS client integration in arcade and chat UI components
- Voice state in a new `voice.svelte.ts` store
- Estimated ~500 lines of new code in the SvelteKit app

### What stays the same

- Text chat stays on Durable Objects
- Presence stays on Durable Objects (augmented with voice status from webhooks)
- Notifications stay on existing system (voice events create notifications via webhooks)
- Auth, gating, everything else — unchanged

A student in a game might have both a WebSocket to the Durable Object (for chat/presence) and a WebRTC connection to the droplet (for voice) simultaneously. They coexist cleanly.

---

## Moderation Architecture

### The "silent observer" pattern

A LiveKit Agent joins every voice room as an invisible participant. It:

1. Subscribes to all audio tracks in the room
2. Runs real-time speech-to-text (Deepgram, AssemblyAI, or Whisper)
3. Pipes transcripts through content moderation (can reuse existing AI moderation pipeline)
4. On policy violation: server-side mute, webhook to SvelteKit (notification to admins, log incident), or remove participant

This is a first-class pattern in LiveKit's Agents framework, not a hack.

### Safety layers (from brainlift, preserved)

1. **Panic button** — prominent Report/Flag button in the voice UI. Instantly mutes the offender for the reporter, timestamps the moment for staff review.
2. **AI content filtering** — real-time transcription scanned for bullying, aggression, inappropriate language. Auto-flags to admins.
3. **Observer effect** — visible indicator that sessions are monitored. Students are not anonymous. Self-moderation through accountability.
4. **Parent toggle** — `voice_chat_enabled` per-student permission (already exists in LMS, needs to be added to this app's profile/settings).

### Audio retention policy (COPPA)

**Default: don't retain audio.** Transcripts processed in real-time and discarded unless flagged. Flagged segments retained for staff review with auto-deletion after review period. This minimizes the data surface for COPPA compliance.

---

## COPPA Considerations

The [amended COPPA rule](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions) (full compliance deadline: April 2026) explicitly includes **voiceprints as biometric identifiers**.

- No voice SDK handles COPPA for you — compliance is the operator's responsibility.
- Self-hosting LiveKit is the strongest posture: full control over where audio data transits and whether it's stored.
- Required: verifiable parental consent before enabling voice (the `voice_chat_enabled` toggle, activated by parent).
- Required: clear privacy policy covering voice data collection, processing, and retention.
- Legal review recommended before launch.

---

## Cross-Project Reuse

This voice system is needed for both Alpha Anywhere Community (this project, SvelteKit/Cloudflare) and the LMS (The Hive, Django). Because the VPS is independent infrastructure:

- Both apps can mint LiveKit tokens from their respective backends
- Both connect to the same LiveKit server (or separate instances if isolation is preferred)
- The moderation agent is shared infrastructure
- Room namespacing keeps them separate (`community:game:bedwars:server-2` vs `hive:arcade:bedwars:server-1`)

This aligns with the Notion April priorities: "Voice/Video pods (Modular/reusable for Agora)" — substitute LiveKit for Agora, but the modularity goal is the same.

---

## Open Questions

1. **Max participants per voice room** — What's the right cap? Discord limits DM group calls to 25. Game servers have natural caps (e.g., 4-player Roblox server). Public "hangout" rooms may need a higher limit.
2. **Public room creation permissions** — Anyone can create public rooms, or admins only? Middle ground: anyone can create, auto-close after N minutes empty.
3. **Video** — Audio-only for now. Video is a natural extension (same SDK, same rooms, just enable video tracks). Not in scope for initial implementation.
4. **Push-to-talk vs open mic** — Open mic with noise suppression is simpler UX. Push-to-talk is safer for younger kids (no accidental broadcasts of household noise). Could be a per-student setting.
5. **Moderation agent STT provider** — Deepgram (fast, cheap), AssemblyAI (accurate), Whisper (self-hostable). Need to evaluate latency and cost for real-time use.
6. **Voice UI design** — Floating overlay? Inline in the arcade? Sidebar panel? Needs design mockups.

---

## Implementation Sequence (rough)

1. **Infrastructure** — DigitalOcean droplet with LiveKit Server + Docker. Validate the deployment, TURN connectivity, and basic room creation.
2. **Proof of concept** — Two users in a self-hosted room via the browser. Validate audio quality, latency, browser support. No UI, just a test page.
3. **Token server** — SvelteKit API route that mints LiveKit tokens. Integrate with existing auth.
4. **Voice store + basic UI** — `voice.svelte.ts` store, join/leave buttons, participant list, mute controls.
5. **Game integration** — Auto-provision rooms per server instance. Wire into server browser + game launch flow.
6. **Social voice** — "Start call" button in chat conversations. Voice indicators in conversation list.
7. **Moderation agent** — Silent observer with STT + content filtering. Webhook integration for alerts.
8. **Public rooms** — `is_public` flag on conversations, discovery UI, admin-seeded persistent rooms.

---

## References

- [LiveKit Pricing](https://livekit.io/pricing)
- [LiveKit Agents Framework](https://docs.livekit.io/agents/)
- [LiveKit JS Client SDK](https://docs.livekit.io/references/js/)
- [LiveKit STT Models](https://docs.livekit.io/agents/models/stt/)
- [COPPA FAQ (FTC)](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)
- [Agora Pricing](https://www.agora.io/en/pricing/) (evaluated, not selected)
- [Daily.co Pricing](https://www.daily.co/pricing/video-sdk/) (evaluated, not selected)
