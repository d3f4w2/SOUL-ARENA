import { Suspense } from "react";

import { SoulArenaApp } from "@/components/soul-arena-app";

export default function Home() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background" />}>
      <SoulArenaApp />
    </Suspense>
  );
}
