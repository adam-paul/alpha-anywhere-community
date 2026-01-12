# Alpha Anywhere Community App Integration with Playcademy

**Meeting:** Working Session  
**Date:** 2026-01-09  
**Location:** Google Meet

## Attendees

- Nils Lang - PM
- Adam - Playcademy Dev
- Donald Geddes - Playcademy Dev
- Amanda Shikpa - Alpha Anywhere

## Goal

Align on integration approach for Playcademy + Alpha Anywhere Community App, review feature requirements, and decide on codebase strategy.

## Talking Points

- AlphaLearn going into maintenance mode - can't compete with Timeback Dash (6 devs)
- AlphaLearn to be repurposed as Alpha Community (social platform + arcade)
- 2D metaverse UI shelved - "everyone thinks it's cool, nobody wants it" - going with tiles/grid
- Joe Marrone wants "break glass" clause: ability to fork everything if SuperBuilders deprioritizes Alpha Anywhere
- Alpha Anywhere students have Timeback IDs (future-proofed for eventual switch)
- UI style survey running across Alpha HS and Alpha Anywhere - kids prefer AI-generated look over Apple-clean style
- Timeback Electron app will be the launcher; community app runs inside it

**Work wall discussion:**

- Legacy dash only updates every 4 hours - problematic for daily unlock
- Students (esp. high school) plan weekly, not daily - weekly goals > daily goals
- Current Timeback daily goals are meaningless (not granular, students never meet them)
- Timeback Dash team working on revamped goals system where students set their own

**Features reviewed:**

- Game tiles / arcade modal - both have this
- Leaderboards - can convert to XP-based, opt-in
- Avatar system - AI-generated from prompt (trivial if not playable)
- Presence / notifications - AlphaLearn has full system (DynamoDB + WebSocket)
- Chat - must be real (AI-generated chat useless); use OpenAI moderate endpoint
- Parent portal - detailed permissioning, moderation flags, profile controls

**Roblox integration:**

- Entry into game = easy (portal event)
- Exit/presence while playing = unknown, may be limited
- Private servers might expose more data
- If running through Timeback Electron, vision could help

## Key Decisions

- **Work wall: 120 XP flat per day** - no granularity, just total threshold; good enough until Timeback goals revamp
- **Consider weekly work wall option** - AB test daily vs weekly toggle
- **Avatar: AI-generated via prompt** - not playable, trivial to implement; use clickable UI (no free-text prompt for kids)
- **Don't rebuild parent portal from scratch** - link to AlphaLearn's existing portal for now
- **Chat moderation** - use OpenAI moderate endpoint as starting point

## Actions

- [ ] @amanda - Get IAM user for LWAI database access (for Playcademy team)
- [ ] @amanda - Share AlphaLearn, Timeback client, and notification system codebases
- [ ] @amanda - Send environment variables if needed to run locally
- [ ] @nils - Give Amanda read access to Playcademy repo
- [ ] @adam @donald - Review AlphaLearn codebase to inform build decision
- [ ] @amanda - Send Alpha Community Figma/design links to group chat

## Follow Ups

- **Monday noon PT** - Follow-up call (1 hour, all attendees)
- Decision needed: Build on Playcademy, AlphaLearn, or new thing pulling from both?
- Roblox integration + voice chat = biggest engineering lifts, deserve dedicated discussion
- Parent portal: eventually unify, but low priority for now

## Notes

- Joe Marrone meeting context: "we've been burned by SuperBuilders before" - wants fork ability
- Alpha Anywhere requires age 8+ (grade 3+) - simplifies UX considerations
- Kids rebelling against Apple aesthetic - prefer cluttered/gradient AI-generated look
- Avatar editing possible via image gen tools (brown hair, glasses, etc.)
- Guard against prompt injection for avatar gen - probably use clickable UI, not free text
- AlphaLearn course builder being handed off to LPDO
- AlphaLearn renderer extracted as "platform renderer"
