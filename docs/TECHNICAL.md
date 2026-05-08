# building peek — a technical writeup

a deep, honest record of what got built, why each decision was made, and what i'd do differently. not a tutorial. a postmortem.

short version: free, browser-only, consent-gated screen sharing for classroom labs. live demo at https://peek-flame.vercel.app, source at https://github.com/howwohmm/peek. AGPL-3.0, self-hostable, $0/month at small scale.

---

## the problem

in indian college computer labs, teachers spend ~30% of class walking from desk to desk. one student errors out, teacher walks over. next student errors out, teacher walks over. for two hours.

i'm about to start teaching my friends and juniors how to build with ai. i didn't want to do the desk walk thing.

i looked at what exists:

- **lanschool** — $2000 per lab. install on every machine. it-managed.
- **netsupport school** — same.
- **apple classroom** — only works if everyone's on apple.
- **mythware / faronics insight** — windows-first. heavy. surveillance-flavored.

all of them assume you're an it admin buying enterprise software. none of them assume you're a teacher who just wants to see student screens when a student raises their hand. and all of them have "always-on monitoring" as a default — which is a bad default.

so i built one.

---

## what peek is, in one paragraph

a teacher hits "create class" and gets a 6-character code. students open a browser, type the code and their name, and they're in. when a student needs help, they raise their hand in the app. the teacher clicks "ask to share" on that student. the student gets a modal: "teacher wants to view your screen — share?" they accept, the browser asks for screen-share permission, their screen appears in the teacher's grid. teacher views read-only, can fullscreen, can spotlight one student's screen to the rest of the class, can record locally to a `.webm`. close the teacher's tab and the class is gone. no accounts. no database. no surveillance.

that's v1.

---

## the design conversations that shaped it

before any code, there were five questions. the answers fully determine the architecture.

**q1: what's the core viewing model?**

three options i considered:

- **(a)** one-at-a-time, code-per-student — teacher types each student's individual code to see them
- **(b)** classroom + grid — teacher creates a class, students join, teacher sees a live grid of every student's screen simultaneously
- **(c)** hybrid — students join a class, but no one shares by default; teacher requests, student accepts, screen pops into grid

i picked (c) initially because it's the most useful classroom UX. then immediately revised: students never share unilaterally — every share is a deliberate accept of the teacher's request. the "raise hand" signal becomes the way students initiate help.

this small change is the entire ethical architecture of the app. more on that below.

**q2: how persistent is a class?**

- **(a)** fully ephemeral, no accounts ever
- **(b)** persistent classes with teacher accounts
- **(c)** progressive: ephemeral by default, optional account for power users

picked (a). like google meet — open URL, get a code, done. zero friction. zero database. close the tab and everything's gone. for v1 simplicity this is unbeatable.

**q3: feature scope?**

i listed nine candidate features. ruthlessly cut to six:

- in: live grid, click-to-fullscreen, raise-hand, spotlight, ask-to-share, local recording
- out: text chat, voice, annotation

reasoning on the cuts: lab is in person. students and teacher can talk to each other. don't reinvent zoom over webrtc when the room itself works.

**q4: privacy model.**

when teacher fullscreens a student, does the student know? three options: silent / ambient indicator / explicit consent per fullscreen. i picked ambient — small "viewing" dot on the student's screen when teacher is actively zoomed in.

this matters because the contract i wanted is "students opt in, teacher views, but students always know when they're being watched." if a student finds out a teacher was silently observing them, the trust is broken. the indicator is one ui element + one livekit data channel message — costs nothing engineering-wise, costs everything in trust if missing.

**q5: code format.**

6-character alphanumeric, from a 32-character alphabet that excludes ambiguous chars (`0/O`, `1/I`, `L/1`, etc.). 32^6 = ~1 billion possible codes. collision probability is effectively zero. easier to read out loud than uuid, harder to mistype than four digits.

these five answers locked in the entire system before a line of code.

---

## the architecture

three pieces. nothing more.

```
   teacher browser                       student browser
        │                                       │
        │ ───── POST /api/class/create ───────► │
        │ ◄──── { code, jwt, wss_url } ──────── │
        │                                       │
        │ ────────────────── joins ────────────►│
        │                                       │
        └──────────► livekit SFU ◄──────────────┘
                          ▲
                          │  webrtc tracks
                          │  (P2P on LAN, SFU-relayed otherwise,
                          │   coturn fallback if NAT blocks both)
```

