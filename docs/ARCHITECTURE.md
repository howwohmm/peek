# architecture

this is the reference doc. for the narrative version, see [TECHNICAL.md](./TECHNICAL.md).

---

## system diagram

```
   teacher browser                       student browser
        │                                       │
        │ ───── POST /api/class/create ───────► │
        │ ◄──── { code, jwt, wss_url } ──────── │
        │                                       │
        │ ────── POST /api/class/join ─────────►│
        │                                       │
        │ ────── POST /api/class/end ──────────►│  (teacher only, JWT-gated)
        │                                       │
        └──────────► livekit SFU ◄──────────────┘
                          ▲
                          │  webrtc tracks + data channels
                          │  (P2P on LAN, SFU-relayed otherwise)
                          │
                  ┌───────┴────────┐
                  │     coturn     │  (TURN fallback for strict NAT)
                  └────────────────┘
```

---

## components

| component | role | tech | self-hosted | managed alternative |
|---|---|---|---|---|
| **peek app** | UI + token issuance + room lifecycle | next.js 14 (app router), tsx, tailwind | docker | vercel hobby (free) |
| **livekit** | webrtc SFU, signaling, data channels | go (livekit-server), apache 2.0 | docker | livekit cloud build (free) |
| **coturn** | TURN relay for strict NAT clients | C, BSD-3 | docker | bundled w/ self-host; not used w/ livekit cloud |

no database. no cache layer. no message queue. all session state lives inside livekit (the SFU is the source of truth) plus an in-memory `Map` in next.js for code-collision checks.

---

## directory layout

```
peek/
├── app/
│   ├── api/
│   │   ├── class/
│   │   │   ├── create/route.ts    # POST: mint code + teacher JWT
│   │   │   ├── join/route.ts      # POST: validate code, mint student JWT
│   │   │   └── end/route.ts       # POST: JWT-gated, deletes the livekit room
│   │   └── health/route.ts        # GET: liveness + active class count
│   ├── teach/page.tsx             # teacher entry — creates class, mounts <TeacherRoom>
│   ├── join/page.tsx              # student entry — form + <StudentRoom>
│   ├── layout.tsx                 # global shell, font preconnect, "by ohm" credit
│   ├── page.tsx                   # landing
│   ├── icon.svg                   # favicon (auto-served by next.js)
│   └── globals.css
├── components/
│   ├── teacher/
│   │   ├── TeacherRoom.tsx        # <LiveKitRoom> wrapper + state machine
│   │   ├── TopBar.tsx             # code display, copy, end-class
│   │   ├── Roster.tsx             # left panel — student list, hand-raised float
│   │   ├── RosterCard.tsx         # individual student tile
│   │   ├── Grid.tsx               # right panel — currently-sharing student tiles
│   │   ├── GridTile.tsx
│   │   ├── FullscreenView.tsx     # focused single-student view
│   │   └── SpotlightToggle.tsx
│   └── student/
│       ├── StudentRoom.tsx        # <LiveKitRoom> + state machine
│       ├── JoinForm.tsx           # code + name fields
│       ├── RaiseHand.tsx          # large gold button
│       ├── ShareRequestModal.tsx  # accept/decline modal
│       ├── SharingBanner.tsx      # persistent footer pill while sharing
│       └── SpotlightView.tsx      # full-bleed when teacher spotlights another student
├── lib/
│   ├── types.ts                   # shared TypeScript contracts
│   ├── code.ts                    # 6-char code generator + validator
│   ├── livekit-server.ts          # token issuance, room mgmt, JWT verification
│   ├── livekit-client.ts          # data channel helpers (send, decode)
│   ├── store.ts                   # ephemeral in-memory map (collision check only)
│   └── utils.ts                   # cn() for tailwind class merging
├── docs/
│   ├── TECHNICAL.md               # narrative writeup
│   ├── ARCHITECTURE.md            # this file
│   ├── SECURITY.md                # threat model + auth
│   └── brand/
│       └── icon.svg               # the eye glyph
├── docker-compose.yml             # local + production stack
├── Dockerfile                     # next.js multi-stage build
├── livekit.yaml                   # SFU config
├── coturn.conf                    # TURN config
├── scripts/dev.sh                 # one-line local bring-up
├── README.md
├── LICENSE                        # AGPL-3.0
├── next.config.mjs
├── package.json
└── tsconfig.json
```

---

## api surface

| endpoint | method | purpose | auth |
|---|---|---|---|
| `/api/class/create` | POST | generates 6-char code, creates livekit room, mints teacher JWT | none (rate-limit recommended in prod) |
| `/api/class/join` | POST | validates code, mints student JWT | none |
| `/api/class/end` | POST | deletes the livekit room (kicks all participants) | teacher JWT (signature-verified) |
| `/api/health` | GET | liveness check + active class count | none |

