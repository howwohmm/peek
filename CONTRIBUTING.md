# contributing

PRs welcome. small ones especially. before you open one, please read [docs/TECHNICAL.md](./docs/TECHNICAL.md) and [docs/SECURITY.md](./docs/SECURITY.md) so we're on the same page about what peek is and isn't.

---

## quick local setup

```bash
git clone https://github.com/howwohmm/peek
cd peek
cp .env.example .env
docker compose up --build
# open http://localhost:3000 in two browsers
```

for hot-reload while developing the next.js side:

```bash
docker compose up livekit coturn   # realtime stack only
bun install                         # or npm install
bun run dev                         # next.js with HMR on :3000
```

typecheck before pushing:

```bash
bunx tsc --noEmit
```

---

## things that would help most right now

- testing on safari 14+ desktop and reporting `getDisplayMedia` quirks
- a teacher who runs a real lab session with peek and writes up what broke
- self-host docs for ubuntu / fedora / oracle cloud always-free
- a small puppeteer / playwright harness that drives two headless browsers through the create → join → raise-hand → ask-share → accept flow
- rate-limiting middleware for `/api/class/create` (currently unprotected — see [docs/SECURITY.md](./docs/SECURITY.md))
- the `roomAdmin` refactor — replace the custom JWT verifier in `/api/class/end` with livekit's native `roomAdmin` grant

---

## things that will get pushback

these aren't missing. they're declined. PRs that add them will be closed:

- accounts, oauth, signup
- cloud recording / server-side persistence
- text chat / voice / annotation
- mobile support (different product)
- LMS integrations
- "teacher always views" / opt-out consent
- analytics, telemetry, page views
- monetization hooks (peek is and stays free)

if you want one of these, fork peek. don't PR it.

---

## code style

- typescript everywhere. `"use client"` at the top of any component using hooks/state.
- lowercase UI copy. always.
- no emojis as icons in the production UI — use `lucide-react`.
- no decorative shadows / gradients / animations. the aesthetic is calm.
- color tokens live in `tailwind.config.ts` (`bg`, `ink`, `line`, `accent`). don't hardcode hex values in components — change the token instead.
- font is manrope, weights 300 / 400 only. never 500+.
- comments only when WHY is non-obvious. don't narrate WHAT — the code already does that.

---

## commit messages

short, lowercase, conventional-commits-style. examples:

```
feat: bump screen share to 1080p / VP9
fix(security): JWT-gate end-class endpoint
docs: rewrite readme
chore: macos-friendly docker dev defaults
```

---

## license

by contributing, you agree your changes ship under [AGPL-3.0](./LICENSE). this is a copyleft project: anyone using peek as a service must publish their modifications. that's the social contract. if you can't agree to that, you can fork under a different license — but don't PR.