the three pieces:

1. **next.js 14 (app router)** — handles the UI and four small api routes. about 1,300 lines of tsx for the components, ~200 lines for the api. routes: `/api/class/create`, `/api/class/join`, `/api/class/end`, `/api/health`. that's it. there's no `/api/users`, no `/api/sessions`, no auth endpoints. the routes only mint webrtc tokens and clean up rooms.

2. **livekit (apache 2.0)** — a webrtc selective forwarding unit (SFU). all the realtime work happens here. signaling, NAT traversal, track routing, data channels. self-hosted via docker, or pointed at livekit cloud's free tier. ~270 lines of typescript wrap their server SDK in `lib/livekit-server.ts` and `lib/livekit-client.ts`.

3. **coturn (BSD-3)** — a TURN relay for clients behind strict NAT. only used when peer-to-peer and SFU paths both fail. on a school LAN it's never used. about 42 lines of config.

deployment surface:

- **app**: vercel hobby (free) — autoscales, edge caching, zero ops
- **livekit**: livekit cloud build tier (free, 5,000 participant-minutes/month) or self-host
- **coturn**: bundled with self-hosted livekit; not needed when using livekit cloud

total runtime dependencies in `package.json`: 10 packages. that's the whole stack.

---

## the data flow when a teacher debugs a student

let me walk through what happens when sarah raises her hand in a class:

1. **teacher creates the class** — `POST /api/class/create` returns `{ code: "K7FQ2X", token: "<JWT>", url: "wss://...", identity: "teacher-A1B2C3D4" }`. the server has just called `livekit.createRoom("K7FQ2X")` and minted a JWT signed with the livekit api secret.

2. **teacher's browser connects** — passes the JWT to livekit via wss. livekit validates the signature server-side, attaches the teacher to room `K7FQ2X`. teacher's browser is now in the room.

3. **sarah joins** — fills the form, hits `POST /api/class/join` with `{ code: "K7FQ2X", name: "sarah" }`. server validates the code is a real livekit room (calls `livekit.listRooms(["K7FQ2X"])`), mints a student JWT with `metadata.role = "student"` and `metadata.displayName = "sarah"`, returns it. sarah's browser connects.

4. **teacher sees sarah** — livekit pushes a `participantConnected` event. teacher's UI re-renders the roster. nothing was sent through next.js's api — it's straight livekit.

5. **sarah raises her hand** — clicks the button. the client calls:

   ```ts
   sendData(localParticipant, { type: "raise-hand", raised: true });
   ```

   this writes a small JSON payload to livekit's data channel. all participants get it. teacher's UI listens via `useDataChannel`, decodes it, sets `flags[sarah's identity].handRaised = true`. sarah's roster card floats to the top with a hand icon.

6. **teacher clicks "ask to share"** — sends a targeted data message:

   ```ts
   sendData(localParticipant, { type: "ask-share", targetIdentity: sarahId }, [sarahId]);
   ```

   the third arg restricts delivery to sarah only — other students don't see the request.

7. **sarah's browser shows a modal** — sarah accepts. her client sends `{ type: "share-accepted", identity: sarahId }` (broadcast) and then calls:

   ```ts
   await localParticipant.setScreenShareEnabled(true, {
     resolution: ScreenSharePresets.h1080fps15.resolution,
     contentHint: "text",
   }, {
     videoCodec: "vp9",
     screenShareEncoding: ScreenSharePresets.h1080fps15.encoding,
   });
   ```

   this triggers `getDisplayMedia()`, the browser's native screen picker pops up, sarah picks a window, livekit publishes the resulting `MediaStreamTrack` at 1080p / VP9 / "text" content hint — much sharper than the default 720p / VP8 for code-on-screen.

8. **teacher's grid updates** — `useTracks([Track.Source.ScreenShare])` from `@livekit/components-react` re-renders. sarah's tile appears. teacher clicks it, fullscreens.

