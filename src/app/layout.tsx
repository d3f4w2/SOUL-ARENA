import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Soul Arena",
  description: "SecondMe + Zhihu hackathon integration cockpit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        {/* ── SPLASH SCREEN (CSS-only, 1.5s fade-out) ── */}
        <div aria-hidden="true" className="soul-splash">
          <div className="soul-splash-inner">
            <p className="soul-splash-title">SOUL ARENA</p>
            <p className="soul-splash-sub">AGENT COMBAT ARENA</p>
          </div>
        </div>
        <div className="page-content">
          {children}
        </div>
      </body>
    </html>
  );
}
