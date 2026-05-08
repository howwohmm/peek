# security

threat model + auth boundaries for peek. honest about what's gated and what isn't.

---

## threat model

**who's a realistic adversary?**

- **a curious student** in the class who wants to grief, exfiltrate, or escalate privilege
- **a stranger on the internet** who finds a class code (rare — but not impossible)
- **a malicious self-host operator** running a forked version of peek

**what are we protecting?**

- **student screen content** — the most sensitive data in the system. students must consent before any view.
- **class continuity** — only the teacher should be able to end class.
- **participant identity** — minimal: students choose a display name on join; nothing else is stored.
- **the livekit api secret** — never sent to any browser. only on the server.

**what we explicitly don't protect against:**

- **the teacher abusing the consent contract** — peek can't stop a teacher from misusing what students consent to share. the design makes the act of viewing visible (the indicator dot), but ultimately a teacher who's actively malicious is a social problem, not a software one.
- **a malicious browser extension** — anything running in the student's browser can intercept screen-share data. peek can't help here.
- **a compromised livekit server** — if the SFU is owned, all bets are off. self-hosters take this on themselves.

---

## the auth surface

**there is no application-layer auth.** no users, no passwords, no oauth, no session cookies. the only token in the system is the livekit JWT, signed with `LIVEKIT_API_SECRET` (HS256). that token is the only thing standing between a request and an action.

**three things the JWT proves:**

1. you can join the room (livekit verifies signature server-side)
2. you have a role (`metadata.role` is signed in)
3. you can perform destructive ops on this specific room (verified at the API boundary)

**what the secret never touches:**

- the browser — `LIVEKIT_API_SECRET` is a server-only env var, never bundled or exposed
- the wire — JWTs go to the client, the secret stays on the server
- logs — no logging of token contents

---

## the consent enforcement boundary

a student's screen track is published only when their browser calls:

```ts
await localParticipant.setScreenShareEnabled(true, ...)
```

this triggers `getDisplayMedia()`, the browser's native screen picker — a UI element only the user can dismiss. the OS additionally shows a "you're sharing your screen" banner that no webapp can suppress.

**three layers** defend against silent observation:

1. **app UI** — a modal blocks until the student clicks accept
2. **browser** — `getDisplayMedia()` shows a native picker
3. **OS** — the always-present "sharing screen" indicator

even a malicious fork of peek can't bypass layers 2 and 3. they're not part of peek; they're part of the platform.

---

## destructive endpoint protection

`/api/class/end` is the only mutating endpoint that can affect other users (it deletes the livekit room, kicking everyone). it requires a verified teacher JWT.

the verifier is in [`lib/livekit-server.ts`](../lib/livekit-server.ts#L66) — about 40 lines, no external deps:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyTeacherToken(token: string, expectedRoom: string): boolean {
  if (!apiSecret) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [headerB64, payloadB64, sigB64] = parts;

  try {
    // 1. alg must be HS256 (prevents alg-confusion attacks)
    const header = JSON.parse(base64UrlToBuffer(headerB64).toString("utf8"));
    if (header.alg !== "HS256") return false;

    // 2. signature must match (timing-safe to prevent oracle attacks)
    const expectedSig = createHmac("sha256", apiSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest();
    const providedSig = base64UrlToBuffer(sigB64);
    if (expectedSig.length !== providedSig.length) return false;
    if (!timingSafeEqual(expectedSig, providedSig)) return false;

    // 3. exp / nbf must be valid
    const payload = JSON.parse(base64UrlToBuffer(payloadB64).toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp < now) return false;
    if (typeof payload.nbf === "number" && payload.nbf > now) return false;

    // 4. token must be for this specific room
    if (payload.video?.room !== expectedRoom) return false;

    // 5. role must be teacher (signed into metadata)
    if (typeof payload.metadata !== "string" || !payload.metadata) return false;
    const metadata = JSON.parse(payload.metadata) as { role?: string };
    if (metadata.role !== "teacher") return false;

    return true;
  } catch {
    return false;
  }
}
```

**verified test cases on prod:**

| input | result |
|---|---|
| no token | `401 missing teacher token` |
| student token (right room, role=student) | `403 not authorized` |
| forged token (bogus signature) | `403 not authorized` |
| real teacher token | `200 ok`, room deleted |

a student token can't pass because the role check fails. a forged token can't pass because forging requires the api secret. and the secret never leaves the server.

---

## what isn't protected (by design)

`/api/class/create` and `/api/class/join` are intentionally public. anyone can create a class. anyone with a code can join.

**why:** the front door has to be open — that's the entire UX premise. a teacher pastes a URL, hits create, gets a code. requiring auth on `/create` would mean accounts, which would mean a database, which would mean every other compromise the project explicitly avoids.

**the abuse surface and mitigation:**

- **anyone can create classes in a loop and burn livekit minutes** — true. for the demo at peek-flame.vercel.app, this caps at the livekit cloud free tier (5,000 minutes/month). worst case the demo goes dark for a few days. for self-hosters, you control your own livekit; if abuse becomes a problem, put cloudflare or a simple ip-based rate limiter in front of `/api/class/create`. that's a v1.1 item.
- **anyone with a leaked code can join a class as a student** — true. a code's blast radius is one class session. closing the teacher's tab kills the room within 60 seconds. codes are six characters from a 32-char alphabet (~1 billion possibilities), so guessing is impractical, but if a teacher leaks the code, they can also un-leak it by ending class.

---

## what to do if you fork peek

**don't break the consent contract.** if your fork has a "teacher always sees student screens" mode, it's a different product. respect that — call it something else. don't ship something that looks like peek but behaves like surveillance software.

**don't add accounts without flagging it loudly.** ephemeral-by-default is a load-bearing property. if your fork adds persistence, document it on your fork's README so users know.

**don't strip the viewing indicator.** the small "viewing" dot when a teacher fullscreens is the visibility half of the consent contract. removing it silently breaks trust.

**rotate `LIVEKIT_API_SECRET` if you suspect leak.** it's a single env var on your hosting platform. rotation cost is < 60 seconds.

---

## reporting

if you find a real security issue (not a feature ask), open an issue at https://github.com/howwohmm/peek/issues with `[security]` in the title, or email me directly via the contact on x.com/ohmdreams.

low-bar issues (e.g. "anyone can call /api/class/create") are publicly known and tracked above. they don't need to be reported privately.
