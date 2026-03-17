# 架构说明

## 总体结构
当前项目分成三层：

### 1. 接入层
- `SecondMe`
  - 登录
  - 用户资料
  - 标签 / 软记忆
  - 聊天 / 笔记
- `Zhihu`
  - 热榜
  - 搜索
  - 圈子相关能力

这一层负责外部平台接入，不直接承担 battle 核心逻辑。

### 2. Arena 域层
核心在 `src/lib/arena.ts`，负责：

- 辩题预设
- 守擂者预设
- build 分析
- battle package 生成
- battle events 生成
- highlights / judge / challenger preview 生成

这层是当前产品逻辑的中心。

### 3. 展示层
主要页面与组件：

- `src/components/soul-arena-app.tsx`
  首页与经典战役预告板
- `src/components/arena-builder.tsx`
  备战工作台
- `src/components/battle-replay.tsx`
  回放舞台、事件流、战报、录屏导出

## 关键数据流
1. 前端进入 `/arena`
2. 读取 `/api/arena/topics`
   - 返回 topics
   - 返回 challengers
   - 返回来自 Zhihu 的 signal
3. 用户填写 build 输入
4. 前端调用 `/api/arena/build-preview`
5. 后端返回：
   - player / defender
   - build cards
   - equipment notes
   - predicted edges
6. 用户点击开始对战
7. 前端调用 `/api/arena/battles`
8. 后端返回完整 battle package
9. 前端跳转 `/arena/[battleId]`
10. 回放页消费 battle package，驱动 canvas 舞台与事件流
11. 用户可录制舞台并导出 `WebM`

## Battle Package
battle package 是当前最关键的内部稳定契约。它连接：

- battle 生成逻辑
- 前端回放页面
- 高光展示
- 挑战者预告
- 后续持久化与分享

当前 package 至少包含：

- metadata
- topic
- player / defender
- judges
- highlights
- challengerPreview
- finalScore / crowdScore
- ordered events

## 当前持久化策略
当前仍是 MVP 级轻量方案：

- battle package 在服务端内存中保存
- 前端本地也会缓存一份
- 目标是先保证演示流程能跑通

这意味着：

- 刷新与跨设备共享能力有限
- 还不适合做真正的历史战役库

## 下一步架构扩展
后续最优先的扩展方向：

1. 把 battle package 持久化到数据库
2. 把当前生成式 battle 改成真实对战编排
3. 把历史战报、排行榜、投票建立在同一份 package 契约上
