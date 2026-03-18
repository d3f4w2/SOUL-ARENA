"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type AudienceMember = {
  id: string;
  displayName: string;
  displayId: string | null;
  avatarDataUrl: string | null;
  createdAt: string;
};

type AudienceResponse = {
  members: AudienceMember[];
};

type JoinResponse = {
  member: AudienceMember;
};

export default function WatchPage() {
  const [displayName, setDisplayName] = useState("");
  const [displayId, setDisplayId] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch current audience count
  useEffect(() => {
    const fetchCount = () => {
      void fetch("/api/arena/audience", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: AudienceResponse | null) => {
          if (data?.members) setAudienceCount(data.members.length);
        })
        .catch(() => null);
    };
    fetchCount();
    const interval = setInterval(fetchCount, 10_000);
    return () => clearInterval(interval);
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleJoin = async () => {
    if (!displayName.trim()) {
      setError("请输入你的显示名称。");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/arena/audience", {
        body: JSON.stringify({
          displayName: displayName.trim(),
          displayId: displayId.trim() || undefined,
          avatarDataUrl: avatarDataUrl ?? undefined,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? "入场失败");
      }
      const data = (await res.json()) as JoinResponse;
      if (data.member) {
        setJoined(true);
        setAudienceCount((prev) => (prev ?? 0) + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "入场失败，请重试。");
    } finally {
      setPending(false);
    }
  };

  return (
    <main
      className="scanlines relative min-h-screen overflow-hidden px-4 py-10 sm:px-6 lg:px-10"
      style={{ color: "var(--text)" }}
    >
      <div className="mx-auto flex max-w-lg flex-col gap-6">

        {/* Header */}
        <div className="text-center">
          <div className="mk-badge mb-3" style={{ display: "inline-block" }}>观战入口</div>
          <h1
            className="mk-title mk-title-anim"
            style={{ fontSize: "clamp(1.8rem, 6vw, 3rem)", marginBottom: "0.5rem" }}
          >
            SOUL ARENA
          </h1>
          <p
            style={{
              fontFamily: "Impact, Arial Black, sans-serif",
              fontSize: "0.85rem",
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "var(--gold)",
              textShadow: "0 0 12px rgba(212,160,0,0.4)",
            }}
          >
            ENTER THE ARENA
          </p>
        </div>

        {/* Audience count */}
        {audienceCount !== null && (
          <div className="mk-status text-center" style={{ fontSize: "0.82rem" }}>
            当前场内观众：
            <span style={{ color: "var(--gold-bright)", fontFamily: "Impact, Arial Black, sans-serif", fontSize: "1.1rem" }}>
              {" "}{audienceCount}
            </span>{" "}人
          </div>
        )}

        {/* Join form or success */}
        {joined ? (
          <article className="entry-fade mk-panel p-8 flex flex-col gap-5 items-center text-center">
            <div
              style={{
                fontFamily: "Impact, Arial Black, sans-serif",
                fontSize: "2rem",
                color: "var(--gold-bright)",
                textShadow: "0 0 18px rgba(212,160,0,0.5)",
                letterSpacing: "0.08em",
              }}
            >
              ✓ 你已入场
            </div>
            <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.85rem", color: "var(--text-dim)", lineHeight: "1.8" }}>
              你的角色已出现在竞技场观众席中。前往回放页面即可看到自己的头像。
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link className="mk-button px-6 py-3" href="/arena">
                进入竞技场
              </Link>
              <Link className="mk-button-ghost px-5 py-3" href="/arena/history">
                查看战绩
              </Link>
            </div>
          </article>
        ) : (
          <article className="entry-fade mk-panel p-7 flex flex-col gap-5">
            <div>
              <div className="mk-label-red mb-2">观众注册</div>
              <h2 className="mk-section">加入观众席</h2>
            </div>

            {/* Display name */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="displayName"
                style={{
                  fontFamily: "Impact, Arial Black, sans-serif",
                  fontSize: "0.7rem",
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: "var(--red)",
                }}
              >
                显示名称 <span style={{ color: "var(--red-bright)" }}>*</span>
              </label>
              <input
                className="mk-input"
                id="displayName"
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="你的战场代号"
                style={{
                  background: "var(--bg-inset)",
                  border: "1px solid var(--border)",
                  borderRadius: "2px",
                  color: "var(--text-bright)",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "0.9rem",
                  outline: "none",
                  padding: "10px 14px",
                  width: "100%",
                }}
                type="text"
                value={displayName}
              />
            </div>

            {/* Display ID (optional) */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="displayId"
                style={{
                  fontFamily: "Impact, Arial Black, sans-serif",
                  fontSize: "0.7rem",
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                显示 ID（可选）
              </label>
              <input
                className="mk-input"
                id="displayId"
                onChange={(e) => setDisplayId(e.target.value)}
                placeholder="例如：#0042"
                style={{
                  background: "var(--bg-inset)",
                  border: "1px solid var(--border)",
                  borderRadius: "2px",
                  color: "var(--text-bright)",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "0.9rem",
                  outline: "none",
                  padding: "10px 14px",
                  width: "100%",
                }}
                type="text"
                value={displayId}
              />
            </div>

            {/* Avatar upload */}
            <div className="flex flex-col gap-2">
              <label
                style={{
                  fontFamily: "Impact, Arial Black, sans-serif",
                  fontSize: "0.7rem",
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                头像（可选）
              </label>
              <div className="flex items-center gap-4">
                {avatarDataUrl && (
                  <img
                    alt="头像预览"
                    src={avatarDataUrl}
                    style={{
                      border: "2px solid var(--border-gold)",
                      borderRadius: "50%",
                      height: "52px",
                      objectFit: "cover",
                      width: "52px",
                    }}
                  />
                )}
                <button
                  className="mk-button-ghost px-4 py-2"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontSize: "0.78rem" }}
                  type="button"
                >
                  {avatarDataUrl ? "更换头像" : "上传头像"}
                </button>
                <input
                  accept="image/*"
                  onChange={handleAvatarChange}
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  type="file"
                />
              </div>
            </div>

            {error && (
              <div className="mk-status" style={{ color: "var(--red-bright)", borderColor: "var(--red)", fontSize: "0.82rem" }}>
                {error}
              </div>
            )}

            <button
              className="mk-button px-6 py-3"
              disabled={pending || !displayName.trim()}
              onClick={() => void handleJoin()}
              style={{
                fontSize: "0.9rem",
                letterSpacing: "0.15em",
                marginTop: "4px",
                opacity: pending ? 0.7 : 1,
              }}
              type="button"
            >
              {pending ? "正在入场..." : "进场观战"}
            </button>
          </article>
        )}

        {/* Back link */}
        <div className="text-center">
          <Link
            className="mk-button-ghost px-4 py-2"
            href="/"
            style={{ fontSize: "0.78rem" }}
          >
            ← 返回首页
          </Link>
        </div>

      </div>
    </main>
  );
}
