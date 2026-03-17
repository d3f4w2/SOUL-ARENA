# 战斗回放与录屏

## 目标
让 battle 既能看、也能录、还能作为演示素材导出。

## 当前已实现
- 自动回放
- 暂停/继续
- canvas 舞台
- 事件流
- 浏览器端 WebM 录制
- 录制后下载

## 当前代码入口
- `src/components/battle-replay.tsx`
- `src/app/api/arena/battles/[battleId]/route.ts`
- `src/app/api/arena/battles/[battleId]/events/route.ts`

## 当前缺口
- 录制仍依赖浏览器 `MediaRecorder`
- 没有服务端视频导出
- 没有更高级的时间轴控制

## 验收点
- battle 页能自动回放
- 用户能手动开始/停止录制
- 支持浏览器中能导出 `WebM`
