# peek

in indian college computer labs, teachers spend
about 30% of class time walking from desk to desk.

a student has an error. the teacher walks to that desk.
the next student has an error. the teacher walks to that desk.
repeat for 2 hours.

i am about to start teaching my friends and juniors
how to build and ship with ai.

i did not want to do the desk walk thing.

so i built this.

---

## what it does

a student opens a browser, types a 6-letter code and their name.
they are in. no install. no account.

when they are stuck, they raise their hand in the app.
i click view. i see their screen. they fix it. done.

one teacher. many students. nobody walks anywhere.

---

## the consent thing

the student has to accept before i can see anything.

this felt important to get right.

---

## try it

live demo → peek-flame.vercel.app
no setup, just open it.

---

## self-host

it runs on a $5 VPS. one docker compose up and that is all.

```bash
git clone https://github.com/howwohmm/peek
cd peek
cp .env.example .env
docker compose up --build
```

full setup guide below for production.

---

## production setup

if you put this on a real domain for your school or class, swap a few things first.

1. rotate the keys. the `.env.example` ships with dev defaults. do not ship those. generate fresh ones with `docker run --rm livekit/livekit-server generate-keys`.

2. point things at your domain.
   in `.env`, set `LIVEKIT_URL=wss://peek.yourdomain.com` and `NEXT_PUBLIC_LIVEKIT_URL=wss://peek.yourdomain.com`.
   put caddy or nginx in front to terminate TLS.
   browsers refuse webrtc over plain ws.

3. flip livekit to real-ip mode. in `livekit.yaml`, set `rtc.use_external_ip: true`. set `external-ip` in `coturn.conf` too.

4. open the ports. UDP 50000-50100 for media, TCP 7880, 7881, 3478, 5349.

5. `docker compose up -d`.

do not want to run servers?
deploy the next.js side to vercel (hobby tier, free).
point it at livekit cloud (build tier, free, 5000 minutes/month).
that is how peek-flame.vercel.app runs.
zero infra, $0/month, scales to your first ~50 students.

---

## stack

next.js, livekit, coturn, tailwind.
the server stores nothing. close the tab, the class is gone.

---

## license

AGPL-3.0. free forever.
if you extend it, share your changes.
