import { NextResponse } from "next/server";
import { generateCode, teacherIdentity } from "@/lib/code";
import {
  createRoom,
  issueToken,
  getPublicLivekitUrl,
} from "@/lib/livekit-server";
import { hasCode, registerCode } from "@/lib/store";
import type {
  ApiError,
  CreateClassResponse,
  RoomMetadata,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_CODE_ATTEMPTS = 10;

export async function POST(): Promise<NextResponse<CreateClassResponse | ApiError>> {
  try {
    let code: string | null = null;
    for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) {
      const candidate = generateCode();
      if (!hasCode(candidate)) {
        code = candidate;
        break;
      }
    }

    if (!code) {
      return NextResponse.json<ApiError>(
        { error: "could not allocate a unique class code, try again" },
        { status: 500 }
      );
    }

    await createRoom(code);

    const meta: RoomMetadata = {
      code,
      createdAt: Date.now(),
      spotlightIdentity: null,
    };
    registerCode(code, meta);

    const identity = teacherIdentity();
    const token = await issueToken({
      roomName: code,
      identity,
      metadata: { role: "teacher", displayName: "teacher" },
      canPublish: true,
    });

    const body: CreateClassResponse = {
      code,
      token,
      url: getPublicLivekitUrl(),
      identity,
    };
    return NextResponse.json<CreateClassResponse>(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed to create class";
    return NextResponse.json<ApiError>({ error: message }, { status: 500 });
  }
}
