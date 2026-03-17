# Specs 说明

`docs/specs` 是当前 `Soul Arena` 的轻量协作文档中枢。

目标不是做一套重流程文档，而是保证团队里任何一个人打开仓库后，都能快速理解：

- 产品当前到底在做什么
- 代码已经做到哪里
- 哪些能力是真实实现
- 哪些能力还是 MVP/mock
- 接下来怎么并行开发

## 使用原则
- 文档以当前事实为准，不写理想化空话
- 行为变更时，先改 spec 再改实现
- 只要影响产品行为、流程、接口，就必须更新 spec
- 小样式调整或无行为变化的重构，不强制写 spec

## 核心文件
- `product.md`
  当前产品定义、目标用户、MVP 主线、成功标准
- `architecture.md`
  当前系统模块、battle package、数据流、扩展方向
- `tech-stack.md`
  当前技术栈、使用原因、hackathon 权衡
- `progress.md`
  当前进度、阶段目标、风险
- `implementation-log.md`
  已完成实现的事实记录
- `features/*.md`
  各功能的目标、现状、代码入口、后续缺口
- `ui/*.md`
  页面地图、设计规则、关键流程
- `api/*.md`
  接口契约和环境变量要求

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
