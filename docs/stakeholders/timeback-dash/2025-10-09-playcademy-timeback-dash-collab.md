# Playcademy x Timeback Dash Collaboration

**Meeting:** Developer Dashboard Collaboration Discussion  
**Date:** 2025-10-09  
**Location/Platform:** Video call

## Attendees

- Donald Geddes - Backend Lead at Playcademy
- Adam Paul - Senior Developer at Playcademy
- Elpidio Julian - Developer at Playcademy (Timeback Dashboard)
- Drew Soderquist - Dash Team
- Nils Lang - BD/PM at Playcademy (listening in)
- Danny - Dash Team (did not attend)

## Goal

- Discuss potential collaboration on developer dashboard for Timeback integration
- Determine if Playcademy should use Dash's platform or continue building independently
- Share knowledge about Timeback implementation best practices

## Talking Points

- Elpidio has been building a portable developer dashboard for ~1 week
- Dashboard shows: course structure, Caliper events, assessment progress
- Math Raiders currently pushing data to production Timeback environment
- Dash team tracks all Caliper events in their Supabase for real-time leaderboards
- Discussion of dashboard portability vs hosting on Dash platform
- Integration with Playcademy's Vite plugin for seamless developer experience
- Need for visibility into Timeback data during game development
- Current One Roster integration is limited (course → component → resource)

## Key Decisions

- **Continue building independently** - Maintain portability and control
- **Learn from Dash team** - Get insights on metadata structure and best practices
- **No immediate collaboration** - Overhead outweighs benefits for now
- **Dashboard stays local** - Better developer experience with Vite plugin integration

## Actions

- [ ] @Donald — Create document for questions about Timeback implementation
- [ ] @Elpidio — Complete progress filters and quality of life improvements
- [ ] @Elpidio — Add support for different course structures as discovered
- [ ] @Team — Schedule follow-up with Danny about platform details
- [ ] @Team — Get course IDs for existing courses with tests from Dash

## Follow Ups

- Obtain list of course IDs currently in use by students
- Understand how Dash calculates total XP and handles metadata
- Learn about Caliper webhook usage from Dash team
- Explore assessment line items and results best practices
- Consider future local Timeback backend for developers

## Notes

- Dashboard provides critical visibility for developers (alternative is custom scripts)
- Three tabs: Course structure, Progress (assessment results), Events (Caliper)
- Dash offered to host dashboard at admin route but team prefers portability
- Drew mentioned 6 people on Dash team, launching Monday
- Academic requirements still shifting - freedom to define standards for new content
- Fractions have no existing assessments/standards in Timeback
