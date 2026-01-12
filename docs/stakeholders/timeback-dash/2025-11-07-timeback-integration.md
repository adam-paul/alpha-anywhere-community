# Playcademy Integration with Time Back Platform

**Meeting:** Time Back Integration Planning Session  
**Date:** 2025-11-07
**Location/Platform:** In-person

## Attendees

- Nils Lang - Playcademy BD/PM
- Time Back Representative - Platform Integration Lead
- (Additional attendees mentioned but not clearly identified in transcript)

## Goal

- Define integration strategy between Playcademy and Time Back platform
- Determine technical requirements for gift cards, profiles, and content sharing
- Plan approach for K-6 student experience consolidation

## Talking Points

- Database structure and content organization (lessons, exercises, videos)
- Two-step integration approach: Shadow Day UI and Time Back UI integration
- QTI content rendering and integration possibilities
- Gift card system vs direct alpha currency sync
- Shared profile and avatar system across platforms
- Placement test UI improvements for TSA shadow days
- K-6 simplified front-end vision through Playcademy
- Open badges integration
- Reducing cognitive load for younger students
- Current alpha math parallel approach

## Key Decisions

- **Gift card approach preferred** - Students can buy Playcademy gift cards with XP/alphas for better economy control
- **Playcademy to host avatar/profile system** - Will be source of truth for student profiles across apps
- **K-6 front-end consolidation** - Long-term goal to have all K-6 students use Playcademy as primary interface
- **API-based approach** - Build abstracted backends for leaderboards, goals, emporium functionality
- **Shadow day improvements** - Add game links to placement test experience for TSA

## Actions

- [ ] Time Back team — Provide gift card codes/API for Playcademy integration
- [ ] Playcademy team — Implement gift card redemption system
- [ ] Playcademy team — Build QTI viewer for placement tests and content
- [ ] Both teams — Define profile/avatar API specifications
- [ ] Time Back team — Share webhook implementation for XP syncing
- [ ] Playcademy team — Prioritize integration features and communicate timeline (1-2 days)
- [ ] Both teams — Coordinate to avoid duplicate work on backend services

## Follow Ups

- Need Andy's buy-in for K-6 UI consolidation approach
- Determine if TSA needs shadow day revamp urgently
- Clarify timeline for January TSA scale-up requirements
- Discuss standardized badging system implementation
- Plan meeting with Joel to pitch consolidated approach
- Coordinate with Incept team on their diagnostic test plans
- Define handoff process when students transition from K-6 to 7-12 interfaces

## Notes

- Playcademy launching social features this week
- Team has standardized game proposal process with Andy's objection checklist
- Civics/history game shipping Monday for pilot (not yet approved for alpha)
- Math Raiders going into production as alpha math alternative
- Gift card approach allows for future parent monetization
- Shadow day currently just shows placement tests - not representative of Time Back capabilities
- Cognitive load reduction is key driver for K-6 consolidation