every route is `force-dynamic` (no caching). all responses are JSON.

---

## data channel choreography

all real-time messaging between teacher and students flows over livekit's data channels. the message types are exhaustively defined in `lib/types.ts`:

```ts
export type DataMessage =
  | { type: "raise-hand"; raised: boolean }
  | { type: "ask-share"; targetIdentity: string }
  | { type: "share-accepted"; identity: string }
  | { type: "share-declined"; identity: string }
  | { type: "fullscreen-view"; viewer: string; target: string | null }
  | { type: "spotlight-set"; target: string | null };
```

- **broadcast** by default — all participants receive
- **targeted delivery** when calling `sendData(local, msg, [identity])` — only the listed identities receive (used for `ask-share`)
- **reliable** transport — guaranteed delivery, ordered

state derived from these messages lives in client-side React state. no server-side aggregation, no persistence.

---

## token / identity model

every connection to livekit carries a JWT signed by the server with `LIVEKIT_API_SECRET`.

| claim | example | purpose |
|---|---|---|
| `iss` | `APIxxxxxxxxxxxx` | the livekit api key |
| `sub` (identity) | `teacher-A1B2C3D4` or `student-K7FQ2X8Y` | unique per participant |
| `name` | `"sarah"` | display name (student) / `"teacher"` |
| `metadata` | `{"role":"teacher","displayName":"teacher"}` | role + display name, JSON-encoded |
| `video.room` | `"K7FQ2X"` | the class code (livekit room name) |
| `video.canPublish` | `true` | screen-share permission |
| `video.canSubscribe` | `true` | view permission |
| `video.canPublishData` | `true` | send data channel messages |
| `exp` | `<unix timestamp>` | 6 hours from issuance |

teacher and student tokens differ only in `metadata.role` and the identity prefix. both can publish (UI gates the actual share via the accept modal — see `SECURITY.md` for the trade-off).

---

## state model

| state | source of truth | persistence |
|---|---|---|
| active classes | livekit `RoomService.listRooms()` | none — closed when teacher disconnects + 60s timeout |
| participants | livekit `room.participants` (client-side) | none |
| screen-share tracks | livekit `useTracks()` (client-side) | none |
| display names | livekit participant metadata | none |
| raised hand state | data channel + client React state | none |
| recordings | client-side `MediaRecorder`, downloads to teacher's disk | local only |
| code → metadata map | next.js in-memory `Map<string, RoomMetadata>` | per-instance, ephemeral, lost on cold start |

nothing persists across a teacher closing their tab. that's the whole design.

---

## tech stack

| layer | choice | version | license |
|---|---|---|---|
| framework | next.js | ^14.2.18 | MIT |
| language | typescript | ^5.6.3 | Apache-2.0 |
| ui library | react | ^18.3.1 | MIT |
| styling | tailwindcss | ^3.4.14 | MIT |
| typography | manrope (google fonts) | weights 300/400 only | OFL |
| icons | lucide-react | ^0.456.0 | ISC |
| realtime client | livekit-client | ^2.5.0 | Apache-2.0 |
| realtime react | @livekit/components-react | ^2.6.0 | Apache-2.0 |
| realtime server | livekit-server-sdk | ^2.7.0 | Apache-2.0 |
| TURN server | coturn (docker) | latest | BSD-3 |
| recording | browser `MediaRecorder` | native | — |
| auth | JWT (HS256) verified with `node:crypto` | native | — |
| hosting (managed) | vercel + livekit cloud | — | proprietary |
| hosting (self) | docker compose on any linux VPS | — | — |
| this project | AGPL-3.0 | — | — |

10 runtime dependencies in `package.json`. that's the whole stack.

---

## extension points

if you fork peek and want to extend it without breaking the consent contract, here's where to look:

- **add new data-channel events**: extend `DataMessage` in `lib/types.ts` and handle in `TeacherShell` + `StudentRoomShell`
- **add a new api route**: drop a `route.ts` under `app/api/`. if it's destructive, gate with `verifyTeacherToken` from `lib/livekit-server.ts`
- **change the visual aesthetic**: tokens are in `tailwind.config.ts` (`bg`, `ink`, `line`, `accent`). don't change them per-component — change the token.
- **swap livekit for another SFU**: rewrite `lib/livekit-server.ts` and `lib/livekit-client.ts`. the rest of the app is SFU-agnostic.
- **add accounts** (please don't, but if you must): add a database, add an auth middleware to the api routes, and explicitly document that you've broken the ephemeral guarantee. fork it; don't PR it.
