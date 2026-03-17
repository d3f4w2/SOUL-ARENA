# Arena MVP

## 目标
先证明 `Soul Arena` 的主线成立：

- 用户能完成构筑
- 用户能看到可解释战斗
- 用户能获得高光与录屏素材

## 当前已实现
- 首页落地页
- 构筑工作台
- build 预览
- battle package 生成
- 战斗回放页
- 高光与挑战者预告
- WebM 导出

## 当前代码入口
- `src/components/soul-arena-app.tsx`
- `src/components/arena-builder.tsx`
- `src/components/battle-replay.tsx`
- `src/lib/arena.ts`

## 当前缺口
- battle 仍是生成式逻辑，不是真实多 Agent 对战
- 没有 battle 历史库
- 没有投票与排行榜

## 验收点
- 用户可以从首页进入 `/arena`
- 用户可以完成一次构筑并开战
- 用户可以看懂 battle 结果
- 用户可以导出录屏
