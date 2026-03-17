# SecondMe 接入

## 目标
把 `SecondMe` 作为用户身份和 fighter seed 来源，而不是强依赖入口。

## 当前已实现
- 登录
- 用户资料读取
- 标签读取
- 软记忆读取
- 聊天与笔记能力
- `/arena` 中用标签给构筑提供 seed

## 当前代码入口
- `src/lib/secondme.ts`
- `src/app/api/me/route.ts`
- `src/app/api/secondme/*`
- `src/components/arena-builder.tsx`

## 当前缺口
- 还没有真正把用户的长期 persona 深度映射到 fighter
- 还没有把聊天/笔记能力接进 battle 编排

## 验收点
- 已登录用户进入 `/arena` 时能看到来自 `SecondMe` 的 seed 信息
- 未登录用户也能继续玩主线
