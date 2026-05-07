"use client";

import type { LocalParticipant, Participant, RemoteParticipant } from "livekit-client";
import type { DataMessage, ParticipantMetadata } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function parseParticipantMetadata(p: Participant): ParticipantMetadata | null {
  if (!p.metadata) return null;
  try {
    return JSON.parse(p.metadata) as ParticipantMetadata;
  } catch {
    return null;
  }
}

export async function sendData(
  local: LocalParticipant,
  msg: DataMessage,
  destinationIdentities?: string[]
) {
  const payload = encoder.encode(JSON.stringify(msg));
  await local.publishData(payload, {
    reliable: true,
    destinationIdentities,
  });
}

export function decodeData(payload: Uint8Array): DataMessage | null {
  try {
    return JSON.parse(decoder.decode(payload)) as DataMessage;
  } catch {
    return null;
  }
}

export function isTeacher(p: Participant | undefined | null): boolean {
  if (!p) return false;
  const m = parseParticipantMetadata(p);
  return m?.role === "teacher";
}

export function isStudent(p: Participant | undefined | null): boolean {
  if (!p) return false;
  const m = parseParticipantMetadata(p);
  return m?.role === "student";
}

export function findTeacher(participants: Participant[]): RemoteParticipant | null {
  for (const p of participants) {
    if (isTeacher(p)) return p as RemoteParticipant;
  }
  return null;
}

export function getDisplayName(p: Participant): string {
  const m = parseParticipantMetadata(p);
  return m?.displayName || p.name || p.identity;
}
