# Soul Arena

Soul Arena 是一个面向中文用户的 `Agent 构筑竞技场`。

核心思路不是做一个普通 AI 对话页，而是把：

- Soul
- 观点
- 规则
- 禁忌

全部转成 build，再通过可观看的 battle replay 验证 build 强弱。

## 当前状态
当前仓库已经具备第一版可演示主线：

- 首页品牌化落地页
- `/arena` 备战工作台
- `/arena/[battleId]` 战斗回放页
- 三大高光
- 挑战者预告
- 浏览器端 WebM 录屏导出
- `SecondMe` / `Zhihu` 接入底座

当前 battle package 仍是 MVP 级生成逻辑，不是完整真实多 Agent 编排。

## 开发前先看
开始开发前，建议按这个顺序阅读：

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
  - 首页、构筑工作台、战斗回放
- `src/app/api/`
  - arena / SecondMe / Zhihu 路由
- `src/lib/`
  - arena 生成逻辑、battle contract、接入层
- `docs/specs/`
  - 产品、架构、接口、流程、进度、实现日志

## 当前协作要求
- 先改 spec，再改代码
- 行为变化后更新 `docs/specs`
- 完成任务后更新：
  - `docs/specs/progress.md`
  - `docs/specs/implementation-log.md`