9. **fullscreen viewing indicator** — entering fullscreen also broadcasts `{ type: "fullscreen-view", viewer: teacherId, target: sarahId }`. sarah's client sees this and renders a small "viewing" pulse-dot in the corner of her sharing banner. when teacher exits fullscreen, target becomes null, sarah's dot clears.

10. **teacher records** — `MediaRecorder` on the teacher's browser, fed from the underlying `MediaStreamTrack` via `track.mediaStreamTrack`. picks the best supported mime (`video/webm;codecs=vp9` → `vp8` → plain `webm`). on stop, blob URL → `<a download>` → `peek-recording-${timestamp}.webm` saves to teacher's machine. nothing is uploaded.

end-to-end this is one round-trip to next.js per role (the token issuance) plus pure webrtc for everything realtime. on a school LAN, video latency is sub-100ms because livekit gives you direct peer-to-peer when both clients are on the same network.

---

## consent as architecture, not a feature

the most important design choice in peek isn't a feature — it's what's missing.

you cannot silently observe a student in peek. there is no api endpoint that lets a teacher view a student without that student's accept. it's not a setting that can be toggled. it's not a feature flag. it's that the only way a student's screen track gets published is through `localParticipant.setScreenShareEnabled(true)` running on the *student's own browser*, behind a modal they have to click and a browser permission they have to grant.

this is enforced at three layers:

1. **the ui** — a modal blocks until accept
2. **the browser** — `getDisplayMedia()` shows a native picker only the user can dismiss
3. **the OS** — there's a "you're sharing your screen" banner the webapp can't suppress

even if a malicious version of peek shipped, layers 2 and 3 can't be bypassed. a teacher physically cannot view a student silently. always-on monitoring isn't disabled by config; it's architecturally impossible.

three flows surface this design in the ui:

- raise-hand → ask-share → accept (the help flow)
- fullscreen viewing indicator (the visibility flow)
- close-tab-class-dies (the no-persistence flow)

this is what i mean when i say "consent is the architecture." all the other things i could have built — accounts, persistence, cloud recording, mobile apps, lms integrations — would have weakened this. so they're declined.

---

## the auth surface is one JWT

i made one decision that simplified everything else: there is no application-layer auth. no passwords, no oauth, no session cookies, no jwt for "peek" itself. the only token in the entire system is the **livekit JWT**, signed with `LIVEKIT_API_SECRET`, with a 6-hour TTL.

that one token serves three purposes:

1. **proof you can join the room** — livekit verifies the signature server-side before letting you connect to the wss endpoint
2. **proof of role** — `metadata: { role: "teacher" | "student" }` is signed into the token
3. **proof you can perform destructive ops** — `/api/class/end` verifies the same signature server-side

the entire backend has no user table, no session table, no auth middleware. requests with a valid token can do their things. requests without one get 401.

