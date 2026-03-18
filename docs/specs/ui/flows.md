# 关键流程

## 流程 1：从首页进入真实接入控制台
1. 用户打开首页
2. 理解产品定位是“Agent 构筑竞技场”
3. 看见经典战役卡片与进入 `/arena` 的入口
4. 点击进入 `/arena`

成功标准：
- 用户知道首页的经典战役仍然是 demo 展示
- 用户知道 `/arena` 才是真实双人接入主流程

## 流程 2：连接双参与者
1. 用户进入 `/arena`
2. 系统读取 `/api/participants`
3. 页面显示 `alpha` / `beta` 两个参与者槽位
4. 用户分别连接两个 `SecondMe` 账号
5. 页面显示双方真实：
   - 身份信息
   - `shades`
   - `soft memory`

成功标准：
- 用户知道当前 battle 是谁和谁在对战
- 用户能明确看到双方是否都已连接完成

## 流程 3：预览真实 persona build
1. 用户选择辩题
2. 用户点击 preview
3. 后端基于双方真实资料生成 fighter profile
4. 页面展示：
   - 双方 persona
   - predicted edges
   - build notes
   - identity summary
   - memory anchors

成功标准：
- 用户理解系统不是拿随机 seed 在打
- 用户能看到真实资料如何影响 build

## 流程 4：开始真实 battle
1. 用户点击开始对战
2. 后端生成 battle package
3. battle package 同时记录：
   - `participantRefs`
   - `sourceMeta`
4. 系统 best-effort 写回 `SecondMe agent_memory`
5. 前端跳转 `/arena/[battleId]`

成功标准：
- battle 能从真实双参与者资料出发生成
- 即使 AI overlay 失败，battle 主流程仍能继续

## 流程 5：观战与理解
1. 用户进入 `/arena/[battleId]`
2. 回放自动开始
3. 用户看到回合推进、攻击、防守、弱点命中
4. 用户能理解为什么血量和比分发生变化
5. 用户看到终局结果与三大高光

成功标准：
- 战斗不是黑箱
- 回放页能消费新的真实 battle package

## 流程 6：录屏与继续观看
1. 用户在回放页点击录制
2. 浏览器录制 canvas 舞台
3. 回放结束或用户手动停止
4. 用户下载 WebM
5. 用户看到 rematch / replay anchor

成功标准：
- 有一段可直接演示和传播的素材
- replay 不依赖首页 demo 数据

## 流程 7：查看历史战报
1. 用户从 `/arena` 进入 `/arena/history`
2. 页面读取已持久化的 battle summary 列表
3. 用户点击某一场 battle
4. 进入 `/arena/[battleId]`
5. 页面从持久化 battle snapshot 回放

成功标准：
- 刷新或重启后，历史 battle 仍可回看
- 历史页不依赖 localStorage 中是否还有 battle 缓存
