# 接口契约

## 说明
- 接口路径、字段名、类型名保持英文稳定
- 本文档用中文解释当前接口用途与状态
- 状态说明：
  - `已实现`
  - `MVP/mock`
  - `后续扩展`

## 已有接入接口
### 身份与接入
- `GET /api/me`
  - 状态：已实现
  - 作用：返回当前 `SecondMe` 登录态与用户基础信息

- `POST /api/auth/logout`
  - 状态：已实现
  - 作用：清理当前登录 cookie

### SecondMe
- `POST /api/secondme/chat`
  - 状态：已实现
  - 作用：代理聊天流

- `POST /api/secondme/note`
  - 状态：已实现
  - 作用：写入笔记

- `GET /api/secondme/shades`
  - 状态：已实现
  - 作用：读取标签，用于用户 seed

- `GET /api/secondme/softmemory`
  - 状态：已实现
  - 作用：读取软记忆

### Zhihu
- `GET /api/zhihu/ring`
  - 状态：已实现
  - 作用：读取圈子内容

- `GET /api/zhihu/billboard`
  - 状态：已实现
  - 作用：读取热榜

- `GET /api/zhihu/search`
  - 状态：已实现
  - 作用：读取搜索结果

- `POST /api/zhihu/publish`
- `POST /api/zhihu/reaction`
- `GET/POST/DELETE /api/zhihu/comment`
  - 状态：已实现
  - 作用：保留圈子互动能力

## Arena 接口
### `GET /api/arena/topics`
- 状态：已实现
- 返回：
  - `topics`
  - `challengers`
  - `signals`
- 说明：
  - `signals` 来自 Zhihu 热榜
  - 当前作为 topic inspiration 使用

### `POST /api/arena/build-preview`
- 状态：已实现
- 请求：
  - `topicId`
  - `challengerId`
  - `player`
    - `displayName`
    - `declaration`
    - `soulSeedTags`
    - `viewpoints`
    - `rule`
    - `taboo`
- 返回：
  - `topic`
  - `challenger`
  - `player`
  - `defender`
  - `equipmentNotes`
  - `matchUpCallout`
  - `predictedEdges`

### `POST /api/arena/battles`
- 状态：已实现
- 作用：根据 build 输入生成完整 battle package
- 当前说明：
  - battle package 为本地生成逻辑
  - 属于 `MVP/mock` 驱动，不是真实多 Agent 编排

### `GET /api/arena/battles/:battleId`
- 状态：已实现
- 作用：读取单场 battle package
- 当前说明：
  - 当前依赖轻量 battle store
  - 不适合长期历史沉淀

### `GET /api/arena/battles/:battleId/events`
- 状态：已实现
- 作用：读取 battle event 列表

## Battle Package 关键结构
battle package 当前至少包含：

- `topic`
- `player`
- `defender`
- `judges`
- `highlights`
- `challengerPreview`
- `crowdScore`
- `finalScore`
- `winnerId`
- `events`

## Battle Event Types
当前约定的事件类型：

- `intro`
- `round_start`
- `build_hint`
- `attack`
- `defense`
- `weakness_hit`
- `score_update`
- `spotlight`
- `match_end`
- `challenger_preview`

## 当前接口现实
- 路径已经稳定
- battle package 结构已经可供前后端并行使用
- 下一步重点不是改路径，而是把 `MVP/mock` 的 battle 逻辑替换成更真实的 battle orchestration
