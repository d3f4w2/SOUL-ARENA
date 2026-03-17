# Architecture

## Major Subsystems
- Integration layer
  - SecondMe auth/profile/shades/softmemory
  - Zhihu ring/billboard/search
- Arena domain layer
  - topics
  - challengers
  - build analysis
  - battle package generation
  - battle event replay
- Presentation layer
  - landing page
  - build page
  - battle replay page
  - result/highlight panels
  - classic battle board

## Primary Data Flow
1. Client loads topics and optional identity seed data.
2. Client sends build input to build-analysis route.
3. Server returns structured soul stats, cards, radar, and hints.
4. Client submits battle creation request.
5. Server returns battle package and event list.
6. Battle page replays events over a canvas stage and surrounding UI.
7. Client may record the canvas stream to WebM.

## Battle Package
The battle package is the stable contract between backend generation and frontend replay.

It contains:
- metadata
- fighters
- build cards
- score model
- highlights
- next challenger preview
- ordered battle events

## MVP Persistence
Phase 1 supports ephemeral storage and client fallback for battle packages. Contracts must remain stable so a database can replace storage later without changing the replay UI.
