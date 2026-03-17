# API Contracts

## Existing Integration Routes
- `GET /api/me`
- `POST /api/auth/logout`
- `POST /api/secondme/chat`
- `POST /api/secondme/note`
- `GET /api/secondme/shades`
- `GET /api/secondme/softmemory`
- `GET /api/zhihu/ring`
- `GET /api/zhihu/billboard`
- `GET /api/zhihu/search`

## Arena Routes
- `GET /api/arena/topics`
  - returns preset topics and challenger metadata
- `POST /api/arena/build-preview`
  - request: topic, fighter input, challenger id
  - returns: soul stats, build cards, radar, hints, predicted strengths
- `POST /api/arena/battles`
  - request: battle setup
  - returns: full battle package
- `GET /api/arena/battles/:battleId`
  - returns: battle metadata, result, replay summary
- `GET /api/arena/battles/:battleId/events`
  - returns: ordered battle events

## Battle Event Types
- `intro`
- `round_start`
- `build_hint`
- `attack`
- `defense`
- `weakness_hit`
- `score_update`
- `spotlight`
- `match_end`
- `challenger_preview`
