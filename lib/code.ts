const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(length = 6): string {
  let out = "";
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  for (let i = 0; i < length; i++) {
    out += ALPHABET[buf[i] % ALPHABET.length];
  }
  return out;
}

export function isValidCode(code: string): boolean {
  if (typeof code !== "string") return false;
  if (code.length !== 6) return false;
  for (const ch of code) {
    if (!ALPHABET.includes(ch)) return false;
  }
  return true;
}

export function teacherIdentity(): string {
  return `teacher-${generateCode(8)}`;
}

export function studentIdentity(): string {
  return `student-${generateCode(8)}`;
}
