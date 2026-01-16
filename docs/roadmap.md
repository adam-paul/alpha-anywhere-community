# Alpha Anywhere Community: Roadmap

**Last updated:** 2026-01-15

This document outlines what's been built, what's missing, and the recommended build order to take the Community from prototype to production.

---

## Current State

The frontend is production-quality with complete UI flows for all core features. Everything runs against mock data — no backend, no persistence, no real authentication.

### What's Built

| Feature | Status | Location |
|---------|--------|----------|
| Arcade | Complete | `/arcade` — 12 games, 5 engagement categories, filtering, player counts |
| Work Wall | Complete | Integrated in arcade — XP gating, progress ring, lock/unlock states |
| Student Profiles | Complete | `/profile/[id]` — avatar, cover, bio, interests, stats, mutual friends |
| Explore/Discovery | Complete | `/explore` — search, filter by 23 interests, responsive grid |
| Chat System | Complete | `/chat` — 1:1 and group chats, threads, composer, new chat modal |
| UI Components | Complete | Button, Card, Badge, Avatar, Icon, Select with variant/token system |
| Timeback SSO | Integrated | `src/lib/server/timeback.ts` — needs credentials to activate |
| Design Tokens | Complete | `src/lib/styles/tokens.css` — colors, spacing, typography, radii |
| Theme System | Complete | Cel-shaded theme applied via `data-theme` attribute |

### What's Missing

| Feature | Status | Notes |
|---------|--------|-------|
| Real Authentication | Not active | SSO code exists, needs Timeback credentials |
| Real Gating Data | Not connected | Hardcoded 120 XP; needs LWAI/Timeback API |
| Game Launch | Incomplete | Logs to console; doesn't open Roblox |
| Data Persistence | None | All state is in-memory, resets on refresh |
| Student Map | Placeholder | UI exists, shows "Coming soon" |
| Profile Editing | None | Profiles are read-only |
| Friend System | None | Mutual friends shown but no request flow |
| Real-time Presence | None | No "who's online" functionality |
| AI Chat Moderation | None | No content filtering |
| Parent Controls | None | No ToS, no per-child toggles |
| Staff Dashboard | None | No escalation workflow |
| Alpha Voice | None | Browser RTC not started |
| Avatar Generation | None | AI avatar system not started |

---

## Build Order

### Tier 1: Make It Real

**Goal:** Transform the prototype into a functioning app with real users and real data.

#### 1.1 Activate Timeback SSO

**What:** Enable real authentication via Timeback credentials.

**Current state:**
- SSO integration code exists in `src/lib/server/timeback.ts`
- Uses `timeback` npm package
- Session management in place
- UI shows sign-in button when logged out

**Work required:**
- Obtain Timeback client credentials (AWS Cognito)
- Configure environment variables
- Test auth flow end-to-end
- Handle session expiry/refresh

**Dependencies:** Timeback credentials from Amanda

---

#### 1.2 Connect Gating to Real XP Data

**What:** Replace hardcoded 120 XP with real learning progress from LWAI or Timeback.

**Current state:**
- `src/lib/stores/arcade.svelte.ts` manages `gatingState`
- Work wall renders based on `isUnlocked`, `xpCurrent`, `xpRequired`
- Dev tools allow manual XP adjustment for testing

**Work required:**
- API endpoint to fetch student's current XP (daily or weekly)
- Determine data source: LWAI (4hr sync) vs Timeback (real-time)
- Handle the weekly vs daily toggle (AB test mentioned in meetings)
- Cache/refresh strategy for XP data

**Key decision:** 120 XP flat threshold confirmed as interim. Weekly unlock preferred over daily (high schoolers plan weekly).

**Dependencies:** LWAI database access (Amanda getting IAM user)

---

#### 1.3 Game Launch

**What:** Make game cards actually open Roblox (or other platforms).

**Current state:**
- `GameCard.svelte` emits `play` event with game data
- `arcade/+page.svelte` handles event, currently logs to console
- Games have `launchUrl` field with deep link format

**Work required:**
- Implement `window.open()` or `location.href` for deep links
- Handle different game types (Roblox, Minecraft, web)
- Test Roblox deep link format: `roblox://placeId=XXX&gameInstanceId=YYY`
- Consider confirmation modal before launch
- Track launch events for analytics

