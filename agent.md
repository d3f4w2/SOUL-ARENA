# Soul Arena 协作入口

## 项目一句话
Soul Arena 是一个 `Agent 构筑竞技场`：

- 把 Soul、观点、规则、禁忌转成可配置的 build
- 再用可观看的辩论格斗验证 build 强弱
- 最终形成“构筑 -> 对战 -> 战报 -> 下一场”的擂台循环

## 当前阶段
当前处于黑客松第一阶段，目标是先打通一条完整可演示主线：

1. 首页理解玩法
2. `/arena` 完成备战与构筑
3. 生成 battle package
4. `/arena/[battleId]` 实时回放战斗
5. 产出高光与挑战者预告
6. 浏览器端导出 WebM 录屏

## 当前已经完成
- 首页已切成 `Soul Arena` 品牌化落地页
- `/arena` 已有辩题选择、守擂者选择、构筑输入、构筑预览
- `/arena/[battleId]` 已有 canvas 战斗舞台、事件流、三大高光、挑战者预告、WebM 导出
- 已有 `SecondMe` 登录/资料/标签/软记忆/聊天/笔记接入底座
- 已有 `Zhihu` 圈子/热榜/搜索等接入底座
- 用户可见 UI 已切到中文

## 当前有意简化的地方
- battle package 目前由本地生成逻辑产出，不是真实多 Agent 对战编排
- 持久化仍是轻量方案，不是完整数据库设计
- 观众投票、守擂积分、长期排行榜还没有实现
- 文档正在作为当前 source of truth 继续收敛

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
  首页与经典战役预告板
- `src/components/arena-builder.tsx`
  备战工作台、构筑输入、构筑预览
- `src/components/battle-replay.tsx`
  战斗回放、战报、高光、录屏导出
- `src/lib/arena.ts`
  topic/challenger 预设消费、build 分析、battle package 与事件流生成
- `src/app/api/arena/*`
  arena 相关接口
- `src/lib/secondme.ts`、`src/lib/zhihu.ts`
  第三方接入层

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
- 细化 landing 页
- 增强 `/arena` 构筑体验
- 增强 `/arena/[battleId]` 舞台演出、录屏体验、移动端适配

### 后端 battle 线
- 把 battle package 从“生成式 mock”逐步推进到真实 battle orchestration
- 增加持久化、历史战报、后续投票与排行榜能力

### 接入线
- 把 `SecondMe` 用户信息更深地映射到 fighter seed
- 把 `Zhihu` 热榜/可信搜进一步接入到 topic 与 signal 层

## 当前优先级
### P0
- 中文文档同步
- battle package 稳定
- build 可解释性增强
- replay + WebM 体验稳定

### P1
- 真实 battle 编排
- 历史战报/经典战役沉淀
- 轻量持久化

### P2
- 投票
- 守擂循环
- 排行榜与 meta 成长

## 当前风险
- 浏览器录屏能力依赖 `MediaRecorder`
- battle 逻辑目前仍偏演示驱动
- 没有完整持久化时，多人协作和跨设备回看能力有限

## 快速入口
- 产品定义：`docs/specs/product.md`
- 架构说明：`docs/specs/architecture.md`
- 接口契约：`docs/specs/api/contracts.md`
- UI 流程：`docs/specs/ui/flows.md`
- 当前进度：`docs/specs/progress.md`
- 实现日志：`docs/specs/implementation-log.md`
