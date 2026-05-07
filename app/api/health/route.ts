import { NextResponse } from "next/server";
import { activeCount } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<{ ok: true; activeClasses: number }>> {
  return NextResponse.json({ ok: true, activeClasses: activeCount() });
}
