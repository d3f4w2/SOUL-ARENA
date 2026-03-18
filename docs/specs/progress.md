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
- Hybrid battle orchestration:
  - fighter-side move generation
  - judge-side aggregation
  - deterministic fallback
- Best-effort `agent_memory/ingest` writeback after battle generation.
- SQLite-backed battle persistence.
- `/api/arena/history` history API.
- `/arena/history` reload-safe battle archive page.
- User-facing Arena / history / replay text unified to Chinese.

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
- Decide whether persisted battle setup should also support rematch and share use cases.
- Decide whether hybrid orchestration should continue to evolve toward fully autonomous dual-agent exchanges.

## P1 next
- Add participant-level overrides in the UI instead of relying only on derived fighter inputs.
- Add explicit battle setup saving and rematch flows.
- Add richer replay explainability based on real profile anchors.
- Add shareable history and battle detail surfaces.

## Risks
- `openclaw` is still only a typed extension point, not a live integration.
- The current battle orchestration is hybrid:
  - real participant data
  - fighter-side move generation
  - judge-side aggregation
  - deterministic fallback exchange logic
- Persistence is local SQLite only; there is no cross-device sync or hosted storage yet.
## 2026-03-18

### 已完成
- 真实 battle 已接入轻量竞技排位层
- 首页已加入排行榜预览、最近关键对局与竞技目标
- `/arena` 已展示参赛者积分、排名、连胜与建议挑战对象
- `/arena/[battleId]` 已展示排位结算、积分变化与下一战推荐
- `/arena/history` 已升级为战绩中心，并支持胜负筛选
- 新增 `/arena/leaderboard` 独立排行榜页面

### 当前边界
- 竞技层仍为无赛季的轻量版本
- 只统计真实 `orchestrated` battle
- 未加入任务系统、成就树与观众投票
