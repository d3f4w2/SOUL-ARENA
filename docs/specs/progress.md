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
- Hosted Postgres-backed persistence for Vercel deployments, with SQLite fallback for local development.
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
  - reload-safe as long as the battle was persisted to the configured store

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
- Hosted persistence now depends on `POSTGRES_URL` in Vercel; local development still falls back to SQLite.

## 2026-03-19

### Done
- `/arena` 乙方现在支持三种来源：
  - `SecondMe` 扫码实时登录
  - 从已打过比赛的历史玩家中选择
  - 基于知乎实时热榜随机匹配出的知乎 NPC
- `history` / `zhihu` 已进入统一 participant provider 模型，并可直接参与 preview / battle / setup 持久化。
- 乙方切到知乎时，不再要求手动登录第二台设备，而是按当前知乎热榜动态生成 NPC 池并随机匹配。
- 历史玩家与知乎用户都会被标准化成统一的人格快照，以便沿用现有 fighter build 和 battle 流程。

### Current shape
- 甲方仍保持原有 `SecondMe` 登录体验。
- 乙方来源选择被限制在原有乙方操作区，没有改动 `/arena` 其他结构。
- `history` / `zhihu` 来源属于离线人格快照，不依赖实时 OAuth，但 battle setup 会保存它们的来源快照，便于 rematch / replay 还原。

### Risks
- 知乎 NPC 目前通过“实时热榜标题 -> 搜索结果作者/用户”链路派生，质量受知乎开放接口返回形态影响。
- 历史玩家来源依赖已持久化的 battle 包；如果还没有真实 battle，候选池会为空。

### Done
- SecondMe authorization now supports QR bind-code handoff for `alpha` / `beta`.
- Arena can initiate authorization on one device and complete it from another browser/device.
- OAuth callback now writes the completed SecondMe session back to the originating Arena session.
- SecondMe payload normalization now supports:
  - `userId -> secondMeUserId`
  - `avatar -> avatarUrl`
  - `selfIntroduction -> bio` fallback
  - `factContent -> softMemory` text fallback
- When upstream `shades` is empty, the backend now derives a small fallback tag set at runtime from profile and memory text.

### Current shape
- `/api/participants` can now return either upstream or backend-derived `shades`.
- Arena build/profile generation benefits automatically because it already consumes participant `shades`.
- The frontend contract remains unchanged.
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
## 2026-03-18 P0

### 已完成
- `openclaw` provider 已从类型占位升级为真实接入路径
- `/arena` 已支持 `SecondMe / OpenClaw` 双 provider 选择
- OpenClaw 主流程已改为“一次性绑定码 + skill 主动注册”
- `soul.md` 导入保留为 legacy fallback，不再是默认主流程
- battle 创建前已新增 setup 持久化
- replay 已支持 rematch 模板派生并返回 builder
- `/api/arena/topics` 已支持 `preset + zhihu_dynamic` 混合题池
- builder 已支持 participant override UI

### 当前边界
- openclaw runtime endpoint 仍为可选配置，未配置时自动走 fallback
- rematch 当前优先支持“可编辑重开”，未做“一键原样再战”
- 分享、观众投票、圈子互动仍未进入本轮