**Open question:** Does Roblox deep link work reliably across platforms? Needs validation.

---

#### 1.4 Basic Persistence

**What:** Store user data and chat messages so they survive page refresh.

**Current state:**
- All data in `src/lib/mock-data.ts`
- Chat messages stored in memory via store
- No database connection

**Work required:**
- Set up database (Postgres on Cloudflare or Neon)
- Define schema: users, profiles, conversations, messages
- API routes for CRUD operations
- Migrate mock data structure to real schema
- Connect stores to API instead of mock data

**Architecture decision:** Cloudflare Pages + D1 (SQLite) or external Postgres?

---

### Tier 2: Core Social Features

**Goal:** Enable real social interactions — seeing who's online, connecting with friends, finding nearby students.

#### 2.1 Real-time Presence

**What:** Show who's online across the app.

**Where it appears:**
- Sidebar: online friends list
- Explore: online indicator on student cards
- Arcade: "X students playing" with real counts
- Chat: online status in conversation list

**Work required:**
- WebSocket or Cloudflare Durable Objects for presence
- Heartbeat mechanism (user is "online" if active in last 5 min)
- Presence state in user store
- UI updates: green dot on avatars, online counts

**Stretch:** Show which game a student is currently in (requires Roblox integration)

---

#### 2.2 Friend System

**What:** Allow students to send/accept friend requests and build a social graph.

**Current state:**
- `Student` type has `mutualFriendIds` array
- `MutualFriends.svelte` displays shared connections
- No request/accept flow

**Work required:**
- Database tables: friendships (user_id, friend_id, status, created_at)
- API: send request, accept, decline, unfriend
- UI: "Add Friend" button on profiles
- Notifications: friend request received
- Update mutual friends to use real data

---

#### 2.3 Profile Editing

**What:** Let students customize their own profile.

**Current state:**
- `ProfileHeader.svelte` displays profile data
- All fields are read-only
- No edit mode or form

**Work required:**
- Edit mode toggle on own profile
- Form for: bio, interests, location (city-level)
- Image upload for avatar and cover (or defer to avatar gen)
- API: update profile endpoint
- Validation: bio length limits, appropriate content

**Decision:** Avatar upload vs AI generation? Meetings suggest AI-generated from clickable prompts.

---

#### 2.4 Student Map

**What:** Geographic visualization of where students are located.

**Current state:**
- `/explore` has view toggle (grid/map)
- Map view shows `Placeholder` component with "Coming soon"
- Students have `location` field (city, state format)

**Work required:**
- Geocode student locations to lat/lng (or store coordinates)
- Map component (Mapbox, Leaflet, or simple SVG)
- Privacy: city-level only, no street addresses
- "Students near me" filtering
- Cluster markers when zoomed out

**Priority note:** High priority per meetings — parents constantly ask "who else is in my area?"

---

### Tier 3: Safety & Trust

**Goal:** Build the moderation and parental oversight systems required for a safe kid environment.

#### 3.1 AI Chat Moderation

**What:** Automatically flag inappropriate messages before they're seen.

**Current state:**
- Messages flow through `chat.svelte.ts` store
- No content filtering

**Work required:**
- Integrate OpenAI moderation endpoint (decided in meetings)
- Check messages on send, before persistence
- Flag categories: harassment, hate, self-harm, sexual, violence
- Flagged messages: hold for review or show warning?
- Store moderation results with message

**Decision:** Block flagged messages outright, or deliver with flag for staff review?

---

#### 3.2 Parent Controls MVP

**What:** Give parents control over their child's Community access.

**Scope (from brainlift):**
- Terms of Service acceptance (gate)
- Master toggle: enable/disable Community per child
- Granular controls: location sharing, voice chat, etc.

**Work required:**
- Parent account linking (via AlphaLearn?)
- ToS acceptance flow (first-time modal)
- Settings UI in parent dashboard
- Per-child feature flags in database
- Check flags before rendering features

**Decision:** Don't rebuild parent portal — link to AlphaLearn's existing one for now. Just add Community-specific toggles.

---

#### 3.3 Staff Escalation Dashboard

**What:** Internal tool for staff to review flagged content and take action.

