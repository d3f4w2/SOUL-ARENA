# 架构说明

## 总体结构
当前项目分成四层：

### 1. 外部接入层
- `SecondMe`
  - 双槽位 OAuth：`alpha` / `beta`
  - 用户资料
  - `shades`
  - `soft memory`
  - chat / note / agent memory
- `Zhihu`
  - 热榜
  - 搜索
  - 圈子相关能力

这一层负责外部平台接入，不直接承担 battle package 的业务编排。

### 2. 参与者聚合层
核心在 `src/lib/arena-participants.ts`，负责：

- 读取双参与者真实 session
- 拉取 `SecondMe` 原始资料
- 组装 `ArenaParticipantSource`
- 提炼 identity summary
- 提炼 memory anchors
- 生成 fighter input

这一层把“平台原始数据”转成“可供 battle 消费的领域输入”。

### 3. Arena 编排层
当前分成两部分：

- `src/lib/arena-engine.ts`
  - 真实 preview 生成
  - 真实 battle package 生成
  - 双方回合动作生成
  - 裁判聚合与裁决
  - AI 失败时的确定性回退
- `src/lib/arena.ts`
  - 首页经典 demo battle 数据

也就是说，真实主流程和 legacy demo 流程已经分开了。

### 4. 展示层
主要页面与组件：

- `src/components/soul-arena-app.tsx`
  - 首页与经典战役预告板
- `src/components/arena-builder.tsx`
  - 双人真实接入控制台
- `src/components/battle-replay.tsx`
  - 回放舞台、事件流、战报、录屏导出

## 关键数据流
### 流程 A：真实双人 battle
1. 前端进入 `/arena`
2. 调用 `/api/participants`
3. 返回 `alpha` / `beta` 两个参与者的真实连接状态与资料
4. 用户选择辩题
5. 前端调用 `/api/arena/build-preview`
6. 后端：
   - 解析双参与者
   - 拉取真实 `SecondMe` 数据
   - 生成 fighter profile
7. 前端展示 preview
8. 用户点击开始对战
9. 前端调用 `/api/arena/battles`
10. 后端生成 battle package
11. 双方先各自产生回合动作
12. 裁判聚合双方动作并输出回合裁决
13. 后端 best-effort 写回 `SecondMe agent_memory`
14. 前端跳转 `/arena/[battleId]`
15. 回放页消费 battle package，驱动 canvas 舞台与事件流

### 流程 B：首页经典 demo
1. 首页读取本地经典 battle 数据
2. 只用于展示品牌感和玩法，不依赖真实双参与者接入

## Battle Package
battle package 仍然是当前最关键的内部稳定契约。它连接：

- battle 生成逻辑
- 前端回放页面
- 高光展示
- 评委点评
- rematch / replay anchor
- 后续持久化与分享

当前 battle package 关键字段包括：

- `topic`
- `player`
- `defender`
- `events`
- `judges`
- `highlights`
- `challengerPreview`
- `finalScore`
- `crowdScore`
- `winnerId`
- `participantRefs`
- `sourceMeta`

## 当前 battle 形态
当前真实 battle 不是纯 mock，也不是完整 autonomous 多 agent 编排，而是：

- 双方真实 `SecondMe` 资料
- 真实 fighter profile 组装
- 双方动作生成
- 裁判聚合裁决
- 任一步骤失败时的确定性 fallback

这保证了主流程能稳定运行，但还没有到最终形态。

## 当前持久化策略
当前采用本地 SQLite 轻量方案：

- battle package 写入本地 SQLite
- `/api/arena/history` 提供最小历史列表
- `/arena/[battleId]` 从持久化 battle snapshot 读取
- 前端本地仍会保留一份缓存作为兜底

这意味着：

- 刷新与进程重启后的回放已可用
- 仍然没有跨设备共享和远程同步
- 还没有 battle setup / rematch / share 级别的持久化能力

## 下一步架构扩展
当前最优先的扩展方向：

1. 接入 `openclaw` 作为新的 participant provider
2. 把当前 hybrid battle 推进到更完整的真实编排
3. 在 SQLite 之上继续扩展 history / rematch / share 能力
