# Soul Arena Agent Hub

## Mission
Build `Soul Arena` as an `Agent Build Game`:

- Soul -> talent ->观点/规则/禁忌 -> 装备 -> 战斗 -> 战报 -> 擂台循环
- 辩论和格斗是表现层，build 深度和观战张力是核心

## Current Phase
Phase 1 is the hackathon MVP.

Must ship:

- 文档中枢 `agent.md + docs/specs`
- 备战 build 页面
- 实时战斗回放页面
- 结果页高光
- 挑战者预告
- 前端 `WebM` 录屏导出

Not in Phase 1:

- 重型数据库设计
- 完整成长系统
- 服务端视频生成
- 复杂社区治理

## Source Of Truth
Read in this order:

1. `docs/specs/product.md`
2. `docs/specs/features/*.md`
3. `docs/specs/ui/flows.md`
4. `docs/specs/api/contracts.md`
5. `docs/specs/architecture.md`
6. `docs/specs/progress.md`

Implementation follows spec, not the reverse.

## Update Rules
When behavior changes:

1. Update the relevant spec first.
2. Update `ui/flows.md` or `api/contracts.md` if needed.
3. Implement.
4. Append facts to `implementation-log.md`.
5. Update `progress.md`.

## Parallel Lanes
### Spec/Product Lane
- Maintain `product.md`, `decisions.md`, `progress.md`
- Refine feature scope and demo narrative

### Frontend Arena Lane
- Landing, build, battle replay, highlights, challenger preview, recording UX
- Maintain `ui/sitemap.md`, `ui/design-system.md`, `ui/flows.md`

### Backend Battle Lane
- Arena contracts, build analysis, battle event generation, replay payloads
- Maintain `architecture.md`, `api/contracts.md`, `implementation-log.md`

### Integration Lane
- SecondMe identity/profile seeding
- Zhihu signal surfaces and future content hooks

## Active Priorities
P0:

- Stable build analysis contract
- Battle package contract
- Replay + record flow

P1:

- Classic battles board
- Zhihu topic signal mapping
- SecondMe-based fighter seeding

P2:

- Voting persistence
- Judge moderation
- Longer-term ladder/meta systems

## Quick Paths
- Product: `docs/specs/product.md`
- Architecture: `docs/specs/architecture.md`
- Contracts: `docs/specs/api/contracts.md`
- Progress: `docs/specs/progress.md`
- Latest implementation notes: `docs/specs/implementation-log.md`
