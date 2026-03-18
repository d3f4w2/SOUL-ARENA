# API Contracts

## Status legend
- `implemented`: live in the current repo
- `legacy/mock`: still used for classic demo data
- `next`: reserved for the next integration pass

## Auth and participant APIs
- `GET /api/auth/login?slot=alpha|beta&returnTo=/arena`
  - `implemented`
  - Starts SecondMe OAuth for the requested participant slot.

- `GET /api/auth/callback`
  - `implemented`
  - Exchanges code for the slot-specific session and redirects back to `/arena`.

- `POST /api/auth/logout?slot=alpha|beta`
  - `implemented`
  - Clears one slot, or all slots when no slot is provided.

- `POST /api/auth/secondme/connect`
  - `implemented`
  - Returns `{ authUrl, slot }` for clients that want to trigger OAuth via JSON.

- `GET /api/participants`
  - `implemented`
  - Returns `{ participants }`.
  - Each participant includes:
    - `slot`
    - `provider`
    - `connected`
    - `displayName`
    - `secondMeUserId`
    - `session`
    - `user`
    - `shades`
    - `softMemory`
    - `issues`

- `DELETE /api/participants?slot=alpha|beta`
  - `implemented`
  - Disconnects a single slot.

## SecondMe proxy APIs
- `GET /api/me`
  - `implemented`
  - Compatibility endpoint for the primary slot (`alpha`).

- `POST /api/secondme/chat`
  - `implemented`
  - Proxies the primary slot chat stream.

- `POST /api/secondme/note`
  - `implemented`
  - Proxies note creation for the primary slot.

- `GET /api/secondme/shades`
  - `implemented`
  - Proxies shades for the primary slot.

- `GET /api/secondme/softmemory`
  - `implemented`
  - Proxies soft memory for the primary slot.

- `POST /api/secondme/agent-memory`
  - `implemented`
  - Request body:
    - `slot`
    - `event`
  - Proxies `agent_memory/ingest` for the requested slot.

## Arena APIs
- `GET /api/arena/topics`
  - `implemented`
  - Returns:
    - `topics`
    - `challengers`
    - `signals`
  - `challengers` now mainly support the classic home-page demo flow.

- `POST /api/arena/build-preview`
  - `implemented`
  - Request body:
    - `topicId`
    - `participants`
      - `{ slot, provider, participantId? }[]`
    - `overrides?`
      - keyed by `alpha` / `beta`
      - partial `FighterBuildInput`
  - Behavior:
    - requires both requested participants to be connected
    - assembles real fighter profiles from `user info + shades + soft memory`
  - Response includes:
    - `topic`
    - `player`
    - `defender`
    - `equipmentNotes`
    - `matchUpCallout`
    - `predictedEdges`
    - `participantRefs`
    - `sourceMeta`

- `POST /api/arena/battles`
  - `implemented`
  - Request body matches `build-preview`.
  - Behavior:
    - requires both requested participants to be connected
    - generates an orchestrated battle package from the two real participant profiles
    - best-effort writes battle outcome back to SecondMe agent memory for both slots
  - Response includes:
    - classic `battle package` fields used by replay
    - `participantRefs`
    - `sourceMeta`

- `GET /api/arena/history`
  - `implemented`
  - Query:
    - `limit?`
  - Returns:
    - `battles`
      - `id`
      - `createdAt`
      - `roomTitle`
      - `topicId`
      - `playerDisplayName`
      - `defenderDisplayName`
      - `winnerId`
      - `generationMode`

- `GET /api/arena/battles/:battleId`
  - `implemented`
  - Reads one battle package from the local SQLite battle store.

- `GET /api/arena/battles/:battleId/events`
  - `implemented`
  - Returns `{ battleId, events }`.

## Battle package notes
- Replay consumers should continue using:
  - `topic`
  - `player`
  - `defender`
  - `events`
  - `highlights`
  - `judges`
  - `finalScore`
  - `crowdScore`
  - `winnerId`

- New metadata added for real integrations:
  - `participantRefs`
  - `sourceMeta`
    - `generationMode`
    - `aiAssistEnabled`
    - `aiAssistUsed`
    - `issues`

## Remaining gaps
- `openclaw` provider is typed but not implemented.
- Persistence is local SQLite only; there is no remote/shared store yet.
- The home page still uses classic demo battles generated from local presets.
