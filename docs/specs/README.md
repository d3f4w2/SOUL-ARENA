# Specs 说明

`docs/specs` 是当前 `Soul Arena` 的轻量协作文档中枢。

目标不是堆很多流程文档，而是保证任何一个人打开仓库后，都能快速知道：

- 当前产品到底已经做到哪里
- 哪些能力是真实接入
- 哪些能力仍然是 demo / legacy / mock
- 下一步应该往哪里推进

## 使用原则
- 文档以当前事实为准，不写理想态空话
- 只要影响产品行为、接口、页面流程，就要同步 spec
- 行为变更后，优先更新 feature / flow / contract，再动实现

## 当前最重要的事实
- `/arena` 现在是双 `SecondMe` 真实接入控制台，不再是旧的单人构筑表单主流程
- 真实 preview / battle 已经基于两位真实 `SecondMe` 参与者生成
- battle outcome 已有 best-effort `agent_memory` 写回
- 首页经典战役仍然使用本地 demo battle 数据
- `openclaw` 尚未接入
- battle 持久化尚未实现

## 核心文件
- `product.md`
  - 当前产品定义、目标用户、主线价值
- `architecture.md`
  - 当前分层、关键数据流、battle package 与扩展方向
- `api/contracts.md`
  - 当前真实路由与接口契约
- `ui/flows.md`
  - 当前页面行为与关键用户路径
- `progress.md`
  - 当前进度、下一步与风险
- `implementation-log.md`
  - 已完成实现的事实记录
- `features/*.md`
  - 某个能力的目标、现状、入口与缺口

## 推荐阅读顺序
1. `product.md`
2. `architecture.md`
3. `api/contracts.md`
4. `ui/flows.md`
5. `progress.md`
6. `implementation-log.md`

## 更新顺序
1. 更新对应 feature 文档
2. 必要时更新 `ui/flows.md` 或 `api/contracts.md`
3. 再改代码
4. 完成后更新 `progress.md`
5. 追加 `implementation-log.md`
