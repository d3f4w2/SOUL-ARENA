# Decisions

## D-001 Product Positioning
Chosen: `Agent Build Game`

Reason:
- Better explains why build quality matters
- Gives the project a stronger long-term loop than “AI battle demo”

## D-002 Replay Model
Chosen: structured battle event replay

Reason:
- Easier to debug
- Easier for frontend playback and recording
- Easier to explain battle outcomes

## D-003 Recording Strategy
Chosen: frontend canvas/WebM export

Reason:
- Fastest hackathon path
- No server render pipeline needed

## D-004 Persistence Strategy For MVP
Chosen: no database requirement for the first playable loop

Reason:
- Keep build -> battle -> replay implementation cheap
- Leave persistence as a follow-up concern
