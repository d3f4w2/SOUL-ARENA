# 战斗可解释性

## 目标
避免 battle 看起来像黑箱扣血。

## 当前已实现
- 构筑预览中的战术建议
- battle 事件流
- 弱点命中提示
- 终局高光
- 评委点评

## 当前代码入口
- `src/lib/arena.ts`
- `src/components/arena-builder.tsx`
- `src/components/battle-replay.tsx`

## 当前缺口
- 还没有更细的“因果链”展示
- 还没有可展开的回合详情
- 还没有更完整的评分解释

## 验收点
- battle 中的重要变化都有文本解释
- 结果页能输出三大高光
- 用户能理解为什么赢/输
