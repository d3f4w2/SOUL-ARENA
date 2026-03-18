# 页面地图

## 当前页面
### `/`
首页，已实现

包含：
- 品牌说明
- 核心循环说明
- Soul 天赋说明
- 经典战役预告板
- 进入 `/arena` 的 CTA

说明：
- 当前首页战役卡片仍是本地 demo 数据
- 主要作用是解释玩法和承接到真实接入控制台

### `/arena`
真实接入控制台，已实现

包含：
- `alpha` / `beta` 双参与者槽位
- `SecondMe` 连接状态
- 双方真实身份信息
- 双方 `shades`
- 双方 `soft memory`
- 辩题选择
- preview 生成
- battle 发起

说明：
- 这是当前真实主流程入口
- 不再是旧的单人构筑工作台

### `/arena/[battleId]`
战斗回放页，已实现

包含：
- canvas 舞台
- 播放控制
- WebM 录制
- 事件流
- 战斗解释
- 三大高光
- 评委点评
- replay anchor / challenger preview

### `/arena/history`
历史战报页，已实现

包含：
- 已持久化 battle 列表
- battle 时间
- 双方名称
- winner
- 进入 replay 的入口

说明：
- 当前只提供最小历史回看能力
- 不包含分享、筛选、rematch
## 后续页面
- `/arena/rankings`
  - 排行榜
- `/arena/battles/[battleId]/share`
  - 单场战役分享页
