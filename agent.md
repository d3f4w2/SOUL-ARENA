# Soul Arena 协作入口

## 项目一句话
Soul Arena 是一个 `Agent 构筑竞技场`：

- 把身份、观点、规则、禁忌映射成可解释的 build
- 再把 build 放进可观看、可回放的 battle package
- 最终形成“构筑 -> 对战 -> 战报 -> 下一场”的擂台循环

## 当前阶段
当前已经完成“**双 SecondMe 真实接入**”这一阶段，下一阶段重点是：

1. `openclaw` provider 接入
2. 更真实的 battle orchestration
3. battle setup / rematch / share 级持久化扩展

## 当前已经完成
- 首页已切成 `Soul Arena` 品牌化落地页
- 首页经典战役卡片仍可作为 demo 入口
- `/arena` 已改成真实接入控制台
  - 连接两个 `SecondMe` 槽位：`alpha` / `beta`
  - 查看双方真实 `user info`、`shades`、`soft memory`
  - 基于双方真实资料生成 preview
  - 发起真实 battle package
- `/arena/[battleId]` 已有 canvas 战斗舞台、事件流、三大高光、评委点评、WebM 导出
- `/arena/history` 已能回看本地持久化 battle
- 已有 `SecondMe` 双槽位 OAuth / 资料聚合 / agent memory 写回
- 已有 battle package SQLite 持久化
- 已有 `Zhihu` 热榜 / 搜索 / 圈子相关接入底座

## 当前有意简化的地方
- battle 仍不是完整双 autonomous agent 编排
- battle 持久化目前只覆盖 battle snapshot，不覆盖 setup / share / 认证信息
- 首页经典 battle 仍是本地 demo 数据
- `openclaw` 还没有实际接入
- 观众投票、守擂积分、长期排行榜还没有实现

## 推荐阅读顺序
1. `README.md`
2. `agent.md`
3. `docs/specs/product.md`
4. `docs/specs/architecture.md`
5. `docs/specs/api/contracts.md`
6. `docs/specs/ui/flows.md`
7. `docs/specs/progress.md`
8. `docs/specs/implementation-log.md`

## 关键代码入口
- `src/components/soul-arena-app.tsx`
  - 首页与经典战役预告板
- `src/components/arena-builder.tsx`
  - 双人真实接入控制台
- `src/components/battle-replay.tsx`
  - 战斗回放、战报、高光、录屏导出
- `src/lib/arena.ts`
  - 首页经典 demo battle 数据
- `src/lib/arena-participants.ts`
  - 双参与者聚合、identity summary、memory anchor 组装
- `src/lib/arena-engine.ts`
  - 真实 preview / 真实 battle package 生成
- `src/lib/secondme.ts`
  - slot-based `SecondMe` 接入与 session 管理
- `src/app/api/arena/*`
  - arena 相关接口
- `src/app/api/participants/route.ts`
  - 真实参与者读取与断开

## 协作规则
- 先改 spec，再改实现
- 所有行为变化先同步到 `docs/specs`
- 每完成一项可见能力，都要更新：
  - `docs/specs/progress.md`
  - `docs/specs/implementation-log.md`
- 接口路径、字段名、类型名默认保持英文稳定，避免破坏契约

## 并行开发建议
### 产品/文档线
- 维护 `product.md`、`progress.md`、`implementation-log.md`
- 把 PRD 与当前实现对齐

### 前端竞技场线
- 继续增强 `/arena` 的双人接入体验
- 继续增强 `/arena/[battleId]` 的舞台演出、录屏体验、移动端适配

### 后端 battle 线
- 把 battle package 从“真实资料 + AI overlay + fallback”推进到更完整的 orchestration
- 增加持久化、历史战报、后续投票与排行榜能力

### 接入线
- 接入 `openclaw` 作为新的 participant provider
- 继续深化 `SecondMe` persona 与 fighter profile 的映射

## 当前优先级
### P0
- `openclaw` provider 接入设计
- 真实 battle orchestration 稳定
- replay / WebM 体验稳定
- 持久化 battle setup 的边界设计

### P1
- rematch 与 battle setup 保存
- 轻量分享链路
- 历史战报 / 经典战役沉淀增强

### P2
- 投票
- 守擂循环
- 排行榜与 meta 成长

## 当前风险
- 浏览器录屏能力依赖 `MediaRecorder`
- `SecondMe Act` overlay 失败时会回退到确定性逻辑
- 当前只有本地 SQLite，没有跨设备回看和远程同步
- `openclaw` 尚未接入，当前 provider 只有 `SecondMe`

## 快速入口
- 产品定义：`docs/specs/product.md`
- 架构说明：`docs/specs/architecture.md`
- 接口契约：`docs/specs/api/contracts.md`
- UI 流程：`docs/specs/ui/flows.md`
- 当前进度：`docs/specs/progress.md`
- 实现日志：`docs/specs/implementation-log.md`
