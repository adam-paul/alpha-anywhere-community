# Alpha Anywhere Community/Arcade Direction

**Meeting:** Community Arcade Strategy  
**Date:** 2026-01-05  
**Location:** Zoom

## Attendees

- Nils Lang - PM
- Amanda Shipka - Alpha Anywhere Product

## Goal

Discuss whether Playcademy arcade could serve as the foundation for Alpha Anywhere community, vs building from scratch in AlphaLearn.

## Talking Points

### Amanda's Initial Vision (from brain lift)

- Traditional social media style: profiles, friends, DMs
- Arcade with game cards showing who's online
- Map feature showing where other students are geographically
- Age bracketing for servers
- Voice chat (secure, Alpha Anywhere only)
- Gated behind daily work completion

### What Playcademy Already Has

- Persistent student profiles (currently tied to TimeBack XP)
- Real-time presence and communication (org-wide chat)
- System for linking to internal/external games
- Access gating based on criteria
- Multiplayer infrastructure on Cloudflare

### What Would Need to Be Added/Adapted

- Voice chat (should be straightforward on Cloudflare infrastructure)
- DMs (backend supports org chat, needs segmentation for 1:1)
- Map feature (student locations)
- UI adaptation to match Amanda's vision
- Age bracketing for servers
- Alpha Anywhere-specific gating (not TimeBack XP)

### Two Approaches Discussed

**Option A: MVP into AlphaLearn**

- Quick and dirty Roblox integration
- Someone who knows Roblox servers sets it up
- Feature-flag limited access
- Faster to first feedback, but throwaway work

**Option B: Platform approach via Playcademy**

- Build backend services properly
- Embed as iframe or integrate via API
- More stable foundation for scale (2000+ kids)
- Takes slightly longer but reusable

### Amanda's Concerns

- SuperBuilders teams have historically been unreliable (people move projects)
- Wants control over UX
- Hasn't seriously considered Playcademy as community foundation until now
- Need to test with actual kids which UI resonates

### Nils's Position

- Playcademy arcade needs a design partner or will be cancelled
- Alpha Anywhere is the only viable partner (physical schools don't need this)
- Amanda can "dictate terms" - Adam (dev) needs someone to build for
- Can lend 1-1.5 devs for 1-2 months without additional approval
- Reports to Joe, not Andy (different budget)

## Key Decisions

- **No decision yet** - Amanda needs to simmer and consult team
- **User testing needed** - Compare Playcademy 3D world vs traditional social UI with actual kids
- **Monday kickoff with design team** - First Principles team to evaluate

## Actions

- [ ] @amanda - Get Playcademy access (hub.playcademy.net)
- [ ] @amanda - Test the current Playcademy arcade
- [ ] @amanda - Talk to Joe Marone about this direction
- [ ] @amanda - Book Monday call with First Principles design team
- [ ] @nils - Create checklist of Amanda's brain lift features vs what Playcademy has
- [ ] @nils - Set up GChat with Adam, Amanda, Nils
- [ ] @nils - Provision separate server for 20-25 Alpha Anywhere test students

## Follow Ups

- Monday call with First Principles design team
- User testing: Playcademy 3D world vs traditional social UI
- Feature gap analysis: what's here, what needs adaptation, what's missing
- GT Anywhere and TSA Anywhere could also use this product

## Notes

- Amanda is only developer on Alpha Anywhere community (other dev focused on enrollment portal)
- If Amanda leans into Playcademy, she would essentially PM the devs
- Map feature is high priority - parents constantly ask "who else is in my area?"
- Current Playcademy has 30-40 students from TSA and NextGen Academy
- Playcademy budget approved by Joe for next 2 months, then needs to show usage
- This is attractive to Amanda because it would speed things up significantly
