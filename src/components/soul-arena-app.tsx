"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

type ChatMessage = { content: string; role: "assistant" | "system" | "user" };
type Session = {
  authenticated: boolean;
  session?: { expiresAt: number | null };
  user?: { email?: string; id?: string; name?: string; route?: string; secondMeId?: string } | null;
};

const scopes = ["user.info", "user.info.shades", "user.info.softmemory", "chat", "note.add", "voice"];
const rings = [
  { id: "2001009660925334090", label: "Agent 社交实验场" },
  { id: "2015023739549529606", label: "Reconnect 公开试验区" },
];
const stripHtml = (value?: string) => (value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const short = (value?: string, max = 120) => {
  const text = stripHtml(value);
  return text.length > max ? `${text.slice(0, max)}...` : text;
};
const formatTime = (value: number | null | undefined) =>
  value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "未记录";

async function asJson(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text || "请求失败" };
  }
}

export function SoulArenaApp() {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [session, setSession] = useState<Session | null>(null);
  const [shades, setShades] = useState<string[]>([]);
  const [memories, setMemories] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "system", content: "Soul Arena 已就绪。" }]);
  const [chatInput, setChatInput] = useState("");
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("把今天的想法写入 SecondMe。");
  const [noteStatus, setNoteStatus] = useState<string | null>(null);
  const [ringId, setRingId] = useState(rings[0].id);
  const [pins, setPins] = useState<Array<Record<string, unknown>>>([]);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [comments, setComments] = useState<Array<Record<string, unknown>>>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentStatus, setCommentStatus] = useState<string | null>(null);
  const [publishTitle, setPublishTitle] = useState("Soul Arena 观察");
  const [publishContent, setPublishContent] = useState("SecondMe 和知乎实验能力已经接进一个可运行的 GUI 控制台。");
  const [publishStatus, setPublishStatus] = useState<string | null>(null);
  const [billboard, setBillboard] = useState<Array<Record<string, unknown>>>([]);
  const [searchQuery, setSearchQuery] = useState("SecondMe");
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [searchItems, setSearchItems] = useState<Array<Record<string, unknown>>>([]);

  const oauthHint = searchParams.get("error")
    ? `OAuth 回调异常：${searchParams.get("error")}`
    : searchParams.get("warning")
      ? `OAuth 告警：${searchParams.get("warning")}`
      : null;
  const activePin = pins.find((pin) => String(pin.pin_id ?? "") === String(selectedPin ?? ""));

  async function loadSession() {
    const me = (await (await fetch("/api/me", { cache: "no-store" })).json()) as Session;
    startTransition(() => setSession(me));
    if (!me.authenticated) return;
    const [shadesPayload, memoryPayload] = await Promise.all([
      asJson(await fetch("/api/secondme/shades", { cache: "no-store" })),
      asJson(await fetch("/api/secondme/softmemory", { cache: "no-store" })),
    ]);
    setShades((((shadesPayload.data as { shades?: Array<Record<string, unknown>> } | undefined)?.shades) ?? []).map((item) => String(item.label ?? item.name ?? "未命名标签")));
    setMemories((((memoryPayload.data as { list?: Array<Record<string, unknown>> } | undefined)?.list) ?? []).map((item) => short(String(item.summary ?? item.text ?? item.content ?? "空白记忆"), 80)));
  }

  async function loadRing(nextRingId: string) {
    const payload = await asJson(await fetch(`/api/zhihu/ring?ringId=${nextRingId}&pageNum=1&pageSize=5`, { cache: "no-store" }));
    const list = ((payload.data as { contents?: Array<Record<string, unknown>> } | undefined)?.contents) ?? [];
    setPins(list);
    setSelectedPin(list[0]?.pin_id ? String(list[0].pin_id) : null);
  }

  async function loadComments(pinToken: string) {
    const payload = await asJson(await fetch(`/api/zhihu/comment?contentType=pin&contentToken=${pinToken}&pageNum=1&pageSize=6`, { cache: "no-store" }));
    setComments(((payload.data as { comments?: Array<Record<string, unknown>> } | undefined)?.comments) ?? []);
  }

  async function loadBillboard() {
    const payload = await asJson(await fetch("/api/zhihu/billboard?topCnt=5&publishInHours=48", { cache: "no-store" }));
    setBillboard(((payload.data as { list?: Array<Record<string, unknown>> } | undefined)?.list) ?? []);
  }

  async function runSearch(query: string) {
    setSearchStatus("可信搜检索中...");
    const payload = await asJson(await fetch(`/api/zhihu/search?query=${encodeURIComponent(query)}&count=6`, { cache: "no-store" }));
    const items = ((payload.data as { items?: Array<Record<string, unknown>> } | undefined)?.items) ?? [];
    setSearchItems(items);
    setSearchStatus(items.length ? "结果已更新" : "没有结果");
  }

  useEffect(() => { void loadSession(); void loadBillboard(); void runSearch("SecondMe"); }, []);
  useEffect(() => { void loadRing(ringId); }, [ringId]);
  useEffect(() => { if (selectedPin) void loadComments(selectedPin); }, [selectedPin]);

  async function sendChat(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chatInput.trim() || !session?.authenticated || chatBusy) return;
    const prompt = chatInput.trim();
    setChatBusy(true);
    setChatError(null);
    setChatInput("");
    setMessages((current) => [...current, { role: "user", content: prompt }, { role: "assistant", content: "" }]);
    try {
      const response = await fetch("/api/secondme/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appId: "soul-arena", message: prompt, sessionId: chatSessionId ?? undefined, systemPrompt: "你是 Soul Arena 的 Agent 搭档，用简短中文回应。" }) });
      if (!response.ok || !response.body) throw new Error(String((await asJson(response)).message ?? "聊天请求失败"));
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let eventType = "message";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        for (const raw of lines) {
          const line = raw.trimEnd();
          if (!line) { eventType = "message"; continue; }
          if (line.startsWith("event:")) { eventType = line.slice(6).trim(); continue; }
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          if (eventType === "session") { try { const parsed = JSON.parse(payload) as { sessionId?: string }; if (parsed.sessionId) setChatSessionId(parsed.sessionId); } catch {} continue; }
          try {
            const parsed = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
            const delta = parsed.choices?.[0]?.delta?.content ?? "";
            if (!delta) continue;
            setMessages((current) => { const next = [...current]; const last = next.length - 1; next[last] = { ...next[last], content: `${next[last].content}${delta}` }; return next; });
          } catch {}
        }
      }
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "聊天失败");
    } finally {
      setChatBusy(false);
    }
  }

  async function saveNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteDraft.trim() || !session?.authenticated) return;
    const payload = await asJson(await fetch("/api/secondme/note", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: noteDraft.trim(), title: noteDraft.trim().slice(0, 18) }) }));
    setNoteStatus((payload.code as number | undefined) === 0 ? `已写入笔记，noteId=${String((payload.data as { noteId?: number } | undefined)?.noteId ?? "未知")}` : String(payload.message ?? "写入失败"));
  }

  async function publishPin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = await asJson(await fetch("/api/zhihu/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: publishTitle, content: publishContent, ringId, imageUrls: [] }) }));
    setPublishStatus((payload.status as number | undefined) === 0 ? "发帖成功" : String(payload.msg ?? "发帖失败"));
    await loadRing(ringId);
  }

  async function likePin(pinToken: string) {
    const payload = await asJson(await fetch("/api/zhihu/reaction", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contentToken: pinToken, contentType: "pin", actionValue: 1 }) }));
    setCommentStatus((payload.status as number | undefined) === 0 ? "已发送点赞" : String(payload.msg ?? "点赞失败"));
    await loadRing(ringId);
  }

  async function createComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPin || !commentDraft.trim()) return;
    const payload = await asJson(await fetch("/api/zhihu/comment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: commentDraft, contentToken: selectedPin, contentType: "pin" }) }));
    setCommentStatus((payload.status as number | undefined) === 0 ? "评论已发布" : String(payload.msg ?? "评论失败"));
    setCommentDraft("");
    await loadComments(selectedPin);
  }

  return (
    <main className="paper-grid grain relative min-h-screen overflow-hidden px-4 py-6 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="entry-fade paper-panel rounded-[2rem] px-6 py-8 sm:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.9fr]">
            <div className="space-y-5">
              <span className="accent-chip inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.28em]">SecondMe x Zhihu Hackathon Console</span>
              <div><h1 className="display-title">Soul Arena</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-stone-700">把身份、记忆、聊天和社区实验能力放进同一张控制台，直接展示黑客松技术底座。</p></div>
              <div className="flex flex-wrap gap-3">{session?.authenticated ? <button className="soft-button rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white" onClick={() => void fetch("/api/auth/logout", { method: "POST" }).then(() => { setSession({ authenticated: false, session: { expiresAt: null }, user: null }); setShades([]); setMemories([]); })} type="button">退出 SecondMe</button> : <a className="soft-button rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white" href="/api/auth/login">连接 SecondMe OAuth</a>}<button className="soft-button rounded-full border border-[var(--line)] bg-white/70 px-5 py-3 text-sm" onClick={() => void loadSession()} type="button">刷新会话</button></div>
              <div className="flex flex-wrap gap-2">{scopes.map((scope) => <span key={scope} className="accent-chip rounded-full px-3 py-1 text-xs">{scope}</span>)}</div>
            </div>
            <div className="paper-panel-strong rounded-[1.75rem] p-6 text-sm leading-7"><p className="text-sm uppercase tracking-[0.24em] text-stone-500">Live Status</p><div className="mt-4 space-y-3"><p><span className="muted-copy">用户：</span>{session?.user?.name ?? "尚未连接"}</p><p><span className="muted-copy">Route：</span>{session?.user?.route ?? "登录后读取"}</p><p><span className="muted-copy">Token 有效期：</span>{formatTime(session?.session?.expiresAt)}</p><p><span className="muted-copy">提示：</span>{oauthHint ?? "真实密钥已写入本地 .env.local"}</p></div></div>
          </div>
        </section>
        <section className="grid gap-6 lg:grid-cols-2">
          <article className="entry-fade paper-panel rounded-[1.75rem] p-6"><h2 className="section-title">SecondMe 画像</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><div className="paper-panel-strong rounded-[1.4rem] p-5 text-sm"><p className="font-semibold">基础资料</p><div className="mt-3 space-y-2"><p>姓名：{session?.user?.name ?? "未登录"}</p><p>邮箱：{session?.user?.email ?? "未返回"}</p><p>ID：{session?.user?.secondMeId ?? session?.user?.id ?? "未返回"}</p></div></div><div className="grid gap-4"><div className="paper-panel-strong rounded-[1.4rem] p-5 text-sm"><p className="font-semibold">兴趣标签</p><div className="mt-3 flex flex-wrap gap-2">{shades.length ? shades.slice(0, 8).map((shade) => <span key={shade} className="accent-chip rounded-full px-3 py-1 text-xs">{shade}</span>) : <span className="text-stone-500">登录后读取 `user.info.shades`</span>}</div></div><div className="paper-panel-strong rounded-[1.4rem] p-5 text-sm"><p className="font-semibold">软记忆片段</p><div className="mt-3 space-y-2">{memories.length ? memories.slice(0, 3).map((item, index) => <p key={`${item}-${index}`} className="rounded-2xl bg-white/75 px-3 py-2">{item}</p>) : <span className="text-stone-500">登录后读取 `user.info.softmemory`</span>}</div></div></div></div></article>
          <article className="entry-fade paper-panel rounded-[1.75rem] p-6"><h2 className="section-title">SecondMe Chat + Note</h2><div className="mt-5 rounded-[1.6rem] border border-[var(--line)] bg-white/72 p-4"><div className="max-h-[260px] space-y-3 overflow-y-auto">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`rounded-3xl px-4 py-3 text-sm leading-7 ${message.role === "user" ? "ml-auto max-w-[88%] bg-[var(--accent)] text-white" : message.role === "assistant" ? "max-w-[92%] bg-stone-100 text-stone-700" : "max-w-[92%] border border-dashed border-[var(--line)] text-stone-500"}`}>{message.content || "等待流式返回..."}</div>)}</div><form className="mt-4 grid gap-3" onSubmit={sendChat}><textarea className="min-h-24 rounded-[1.2rem] border border-[var(--line)] bg-white px-4 py-3 outline-none" onChange={(event) => setChatInput(event.target.value)} placeholder="例如：请根据我的画像，给我一个黑客松产品方向。" value={chatInput} /><div className="flex flex-wrap items-center gap-3"><button className="soft-button rounded-full bg-[var(--olive)] px-5 py-3 text-sm text-white" disabled={!session?.authenticated || chatBusy} type="submit">{chatBusy ? "流式返回中..." : "发送到 SecondMe"}</button><span className="text-sm text-stone-500">{chatError ?? "后端会直接代理上游 SSE。"}</span></div></form></div><form className="mt-5 grid gap-4" onSubmit={saveNote}><textarea className="min-h-32 rounded-[1.4rem] border border-[var(--line)] bg-white px-4 py-3 outline-none" onChange={(event) => setNoteDraft(event.target.value)} value={noteDraft} /><button className="soft-button rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white" disabled={!session?.authenticated} type="submit">写入我的 SecondMe 笔记</button><p className="text-sm text-stone-500">{noteStatus ?? "适合把摘要、观察和画像结论回写到记忆层。"}</p></form></article>
        </section>
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="entry-fade paper-panel rounded-[1.75rem] p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="section-title">知乎圈子实验场</h2><select className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" onChange={(event) => setRingId(event.target.value)} value={ringId}>{rings.map((ring) => <option key={ring.id} value={ring.id}>{ring.label}</option>)}</select></div><div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"><div className="grid gap-3">{pins.map((pin) => { const token = String(pin.pin_id ?? ""); const selected = token === selectedPin; return <article key={token} className={`rounded-[1.35rem] border px-4 py-4 ${selected ? "border-[var(--accent)] bg-white" : "border-[var(--line)] bg-white/70"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{String(pin.author_name ?? "匿名用户")}</p><p className="mt-2 text-sm leading-7 text-stone-700">{short(String(pin.content ?? ""), 150)}</p></div><button className="soft-button rounded-full border border-[var(--line)] px-3 py-1 text-xs" onClick={() => setSelectedPin(token)} type="button">查看</button></div><div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-500"><span>赞 {String(pin.like_num ?? 0)}</span><span>评 {String(pin.comment_num ?? 0)}</span><button className="soft-button rounded-full border border-[var(--line)] px-3 py-1 text-xs" onClick={() => void likePin(token)} type="button">点赞</button></div></article>; })}</div><div className="grid gap-4"><div className="rounded-[1.35rem] border border-[var(--line)] bg-white/75 p-4 text-sm"><p className="font-semibold">当前内容</p><p className="mt-3 leading-7 text-stone-700">{activePin ? stripHtml(String(activePin.content ?? "")) : "请选择左侧内容查看评论流。"}</p><div className="mt-4 space-y-2">{comments.length ? comments.slice(0, 5).map((comment) => <article key={String(comment.comment_id ?? "")} className="rounded-2xl border border-[var(--line)] bg-stone-50 px-3 py-2"><p className="font-semibold">{String(comment.author_name ?? "匿名")}</p><p className="mt-1">{short(String(comment.content ?? ""), 88)}</p></article>) : <p className="text-stone-500">评论列表将在这里显示。</p>}</div></div><form className="rounded-[1.35rem] border border-[var(--line)] bg-white/75 p-4" onSubmit={createComment}><p className="text-sm font-semibold">对选中内容发评论</p><textarea className="mt-3 min-h-24 w-full rounded-2xl border border-[var(--line)] bg-white px-3 py-3 outline-none" onChange={(event) => setCommentDraft(event.target.value)} value={commentDraft} /><div className="mt-3 flex flex-wrap items-center gap-3"><button className="soft-button rounded-full bg-[var(--olive)] px-4 py-2 text-sm text-white" disabled={!selectedPin} type="submit">发表评论</button><span className="text-xs text-stone-500">{commentStatus ?? "支持一级评论。"}</span></div></form></div></div></article>
          <article className="entry-fade paper-panel rounded-[1.75rem] p-6"><h2 className="section-title">往圈子发一条想法</h2><form className="mt-5 grid gap-4" onSubmit={publishPin}><input className="rounded-full border border-[var(--line)] bg-white px-4 py-3 outline-none" onChange={(event) => setPublishTitle(event.target.value)} value={publishTitle} /><textarea className="min-h-32 rounded-[1.35rem] border border-[var(--line)] bg-white px-4 py-3 outline-none" onChange={(event) => setPublishContent(event.target.value)} value={publishContent} /><button className="soft-button rounded-full bg-[var(--accent)] px-5 py-3 text-sm text-white" type="submit">发布到当前圈子</button><p className="text-sm text-stone-500">{publishStatus ?? "仅向白名单圈子发帖。"}</p></form></article>
        </section>
        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="entry-fade paper-panel rounded-[1.75rem] p-6"><h2 className="section-title">知乎热榜</h2><div className="mt-5 grid gap-3">{billboard.map((item, index) => <article key={`${String(item.token ?? "")}-${index}`} className="rounded-[1.25rem] border border-[var(--line)] bg-white/75 px-4 py-4"><p className="text-xs uppercase tracking-[0.2em] text-stone-500">Top {index + 1} · {String(item.type ?? "Question")}</p><p className="mt-2 text-base font-semibold leading-7">{String(item.title ?? "未命名话题")}</p><p className="mt-2 text-sm text-stone-600">{short(String(item.body ?? (item.answers as Array<{ body?: string }> | undefined)?.[0]?.body ?? ""), 110)}</p><div className="mt-3 flex justify-between text-xs text-stone-500"><span>热度 {String(item.heat_score ?? 0)}</span><span>{String(item.published_time_str ?? "未知时间")}</span></div></article>)}</div></article>
          <article className="entry-fade paper-panel rounded-[1.75rem] p-6"><h2 className="section-title">知乎全网可信搜</h2><form className="mt-5 flex flex-col gap-3 md:flex-row" onSubmit={(event) => { event.preventDefault(); void runSearch(searchQuery); }}><input className="flex-1 rounded-full border border-[var(--line)] bg-white px-4 py-3 outline-none" onChange={(event) => setSearchQuery(event.target.value)} value={searchQuery} /><button className="soft-button rounded-full bg-[var(--olive)] px-5 py-3 text-sm text-white" type="submit">发起检索</button></form><p className="mt-3 text-sm text-stone-500">{searchStatus ?? "服务端已加基础缓存与节流。"}</p><div className="mt-5 grid gap-3">{searchItems.map((item) => <article key={String(item.content_id ?? "")} className="rounded-[1.25rem] border border-[var(--line)] bg-white/75 px-4 py-4"><div className="flex items-center justify-between gap-3"><p className="text-base font-semibold">{String(item.title ?? "无标题内容")}</p><span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-stone-500">authority {String(item.authority_level ?? "?")}</span></div><p className="mt-2 text-sm text-stone-600">{short(String(item.content_text ?? ""), 140)}</p><div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-500"><span>{String(item.author_name ?? "匿名作者")}</span><span>赞 {String(item.vote_up_count ?? 0)}</span><span>评 {String(item.comment_count ?? 0)}</span>{item.url ? <a className="text-[var(--accent)]" href={String(item.url)} rel="noreferrer" target="_blank">打开原文</a> : null}</div></article>)}</div></article>
        </section>
        <section className="entry-fade paper-panel rounded-[1.75rem] p-6"><div className="grid gap-6 lg:grid-cols-[1fr_1fr_0.75fr]"><div><p className="text-xs uppercase tracking-[0.26em] text-stone-500">Integration Notes</p><h2 className="section-title mt-2">当前落地范围</h2><p className="mt-4 text-sm leading-7 text-stone-600">已接入 SecondMe OAuth、资料拉取、画像读取、聊天流代理、笔记写入，以及知乎圈子、评论、点赞、热榜和可信搜。</p></div><div><p className="text-xs uppercase tracking-[0.26em] text-stone-500">Safety</p><h2 className="section-title mt-2">凭证策略</h2><p className="mt-4 text-sm leading-7 text-stone-600">所有密钥都保存在本地 `.env.local`。前端只访问本地 API，不直接接触 `Client Secret` 或知乎 `app_secret`。</p></div><div className="rounded-[1.4rem] border border-[var(--line)] bg-white/75 p-5"><p className="text-xs uppercase tracking-[0.24em] text-stone-500">Runtime</p><p className="mt-3 text-4xl font-semibold">{isPending ? "busy" : "ready"}</p><p className="mt-3 text-sm text-stone-500">`npm run dev` 后即可本地演示。</p></div></div></section>
      </div>
    </main>
  );
}
