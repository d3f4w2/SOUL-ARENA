# 环境变量

## 当前必须的变量
- `SECONDME_CLIENT_ID`
- `SECONDME_CLIENT_SECRET`
- `SECONDME_REDIRECT_URI`
- `SECONDME_API_BASE_URL`
- `SECONDME_OAUTH_URL`
- `SECONDME_SCOPES`
- `ZHIHU_APP_KEY`
- `ZHIHU_APP_SECRET`
- `ZHIHU_OPENAPI_BASE_URL`

## 变量用途
### SecondMe
- 登录与回调
- 读取用户资料
- 读取标签 / 软记忆
- 聊天与笔记

### Zhihu
- 热榜 signal
- 搜索结果
- 圈子交互能力

## Arena MVP 说明
当前 arena 主线本身不额外依赖新的 env 变量。

也就是说：

- 即使没有接通更复杂的 battle 后端
- 只要当前已有的环境变量完整
- 就能跑现有的主线演示

## 缺失变量时的预期行为
- 缺少 `SecondMe` 变量
  - 登录与 seed 能力不可用
  - arena 仍应允许本地手动输入继续演示

- 缺少 `Zhihu` 变量
  - 外部 signal 无法读取
  - 内置 topic 仍应可用

## 部署提醒
线上环境中最容易出错的是：

- `SECONDME_REDIRECT_URI`

它必须和线上域名以及 `SecondMe` 开发者平台回调地址完全一致。
