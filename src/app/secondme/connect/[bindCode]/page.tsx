import Link from "next/link";

import QRCode from "qrcode";

import {
  buildSecondMeBindAuthUrl,
  getSecondMeBindCodeRecord,
} from "@/lib/secondme";

export const dynamic = "force-dynamic";

const statusOf = (record: { expiresAt: string; usedAt: string | null } | null) => {
  if (!record) {
    return "invalid" as const;
  }

  if (record.usedAt) {
    return "completed" as const;
  }

  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    return "expired" as const;
  }

  return "pending" as const;
};

export default async function SecondMeBindPage({
  params,
  searchParams,
}: {
  params: Promise<{ bindCode: string }>;
  searchParams: Promise<{
    error?: string;
    status?: string;
  }>;
}) {
  const { bindCode } = await params;
  const query = await searchParams;
  const record = await getSecondMeBindCodeRecord(bindCode);
  const status = query.status === "success" ? "completed" : statusOf(record);
  const error = query.error;
  const authUrl =
    status === "pending" ? await buildSecondMeBindAuthUrl(bindCode) : null;
  const qrDataUrl = authUrl
    ? await QRCode.toDataURL(authUrl, {
        margin: 1,
        width: 280,
      })
    : null;

  return (
    <main
      className="scanlines relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-10"
      style={{ color: "var(--text)" }}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <section className="entry-fade mk-panel px-6 py-8 sm:px-10">
          <div className="flex flex-col gap-3">
            <div className="mk-badge">SecondMe QR Connect</div>
            <h1 className="mk-title">扫码授权</h1>
            <p
              style={{
                color: "var(--text-dim)",
                fontFamily: "'Courier New', monospace",
                fontSize: "0.9rem",
                lineHeight: "1.85",
              }}
            >
              这个页面专门用于给甲方或乙方生成 SecondMe 授权二维码。扫码设备完成登录后，原来的竞技场页面会自动收到授权结果。
            </p>
          </div>
        </section>

        <section className="entry-fade mk-panel p-6 sm:p-8">
          <div className="flex flex-col gap-5">
            <div className="mk-panel-inset p-4">
              <p className="mk-label-red mb-2">绑定码</p>
              <p
                style={{
                  color: "var(--gold-bright)",
                  fontFamily: "Impact, Arial Black, sans-serif",
                  fontSize: "1.6rem",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                {bindCode}
              </p>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "0.78rem",
                  marginTop: "8px",
                }}
              >
                {record
                  ? `槽位：${record.slot} · 过期时间：${new Date(record.expiresAt).toLocaleString()}`
                  : "绑定码不存在或已经失效"}
              </p>
            </div>

            {status === "pending" && qrDataUrl && authUrl ? (
              <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <div className="mk-panel-inset flex flex-col items-center gap-4 p-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="SecondMe login QR code"
                    src={qrDataUrl}
                    style={{
                      background: "#fff",
                      border: "6px solid #fff",
                      boxShadow: "0 0 18px rgba(255,215,0,0.2)",
                      height: 280,
                      width: 280,
                    }}
                  />
                  <p
                    style={{
                      color: "var(--text-dim)",
                      fontFamily: "'Courier New', monospace",
                      fontSize: "0.78rem",
                      lineHeight: "1.75",
                      textAlign: "center",
                    }}
                  >
                    用手机扫码，或在另一浏览器中打开下方授权链接完成 SecondMe 登录。
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="mk-panel-inset p-4">
                    <p className="mk-label-red mb-2">操作说明</p>
                    <p
                      style={{
                        color: "var(--text-dim)",
                        fontFamily: "'Courier New', monospace",
                        fontSize: "0.82rem",
                        lineHeight: "1.8",
                      }}
                    >
                      1. 保持竞技场页面打开。
                      <br />
                      2. 用另一台设备扫码，或在另一浏览器中直接点“开始 SecondMe 登录”。
                      <br />
                      3. 登录成功后，这个槽位会自动写回原竞技场页面。
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <a
                      className="mk-button px-5 py-3"
                      href={authUrl}
                      rel="noreferrer"
                    >
                      开始 SecondMe 登录
                    </a>
                    <Link className="mk-button-ghost px-5 py-3" href="/arena">
                      返回竞技场
                    </Link>
                  </div>

                  <div className="mk-status">
                    等待扫码授权完成。授权结果会写回发起绑定的竞技场页面。
                  </div>
                </div>
              </div>
            ) : null}

            {status === "completed" ? (
              <div className="mk-status">
                SecondMe 授权已经完成。原竞技场页面会自动刷新该槽位状态，现在可以返回去开始 PK。
              </div>
            ) : null}

            {status === "expired" ? (
              <div className="mk-status">
                这个绑定码已经过期。请回到竞技场页面重新生成新的扫码授权入口。
              </div>
            ) : null}

            {status === "invalid" ? (
              <div className="mk-status">
                这个绑定码不存在或不可用。请从竞技场页面重新发起扫码授权。
              </div>
            ) : null}

            {error ? (
              <div className="mk-status">
                授权失败：{decodeURIComponent(error)}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