**Work required:**
- Protected route (staff role check)
- Queue of flagged messages with context
- Actions: dismiss, warn user, suspend user
- Audit log of actions taken
- Parent notification when their child's message is flagged

**Scope:** Start simple — a table of flagged items with action buttons. Iterate based on volume.

---

### Tier 4: Differentiation

**Goal:** Features that make Alpha Anywhere Community unique and high-value.

#### 4.1 Alpha Voice

**What:** Browser-based voice chat so under-13 students can coordinate during games.

**Why:** Roblox restricts voice to 13+ with ID verification. Many Alpha students are younger.

**Architecture (from brainlift):**
- RTC SDK: Agora.io or Daily.co
- Voice widget embedded on arcade page
- "Voice Pods" per game (Squad Alpha, Squad Bravo)
- Runs in browser while Roblox runs as separate app
- Floating overlay shows who's speaking

**Work required:**
- Select and integrate RTC provider
- Voice channel management (create, join, leave)
- Push-to-talk or open mic mode
- Mute/unmute controls
- Audio recording for moderation (with disclosure)

**Safety features:**
- "Panic button" to instantly mute offender
- AI sentiment analysis on transcribed audio (Modulate)
- Visible "recording" indicator for self-moderation effect

---

#### 4.2 Avatar Generation

**What:** AI-generated avatars from student preferences.

**Current state:**
- Avatars display via `Avatar.svelte` component
- Mock students have `avatarUrl` pointing to placeholder images

**Approach (from meetings):**
- Clickable UI for traits (hair color, glasses, style) — NOT free text prompts
- Guards against prompt injection
- Generate via image model (DALL-E, Midjourney API, etc.)
- Store generated image, allow regeneration

**Work required:**
- Avatar builder UI (trait selection)
- Image generation API integration
- Storage for generated images
- "Edit avatar" flow to regenerate

---

#### 4.3 Roblox Presence Integration

**What:** Show which game a student is currently playing, in real-time.

**Challenge:** Roblox doesn't expose rich presence data for private servers.

**Possible approaches:**
- Portal event on game entry (we know they clicked "Play")
- Roblox API polling (limited data)
- If using Timeback Electron app, vision/screen detection (mentioned in meetings)
- Manual "I'm playing" status

**Work required:**
- Research Roblox API capabilities for private servers
- Implement presence update on game launch
- Handle "stopped playing" detection (timeout? user action?)
- Display in arcade: avatars of students in each game

---

## Dependencies & Blockers

| Dependency | Owner | Status | Blocks |
|------------|-------|--------|--------|
| Timeback credentials | Amanda | Pending | 1.1 SSO |
| LWAI IAM user | Amanda | Pending | 1.2 Gating |
| Database decision | Team | Open | 1.4 Persistence |
| Roblox deep link validation | Dev | Not started | 1.3 Launch |
| RTC provider selection | Team | Open | 4.1 Voice |

---

## Strategic Context

Key decisions and context from recent stakeholder meetings:

- **Weekly goals > daily** — High schoolers plan weekly; daily goals are "meaningless" in current Timeback
- **120 XP threshold** — Flat number, no granularity; interim until Timeback revamps goals
- **Kids prefer AI aesthetic** — Survey shows preference for "cluttered/gradient AI-generated look" over Apple-clean
- **Don't rebuild parent portal** — Link to AlphaLearn's existing one; add Community-specific toggles only
- **Map is high priority** — Parents constantly ask "who else is in my area?"
- **Fork ability required** — Joe Marrone wants "break glass" clause if SuperBuilders deprioritizes
- **AlphaLearn going maintenance mode** — Being repurposed as Alpha Community
- **Timeback Electron as launcher** — Community app will run inside Electron wrapper

---

## Open Questions

1. **Database:** Cloudflare D1 (SQLite) vs external Postgres (Neon)?
2. **Real-time:** WebSockets vs Cloudflare Durable Objects?
3. **Voice provider:** Agora vs Daily.co vs other?
4. **Weekly vs daily gating:** AB test, or just go weekly?
5. **Avatar generation:** Which image model? Cost considerations?
6. **Roblox presence:** Feasible with private servers, or punt?

---

## Next Steps

1. Obtain Timeback credentials and LWAI access
2. Validate Roblox deep link on multiple platforms
3. Decide on database architecture
4. Begin Tier 1 implementation
