# Playcademy x Alpha Anywhere Arcade Collaboration

**Meeting:** Playcademy <> Alpha Anywhere Arcade  
**Date:** 2025-12-23  
**Location:** Zoom

## Attendees

- Nils Lang - Playcademy BD/PM
- Adam Paul - Playcademy Frontend
- Joe Marone - Alpha Anywhere
- Amanda Shipka - Alpha Anywhere Product

## Goal

Explore collaboration on Alpha Anywhere's community/arcade feature using Playcademy's existing infrastructure. Align on technical integration approach and timeline.

## Talking Points

### Playcademy Update

- Team has grown; focus on educational games over last few months
- 6-7 games in pipeline: K-6 math focus, plus vocab, reading, life skills
- Fast Math / Math Raiders deployed with students (TSA pilot, then Nova Bastrop + 2 other schools)
- Currently a replacement for Alpha Math Fluency, but assessment pipeline not built yet (pretest/posttest still in Alpha Math Fluency)
- SDK for TimeBack built by Donald - becoming default dev tools for TimeBack org-wide
- Arcade already has: persistent user avatars, multiplayer, real-time communication, TimeBack SSO, daily XP sync

### Alpha Anywhere Vision

- Community is NOT an academic space - it's for CONNECTION
- Behind a "work wall": finish daily/weekly goals to unlock access
- Three components planned:
    1. **Explore**: Find other students, map view, filters (location, school)
    2. **Chat**: Mini social hub, profiles, friending, direct messaging
    3. **Arcade**: Roblox games in private servers, seeing who's online, joining together
- FOMO feature: view-only mode showing friends online before completing work (motivation for academics)
- Goal: break the ice for isolated homeschool students through games, then bring friendships back to first-party portal

### Current Alpha Anywhere Situation

- ~400 students currently, growing to 500 in less than a month
- All students on legacy dash (old system), NOT new TimeBack platform
- No XP system - uses "daily 2-hour learning sessions" as goal metric
- Moving to TimeBack platform blocked by:
    1. 2x learning not yet demonstrated (results expected February)
    2. Manual enrollment/testing processes only 60% automated (can't absorb 400+ students)
- AlphaLearn could become core academic app, but decision pending February results
- If AlphaLearn not rolled out, would become "Alpha Anywhere Community" standalone
- GT Anywhere is completely different stack and team, no convergence planned

### Technical Considerations

- Playcademy already has most of what's needed:
    - Deep linking into external games
    - Gating behind TimeBack data (daily XP)
    - Persistent user profiles synced with TimeBack
    - Real-time presence and communication
- Missing: **Voice chat** (Roblox disables voice for kids 8 and under; need sidecar solution)
- Integration complexity: TimeBack backend + Playcademy backend + AlphaLearn backend
- Parent permissions system exists in AlphaLearn (separate from TimeBack)
- Gating logic would be controlled by AlphaLearn side
- Personas/avatars: need to determine if Alpha Anywhere avatars connect to Playcademy avatars

### Timeline

- Amanda's entire Q1 2026 dedicated to this project
- Platform change to TimeBack: 4-5 months minimum, realistically fall 2026
- February: 2x learning results, then platform conversation starts
- This is an Alpha Anywhere OKR - "build to roll out, not build and see"

## Key Decisions

- **Alpha Anywhere fully committed** to rolling out community feature Q1 2026
- **Playcademy to commit 1-1.5 devs** to the project (Adam potentially full-time)
- **Architecture diagram first** before any building starts
- **Voice chat as potential standalone deliverable** - could be built for Playcademy and shared with Alpha Anywhere even if other alignment doesn't work out
- **Roblox + Minecraft both viable** - not platform-specific, just meeting kids where they are

## Actions

- [ ] @amanda - Map out AlphaLearn architecture diagram and send to team (today/this week)
- [ ] @nils @adam - Develop concrete proposal with architecture diagrams showing integration points
- [ ] @nils - Dig deeper into Alpha Anywhere brain lift, compare with existing Playcademy arcade
- [ ] @all - Sync in early January once everyone back from PTO to review architecture and develop roadmap

## Follow Ups

- Need to determine: exact data components to share/sync between systems
- Need to determine: how to handle gating with legacy dash (may be manual toggle initially)
- Need to determine: how Playcademy personas connect to Alpha Anywhere avatars
- Need to determine: parent permissions sync mechanism
- Architecture diagram review meeting in early January
- Voice chat feature scoping as potential early win

## Notes

- Joe Marone on PTO starting Dec 24, back after ~1 week
- Nils unavailable Dec 25, Dec 30 - Jan 2
- Amanda promised full week off starting tomorrow
- Alpha Anywhere uses Figma/similar for architecture diagrams (exportable as SVG)
- 500 kids = significant testing opportunity at scale (different variables than school pilots)
