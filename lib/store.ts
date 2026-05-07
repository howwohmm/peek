import "server-only";
import type { RoomMetadata } from "./types";

const codeMap = new Map<string, RoomMetadata>();

export function registerCode(code: string, meta: RoomMetadata) {
  codeMap.set(code, meta);
}

export function hasCode(code: string): boolean {
  return codeMap.has(code);
}

export function getMeta(code: string): RoomMetadata | undefined {
  return codeMap.get(code);
}

export function deleteCode(code: string) {
  codeMap.delete(code);
}

export function activeCount(): number {
  return codeMap.size;
}
