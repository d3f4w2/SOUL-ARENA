# Current Progress

## Done
- Integration foundation for SecondMe OAuth and upstream proxy routes.
- Arena builder page and replay page.
- Classic preset battle demo for the home page.
- Dual-slot SecondMe participant model:
  - `alpha`
  - `beta`
- `/api/participants` participant inspection API.
- Real fighter profile assembly from:
  - user info
  - shades
  - soft memory
- Real `/api/arena/build-preview` flow based on two connected participants.
- Real `/api/arena/battles` flow based on two connected participants.
- Best-effort `agent_memory/ingest` writeback after battle generation.
- SQLite-backed battle persistence.
- `/api/arena/history` history API.
- `/arena/history` reload-safe battle archive page.

## Current shape of the product
- Home page:
  - still shows classic local demo battles
- `/arena`:
  - now acts as the real integration console for two SecondMe participants
- `/arena/history`:
  - lists persisted battles and links into replay
- `/arena/[battleId]`:
  - reload-safe as long as the battle was persisted locally

## P0 next
- Implement `openclaw` as an additional participant provider.
- Decide whether final battle orchestration should stay single-orchestrator or move to fully autonomous dual-agent exchanges.
- Decide whether persisted battle setup should also support rematch and share use cases.

## P1 next
- Add participant-level overrides in the UI instead of relying only on derived fighter inputs.
- Add explicit battle setup saving and rematch flows.
- Add richer replay explainability based on real profile anchors.
- Add shareable history and battle detail surfaces.

## Risks
- `openclaw` is still only a typed extension point, not a live integration.
- The current battle orchestration is hybrid:
  - real participant data
  - best-effort SecondMe AI overlays
  - deterministic fallback exchange logic
- Persistence is local SQLite only; there is no cross-device sync or hosted storage yet.
