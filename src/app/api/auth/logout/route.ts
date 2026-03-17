import { NextResponse } from "next/server";

import { clearSecondMeSession } from "@/lib/secondme";

export async function POST() {
  await clearSecondMeSession();
  return NextResponse.json({ ok: true });
}
