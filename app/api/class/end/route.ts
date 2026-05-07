import { NextResponse } from "next/server";
import { isValidCode } from "@/lib/code";
import { deleteRoom, verifyTeacherToken } from "@/lib/livekit-server";
import { deleteCode } from "@/lib/store";
import type { ApiError } from "@/lib/types";

export const dynamic = "force-dynamic";

type EndClassResponse = { ok: true };

export async function POST(req: Request): Promise<NextResponse<EndClassResponse | ApiError>> {
  try {
    const body = (await req.json().catch(() => null)) as { code?: unknown; token?: unknown } | null;
    const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
    const token = typeof body?.token === "string" ? body.token : "";

    if (!isValidCode(code)) {
      return NextResponse.json<ApiError>({ error: "invalid code format" }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json<ApiError>({ error: "missing teacher token" }, { status: 401 });
    }

    if (!verifyTeacherToken(token, code)) {
      return NextResponse.json<ApiError>(
        { error: "not authorized to end this class" },
        { status: 403 }
      );
    }

    await deleteRoom(code);
    deleteCode(code);

    return NextResponse.json<EndClassResponse>({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed to end class";
    return NextResponse.json<ApiError>({ error: message }, { status: 500 });
  }
}
