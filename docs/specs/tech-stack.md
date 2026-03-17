# 技术栈

## 当前运行栈
- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS v4

## 现有接入
- `SecondMe`
  - OAuth
  - 用户资料 / 标签 / 软记忆
  - 聊天 / 笔记
- `Zhihu`
  - 热榜
  - 搜索
  - 圈子相关能力

## Arena MVP 相关实现
- `src/lib/arena.ts`
  本地生成 build 分析与 battle package
- `canvas`
  作为 battle stage 的稳定渲染面
- 浏览器 `MediaRecorder`
  用于 `WebM` 导出
- 轻量 battle store
  先支撑 MVP 演示，再考虑数据库持久化

## 为什么这么选
- 不换技术栈，避免迁移成本
- App Router 适合当前页面结构
- canvas 比 DOM 更适合稳定录屏
- 浏览器录屏比服务端视频生成更适合黑客松交付
- arena contract 独立后，前后端可以并行推进

## 当前权衡
- 优先“能演示、能解释、能录屏”
- 暂不引入重型数据库与任务编排
- 暂不实现服务端视频生产流水线
