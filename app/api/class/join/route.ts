import { NextResponse } from "next/server";
import { isValidCode, studentIdentity } from "@/lib/code";
import {
  getRoom,
  issueToken,
  getPublicLivekitUrl,
} from "@/lib/livekit-server";
import type { ApiError, JoinClassResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

type JoinBody = {
  code?: unknown;
  name?: unknown;
};

export async function POST(req: Request): Promise<NextResponse<JoinClassResponse | ApiError>> {
  try {
    let body: JoinBody;
    try {
      body = (await req.json()) as JoinBody;
    } catch {
      return NextResponse.json<ApiError>(
        { error: "invalid json body" },
        { status: 400 }
      );
    }

    const rawCode = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!isValidCode(rawCode)) {
      return NextResponse.json<ApiError>(
        { error: "invalid code format" },
        { status: 400 }
      );
    }

    const rawName = typeof body.name === "string" ? body.name.trim() : "";
    if (rawName.length < 1 || rawName.length > 40) {
      return NextResponse.json<ApiError>(
        { error: "name must be 1-40 characters" },
        { status: 400 }
      );
    }

    const room = await getRoom(rawCode);
    if (!room) {
      return NextResponse.json<ApiError>(
        { error: "class not found" },
        { status: 404 }
      );
    }

    const identity = studentIdentity();
    const token = await issueToken({
      roomName: rawCode,
      identity,
      metadata: { role: "student", displayName: rawName },
      canPublish: true,
    });

    const responseBody: JoinClassResponse = {
      code: rawCode,
      token,
      url: getPublicLivekitUrl(),
      identity,
    };
    return NextResponse.json<JoinClassResponse>(responseBody);
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed to join class";
    return NextResponse.json<ApiError>({ error: message }, { status: 500 });
  }
}
