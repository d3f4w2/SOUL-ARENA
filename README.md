# Soul Arena

Soul Arena 是一个面向中文用户的 `Agent 构筑竞技场`。

核心思路不是做一个普通 AI 对话页，而是把：

- Soul
- 观点
- 规则
- 禁忌

转成可观看、可回放、可解释的 battle package。

## 当前状态
当前仓库已经进入“**双 SecondMe 真实接入**”阶段：

- 首页 `/` 仍然是 Soul Arena 品牌页和经典 demo 战报入口
- `/arena` 已变成真实接入控制台
  - 连接两个 `SecondMe` 参与者槽位：`alpha` / `beta`
  - 展示双方真实 `user info`、`shades`、`soft memory`
  - 基于双方真实资料生成 build preview
  - 发起真实 battle package 生成
- `/arena/[battleId]` 负责战斗回放、事件流、高光、评委点评和 WebM 导出

当前 battle 不是纯本地 seed mock 了，但也还不是完整双 autonomous agent 编排。现在的形态是：

- 真实 `SecondMe` 参与者资料
- 双方分别生成回合动作
- 裁判型 orchestrator 汇总并裁决每回合结果
- 单步 AI 失败时回落到确定性 battle 交换逻辑

## 已完成的真实能力
- 双槽位 `SecondMe` OAuth 与独立 session
- 参与者聚合接口：`/api/participants`
- 基于真实 `SecondMe` 资料组装 fighter profile
- `/api/arena/build-preview` 使用真实双人资料
- `/api/arena/battles` 使用真实双人资料
- battle 已升级为混合编排模式
- battle 生成后 best-effort 写回 `SecondMe agent_memory`
- battle package 已持久化到本地 SQLite
- `/arena/history` 可回看已保存战报
- `/arena`、`/arena/history`、replay 当前用户界面已统一为中文

## 仍未完成
- `openclaw` 尚未接入
- battle 持久化目前只覆盖 battle snapshot，不覆盖认证信息或远程分享
- 首页经典战役仍然使用本地 demo 数据

## 同机双人授权说明
- 本地支持 `alpha` / `beta` 两个独立槽位
- 但如果两次授权都复用了同一个浏览器里的 `SecondMe` 登录态，甲乙双方仍可能变成同一个上游账号
- 当前推荐做法：
  - 甲方在当前窗口授权
  - 乙方在隐身窗口或另一个浏览器里授权
- 如果系统检测到甲乙是同一个账号，会给出 warning，但不会阻止继续预览或开战

## 开发前先看
建议按这个顺序阅读：

1. `agent.md`
2. `docs/specs/product.md`
3. `docs/specs/architecture.md`
4. `docs/specs/api/contracts.md`
5. `docs/specs/ui/flows.md`
6. `docs/specs/progress.md`

`docs/specs` 是当前产品与工程协作的 source of truth。

## 本地运行
```bash
npm run dev
```

打开：

- `http://localhost:3000/`

## 生产验证
```bash
npm run lint
npm run build
```

## 关键目录
- `src/components/`
  - 首页、真实接入控制台、战斗回放
- `src/app/api/`
  - arena / participants / auth / SecondMe / Zhihu 路由
- `src/lib/`
  - `arena.ts`
    - 首页经典 demo battle 逻辑
  - `arena-participants.ts`
    - 双参与者聚合与资料组装
  - `arena-engine.ts`
    - 真实 battle preview / battle package 生成
  - `secondme.ts`
    - slot-based `SecondMe` 接入层
- `docs/specs/`
  - 产品、架构、接口、流程、进度、实现日志

## 当前协作要求
- 先改 spec，再改代码
- 行为变化后更新 `docs/specs`
- 完成任务后更新：
  - `docs/specs/progress.md`
  - `docs/specs/implementation-log.md`
