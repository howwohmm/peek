# peek

in indian college computer labs teachers spend 
like 30% of class just walking desk to desk.

student has an error, teacher walks over.
next student has an error, teacher walks over.
repeat for 2 hours.

i'm about to start teaching my friends and juniors 
how to build and ship with ai.

didn't want to do the desk walk thing.

so i built this.

---

## what it does

student opens a browser, types a 6-letter code and their name.
they're in. no install. no account.

when they're stuck they raise their hand in the app.
i click view. i see their screen. they fix it. done.

one teacher. many students. nobody walks anywhere.

---

## the consent thing

student has to accept before i can see anything.

felt important to get right.

---

## try it

live demo → peek-flame.vercel.app
no setup, just open it.

---

## self-host

runs on a $5 VPS. docker compose up and you're done.

```bash
git clone https://github.com/howwohmm/peek
cd peek
cp .env.example .env
docker compose up --build
```

full setup guide below for production.

---

## production setup

if you're putting this on a real domain for your school or class, swap a few things first.

1. rotate the keys. the `.env.example` ships with dev defaults. don't ship those. generate fresh ones with `docker run --rm livekit/livekit-server generate-keys`.

2. point things at your domain. in `.env`, set `LIVEKIT_URL=wss://peek.yourdomain.com` and `NEXT_PUBLIC_LIVEKIT_URL=wss://peek.yourdomain.com`. put caddy or nginx in front to terminate TLS — browsers refuse webrtc over plain ws.

3. flip livekit to real-ip mode. in `livekit.yaml`, set `rtc.use_external_ip: true`. set `external-ip` in `coturn.conf` too.

4. open the ports. UDP 50000-50100 for media, TCP 7880, 7881, 3478, 5349.

5. `docker compose up -d`.

don't want to run servers? deploy the next.js side to vercel (hobby tier, free) and point it at livekit cloud (build tier, free, 5000 minutes/month). that's how peek-flame.vercel.app runs. zero infra, $0/month, scales to your first ~50 students.

---

## stack

next.js, livekit, coturn, tailwind. 
nothing stored server-side. close the tab, class is gone.

---

## docs

deeper writeups for whoever's curious or building on this:

- [docs/TECHNICAL.md](./docs/TECHNICAL.md) — the long-form technical writeup. why every decision was made, what i'd do differently.
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — system reference. directory layout, api surface, data channel choreography, token model.
- [docs/SECURITY.md](./docs/SECURITY.md) — threat model + the JWT verifier in full.
- [CONTRIBUTING.md](./CONTRIBUTING.md) — how to contribute. what gets pushback.
- [docs/brand/](./docs/brand/) — logo, icon, color palette.

---

## license

AGPL-3.0. free forever. 
if you build on it, give back.
