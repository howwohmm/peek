import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import type { ParticipantMetadata, RoomMetadata } from "./types";

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const livekitUrl = process.env.LIVEKIT_URL;

if (!apiKey || !apiSecret || !livekitUrl) {
  console.warn(
    "[peek] LIVEKIT_API_KEY, LIVEKIT_API_SECRET, or LIVEKIT_URL not set — token issuance will fail."
  );
}

export function getRoomService(): RoomServiceClient {
  if (!apiKey || !apiSecret || !livekitUrl) {
    throw new Error("livekit not configured");
  }
  const httpUrl = livekitUrl.replace(/^ws/, "http");
  return new RoomServiceClient(httpUrl, apiKey, apiSecret);
}

export async function createRoom(code: string) {
  const svc = getRoomService();
  const meta: RoomMetadata = { code, createdAt: Date.now(), spotlightIdentity: null };
  await svc.createRoom({
    name: code,
    emptyTimeout: 60,
    maxParticipants: 60,
    metadata: JSON.stringify(meta),
  });
}

export async function getRoom(code: string) {
  const svc = getRoomService();
  const rooms = await svc.listRooms([code]);
  return rooms[0] ?? null;
}

export async function deleteRoom(code: string) {
  const svc = getRoomService();
  await svc.deleteRoom(code);
}

type IssueTokenInput = {
  roomName: string;
  identity: string;
  metadata: ParticipantMetadata;
  canPublish: boolean;
};

export async function issueToken({ roomName, identity, metadata, canPublish }: IssueTokenInput): Promise<string> {
  if (!apiKey || !apiSecret) throw new Error("livekit not configured");
  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: metadata.displayName,
    metadata: JSON.stringify(metadata),
    ttl: 60 * 60 * 6,
  });
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
  });
  return at.toJwt();
}

export function getPublicLivekitUrl(): string {
  return process.env.NEXT_PUBLIC_LIVEKIT_URL || livekitUrl || "ws://localhost:7880";
}

function base64UrlToBuffer(s: string): Buffer {
  const padded = s + "=".repeat((4 - (s.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function verifyTeacherToken(token: string, expectedRoom: string): boolean {
  if (!apiSecret) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [headerB64, payloadB64, sigB64] = parts;

  try {
    const header = JSON.parse(base64UrlToBuffer(headerB64).toString("utf8"));
    if (header.alg !== "HS256") return false;

    const expectedSig = createHmac("sha256", apiSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest();
    const providedSig = base64UrlToBuffer(sigB64);
    if (expectedSig.length !== providedSig.length) return false;
    if (!timingSafeEqual(expectedSig, providedSig)) return false;

    const payload = JSON.parse(base64UrlToBuffer(payloadB64).toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp < now) return false;
    if (typeof payload.nbf === "number" && payload.nbf > now) return false;

    if (payload.video?.room !== expectedRoom) return false;

    if (typeof payload.metadata !== "string" || !payload.metadata) return false;
    const metadata = JSON.parse(payload.metadata) as { role?: string };
    if (metadata.role !== "teacher") return false;

    return true;
  } catch {
    return false;
  }
}
