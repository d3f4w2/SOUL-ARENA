# 实现日志

## 2026-03-18（持久化补充）
- 用本地 SQLite 替换 battle 内存 `Map`
- battle package 现在会在生成后落到本地数据库
- 增加 `/api/arena/history`
  - 返回最小 battle summary 列表
- 增加 `/arena/history`
  - 支持 reload-safe 历史战报回看
- `/api/arena/battles/[battleId]` 与 `/events` 现在从持久化 battle 读取
- 持久化范围目前只覆盖 battle snapshot，不覆盖认证信息

## 2026-03-18
- 将 `SecondMe` 接入从单一会话升级为双槽位：
  - `alpha`
  - `beta`
- 增加 slot-based `SecondMe` OAuth 与 session 管理
- 增加 `/api/participants`
  - 返回双参与者真实连接状态与资料
- 增加 `arena-participants.ts`
  - 聚合双方 `user info`、`shades`、`soft memory`
  - 生成 identity summary 与 memory anchors
- 增加 `arena-engine.ts`
  - 基于双方真实资料生成 preview
  - 基于双方真实资料生成 battle package
  - 接入 best-effort `SecondMe Act` overlay
- `/arena` 改成双人真实接入控制台
- `/api/arena/build-preview` 改成基于双参与者真实资料工作
- `/api/arena/battles` 改成基于双参与者真实资料工作
- 增加 `agent_memory` 写回代理，并在 battle 生成后 best-effort 写回结果
- replay 页兼容新的 battle package 元数据
- 已同步：
  - `docs/specs/api/contracts.md`
  - `docs/specs/features/secondme-agent-ingestion.md`
  - `docs/specs/progress.md`

## 2026-03-17
- 仓库已有 `SecondMe` 登录、资料、标签、软记忆、聊天、笔记接入
- 仓库已有 `Zhihu` 热榜、搜索、圈子相关路由
- 项目方向从“接入演示台”切到 `Soul Arena MVP`
- 建立 `agent.md + docs/specs` 作为协作中枢
- 增加 arena 域层：
  - 题库
  - 守擂者预设
  - build 分析
  - battle package
  - battle events
- 增加 arena API：
  - `/api/arena/topics`
  - `/api/arena/build-preview`
  - `/api/arena/battles`
  - `/api/arena/battles/[battleId]`
  - `/api/arena/battles/[battleId]/events`
- 首页已经改成 `Soul Arena` landing
- `/arena` 已有构筑工作台
- `/arena/[battleId]` 已有回放页、战报与录屏导出
- 用户可见 UI 已切到中文
- 已通过：
  - `npm run lint`
  - `npm run build`
