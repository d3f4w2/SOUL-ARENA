# Zhihu 接入

## 目标
把 `Zhihu` 作为 topic 和 signal 层，而不是 battle 主引擎。

## 当前已实现
- 热榜读取
- 搜索读取
- 圈子相关读写接口
- `/api/arena/topics` 中把热榜 signal 暴露给构筑页

## 当前代码入口
- `src/lib/zhihu.ts`
- `src/app/api/zhihu/*`
- `src/app/api/arena/topics/route.ts`
- `src/components/arena-builder.tsx`

## 当前缺口
- 还没有真正根据热榜自动生成 topic
- 还没有把搜索结果更深地接到 build 逻辑里
- 还没有把圈子互动并入 battle 主线

## 验收点
- 构筑页能看到至少一条来自 Zhihu 的 signal
- 即使 Zhihu 不可用，arena 主线也能继续
