# SecondMe Real Participant Integration

## Goal
Use SecondMe as the real profile and memory source for both fighters in `/arena`, instead of only seeding mock battle logic.

## What is implemented now
- Slot-based SecondMe sessions:
  - `alpha`
  - `beta`
- Real participant aggregation:
  - user info
  - shades
  - soft memory
- `/api/participants` for inspecting both slots from the Arena UI.
- Fighter profile assembly from real participant data.
- Arena preview generation from two real SecondMe participants.
- Battle generation from two real SecondMe participants.
- Hybrid battle orchestration:
  - fighter-side move generation
  - judge-side aggregation
- Best-effort battle outcome writeback to `agent_memory/ingest`.

## Current code entry points
- `src/lib/secondme.ts`
  - slot-specific OAuth/session handling
  - slot-specific fetch helpers
  - Act stream helper for structured AI overlays
- `src/lib/arena-participants.ts`
  - participant aggregation
  - fighter input assembly
  - identity summary / memory anchor extraction
- `src/lib/arena-engine.ts`
  - real preview generation
  - orchestrated battle package generation
- `src/app/api/participants/route.ts`
- `src/app/api/secondme/agent-memory/route.ts`
- `src/app/api/arena/build-preview/route.ts`
- `src/app/api/arena/battles/route.ts`
- `src/components/arena-builder.tsx`

## Behavioral notes
- `/arena` now expects both `alpha` and `beta` to be connected before starting a real battle.
- The generated fighter profile is deterministic from the participant data plus optional overrides.
- Battle orchestration now uses a hybrid flow where both fighters first generate round moves and a judge step then aggregates the result.
- If any AI step fails, battle generation falls back to deterministic exchange logic instead of failing the whole match.

## Remaining gaps
- `openclaw` is not connected yet.
- Battle persistence still only covers battle snapshots, not rematch/setup/share-level data.
- The home page classic battle previews still use local preset data.
- Primary-slot compatibility endpoints (`/api/me`, `/api/secondme/*`) still map to `alpha` only.

## Acceptance points
- Two different SecondMe accounts can be connected in one browser session.
- `/arena` shows real participant identity, shades, and soft memory for both slots.
- Preview and battle APIs reject requests when either participant is not connected.
- Generated battle packages include `participantRefs` and `sourceMeta`.
- Battle creation writes outcome events back to SecondMe agent memory on a best-effort basis.