here's the verifier i wrote for the end-class endpoint, in full:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

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
```

40 lines. zero dependencies (uses node's built-in `crypto` module). it checks: alg=HS256 (prevents alg-confusion), HMAC signature with timing-safe compare (prevents oracle attacks), exp/nbf validity, room matches the request, role is teacher.

i originally shipped `/api/class/end` taking just `{ code }` — anyone with the code could end the class. a student could grief by ending class for everyone. i caught this thinking through the security model after launch and added the verifier above. four test cases on prod confirm it works:

| input | result |
|---|---|
| no token | 401 missing teacher token |
| student token (same room, role=student) | 403 not authorized |
| forged token (bad signature) | 403 not authorized |
| real teacher token | 200 ok, room deleted |

a forged token can't pass because forging requires the api secret. a student token can't pass because the role check fails. and the api secret never leaves the server — it's a vercel encrypted env var, never sent to any browser.

---

## why no database

there isn't one. not "we'll add postgres later." not "we'll use redis." just no database, on purpose, by design.

the question for any state in your system is: who is the source of truth?

- **active classes**: livekit knows. `livekit.listRooms()` is the answer.
- **active participants**: livekit knows. `livekit.listParticipants(roomName)` is the answer.
- **published tracks**: livekit knows. `useTracks()` in the client is the answer.
- **student names**: stored in livekit participant metadata.
- **raised hands**: in-memory client state, updated by data channel messages.
- **recordings**: on the teacher's local disk, never on a server.
- **class history**: there is none. by design.

the only server-side state in next.js is a small in-memory `Map<string, RoomMetadata>` for collision-checking new codes. it's not even authoritative — if vercel cold-starts a different instance and the map is empty, code generation still works because the alphabet is huge enough that real collisions are vanishingly rare, and livekit would reject a duplicate room anyway.

this design is why peek is `docker compose up` and works. there's no migration story. there's no "scale your database." there's no backup strategy. because there's nothing to back up.

---

## the build approach — disjoint subtrees

building peek meant breaking the work into four parallel implementation tracks on disjoint subtrees, after one sequential scaffold:

1. **scaffold** (sequential, foundation): next.js base config, tailwind, globals.css, layout, landing page, the shared lib (`lib/types.ts`, `lib/code.ts`, `lib/livekit-server.ts`, `lib/livekit-client.ts`, `lib/store.ts`, `lib/utils.ts`). this had to come first because every other track imports from it.

2. **backend api** (parallel): `app/api/class/{create,join,end,health}/route.ts`. owns `app/api/**` — nothing outside.

3. **teacher ui** (parallel): `app/teach/page.tsx` + everything in `components/teacher/**`. owns those subtrees, doesn't touch shared lib.

4. **student ui** (parallel): `app/join/page.tsx` + `components/student/**`. same constraint.

5. **infra** (parallel): `Dockerfile`, `docker-compose.yml`, `livekit.yaml`, `coturn.conf`, `LICENSE`, `scripts/dev.sh`. owns infra, edits `next.config.mjs` only for the standalone-output line.

the pattern that made this work: **disjoint subtrees with stable shared interfaces**. each track had a clearly-bounded directory it could write to. no two tracks could touch the same file. the shared lib was sequential and done before any of them started — so by the time they ran, all the imports they needed were stable.

result: zero merge conflicts. when `bunx tsc --noEmit` ran on the combined output: **0 errors**. first try.

what makes parallel implementation work isn't the parallelism — it's the decomposition. overlapping responsibilities produce conflicts. disjoint subtrees with stable shared interfaces compose cleanly.

---

## the infra reality — the macOS UDP saga

shipping software involves many small lessons. here's one that wasn't in the plan.

livekit needs a UDP port range for webrtc media. the `docker-compose.yml` originally mapped `50000-50100/udp` (101 ports) to the host. on linux, this works fine. on macOS, docker desktop uses vpnkit for port forwarding, and mapping a hundred UDP ports is heavy. on first run:

```
Error response from daemon: ports are not available:
exposing port UDP 0.0.0.0:50035 -> 127.0.0.1:0:
listen udp 0.0.0.0:50035: bind: address already in use
```

the fix was two lines — shrink the range to 20 ports (`50000-50019`) for local dev, leave a comment that production should widen back to 100:

```yaml
- "50000-50019:50000-50019/udp"     # webrtc media — small range for macOS docker; widen to 50000-50100 for prod / linux
```

second issue, immediately after: livekit refused to start with:

```
TURN tls cert required: open : no such file or directory
```

livekit has a built-in TURN server that wants a TLS cert if `tls_port` is configured. `tls_port: 5349` was set but no cert. the fix: disable livekit's built-in TURN entirely, since coturn is already handling TURN externally:

```yaml
turn:
  enabled: false
  # PROD: enable + provide tls_cert / tls_key paths and a real domain
```

both fixes are committed. the readme calls them out explicitly for production self-hosters.

these are the kinds of lessons you only get from actually running the thing.

---

## screen-share quality — the one knob that mattered

livekit's default screen share publishes at 720p, VP8 codec, no content hint. for a video call (face on camera, smooth motion) that's fine. for code on a screen — terminals, editors, browser dev tools — it's the wrong trade-off. text gets blurry.

the fix is one block in `StudentRoom.tsx` where we call `setScreenShareEnabled`:

```ts
await localParticipant.setScreenShareEnabled(
  true,
  {
    resolution: ScreenSharePresets.h1080fps15.resolution,  // 1920x1080
    contentHint: "text",                                   // optimize for sharp edges
  },
  {
    videoCodec: "vp9",                                     // ~30% better compression than vp8
    screenShareEncoding: ScreenSharePresets.h1080fps15.encoding,  // 3 Mbps maxBitrate, 15fps
  }
);
```

three changes:

- **resolution: 1080p** — was 720p. doubles the pixels.
- **codec: VP9** — was VP8. better compression on static-ish screen content. ~30-40% lower bitrate at the same quality.
- **`contentHint: "text"`** — the underrated one. tells the codec "this is text/diagrams not video — prioritize sharp edges over motion smoothness." this single flag is the difference between "code is unreadable" and "code is crisp."

bandwidth cost: ~3 Mbps upload per sharing student. on a school LAN, nothing. on home wifi, ~1-2% of typical broadband. only noticeable on cell data.

---

## what it costs

the math.

**self-hosted (target: classroom of 30 students, daily)**:

- one $5/month hetzner VPS runs the entire stack: next.js + livekit + coturn
- bandwidth: one student sharing 1080p screen-cap is ~2-5 mbps. one teacher viewing one student at a time means ~5 mbps egress max. monthly even with 60 hours of class = ~135 GB. hetzner gives you 20 TB. fine.
- total: $5/mo, scales to a school

**vercel + livekit cloud free (target: try-it-now demo)**:

- next.js on vercel hobby: free
- livekit cloud build tier: free, 5,000 participant-minutes/month
- 30 students × 1 hour = 1,800 participant-minutes
- so ~2.5 hour-long classes per month before hitting the cap
- after that: pay livekit cloud (~$0.003/min) or migrate to self-host
- total: $0 for ~5 hours of classroom use per month

both options are AGPL — fork it, change the consent model if you must, your modifications stay open.

---

## what's not in v1

i'm explicit about non-goals because the most valuable thing about an opinionated tool is what it doesn't do.

- **no remote control of student machines.** read-only viewing is the contract. there's no api endpoint that even allows control.
- **no persistent classes, accounts, or rosters.** every class is a fresh url; closing the tab is the cleanup story.
- **no cloud recording.** recording is `MediaRecorder` on the teacher's browser, downloads to their disk. there is no upload path.
- **no mobile.** desktop-only. labs are desktops. mobile screen-share has too many edge cases for v1 to be good.
- **no text chat / voice / annotation.** the lab is in person. talk to your students.
- **no lms integrations.** hard pass for v1 — every integration is a tax on the core consent contract.
- **no surveillance.** not a missing feature. a declined one.

if any of these are deal-breakers for your use case, peek isn't for you, and that's fine.

---

## what i'd do differently next time

1. **decompose the spec earlier.** i was deep in q3 (feature scope) when q4 (privacy model) clarified what should be in scope. q4 first would have made q3 faster.

2. **plan the test paths before parallelizing.** the four parallel tracks shipped clean code, but i couldn't test the data-channel choreography end-to-end without two real browsers. that's a slow human-loop test. next time i'd write a tiny puppeteer harness as part of the scaffold so each track could self-verify.

3. **set up rate limiting from day one.** `/api/class/create` is currently unprotected. anyone can hammer it and burn through livekit minutes. i'd put cloudflare in front + a simple ip-based limit before launch, not after.

4. **validate the auth boundary on every destructive endpoint, before launch.** i caught the "anyone can end class" gap myself, but only after shipping. the right pattern is: write the verifier first, then the endpoint. all mutating endpoints should require a teacher JWT, by default.

5. **use livekit's `roomAdmin` grant for end-class instead of role check + jwt verifier.** what i did works, but the more idiomatic approach is to issue the teacher token with `roomAdmin: true`, then have the client call livekit's REST API directly to delete the room. one less endpoint to maintain. v2.

---

## what's next

the constraint that matters now isn't engineering — it's distribution. peek is one teacher's tool. it needs other teachers to use it.

- post a launch on hacker news / twitter / r/professors
- run a real class with peek and write up what broke
- ship a v1.1 with rate limiting, the roomAdmin refactor, and any feedback from launch

if you teach a coding class — or know someone who does — the demo is at https://peek-flame.vercel.app and the source is at https://github.com/howwohmm/peek. AGPL-3.0. i'd love to hear what you think. especially if you think the consent model is wrong. that's the conversation worth having.

— ohm
peek-flame.vercel.app · github.com/howwohmm/peek
