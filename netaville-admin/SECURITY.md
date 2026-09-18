# Security model

How Netaville decides who someone is, and what is still owed. Written for
whoever picks this up next.

## The shape of it

One door for the app, one for the panel, one kind of session each.

| | Student | Member | Admin |
|---|---|---|---|
| Credential | email + password | email + password | panel password |
| Verified by | scrypt hash, after an emailed code confirmed the address | scrypt hash, after an emailed code | `ADMIN_PASSWORD` |
| Role decided by | the address is `*.ukim.mk` | the address is anything else | seeded row |
| Carries | JWT access + refresh token | same | signed cookie |
| Gets | everything, plus cafeteria pricing | everything else | the panel |

## The app's session

**Access token** — a JWT (`lib/jwt.ts`), HS256, 15 minutes, audience
`netaville-app`. Sent as `Authorization: Bearer …` on every request. Stateless:
`lib/student.ts` verifies the signature and then reads the user row to confirm
the account is still active, so deactivating someone takes effect immediately
rather than whenever their token happens to lapse.

There is no revocation list for access tokens. That is deliberate — the whole
value of a stateless token is not having one — and it is why they are short.
Fifteen minutes is the window in which a stolen access token still works.

**Refresh token** — 32 random bytes, opaque, 90 days (`lib/refreshTokens.ts`).
Stored only as a SHA-256 digest, so the table is worthless to anyone who reads
it. No salt and no slow KDF: the input is already 256 bits of entropy, so there
is no dictionary to run.

Rotated on every use, with **reuse detection**. Each exchange spends the token
presented and issues a successor in the same `family`. A spent token coming
back means it was replayed — by the real device or by a thief holding a copy,
and the server cannot tell which — so the entire family is revoked and that
device signs in again. The app cooperates by funnelling concurrent refreshes
through a single in-flight promise (`src/lib/api.ts`), so a burst of 401s
cannot spend the token twice and trip the alarm by accident.

One family per sign-in, so signing out one phone leaves the others alone.
`{everywhere: true}` revokes all of them; deactivating an account in the panel
does the same.

## What replaced what

The app used to send `x-netaville-student-id/-name/-email` headers and the
server believed them. Anyone who could reach the API could read any student's
feed, RSVP as them, file event requests in their name, and conjure roster
entries by inventing a `@ukim.mk` address. Those headers are gone.

There was then a Microsoft sign-in: the app ran authorization-code + PKCE
against Microsoft and the server verified the returned `id_token` against
Microsoft's JWKS. It was correct, and it never shipped — the UKIM tenant blocks
user consent, so every student's first sign-in needed a tenant admin to approve
the app, and that approval was never going to come. It is removed.

**What decides a student now.** Registration takes a name, an email and a
password and creates nothing. It parks the details in `email_verifications`,
mails a six-digit code to the address, and only when the code comes back at
`/api/app/auth/verify` is the `users` row created — with `role` set by the
address (`*.ukim.mk` → student, else member; `createVerifiedUser` in
`lib/store.ts`). So a `student` role means "someone answered mail sent to a
ukim.mk address". That is weaker than Microsoft proving the account exists —
anyone who controls *any* ukim.mk mailbox, or a forwarded one, can get it — but
it is the normal bar for gating a discount, and there is no admin at UKIM in the
loop to block it.

The code: SHA-256 only in the table, 15-minute expiry, five wrong guesses then
the row is deleted, and the endpoints (`/register`, `/verify`, `/verify/resend`)
are rate-limited per address and per IP. A million-value code over that window
is not worth walking. The password is scrypt-hashed *before* it reaches
`email_verifications`, so that table holds neither a password nor a usable code.

**Sending mail** is one seam, `lib/mailer.ts`: Resend when `RESEND_API_KEY` is
set, otherwise the code is logged to the server console (the whole of local
dev). Swapping providers is that one file.

The `__DEV__` "continue as a test student" button is gone too. It minted a
session the client decided on by itself, and there is no longer anywhere such a
thing could come from.

## On the device

`expo-secure-store` with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`: unreadable while the
phone is locked, excluded from iCloud Keychain and from encrypted backups, so a
session cannot be restored onto a different handset. Passwords are never
persisted — they go to the API and are dropped.

That keychain class is the whole of the on-device protection, and it is tied to
the device passcode rather than to anything Netaville does. There is no
app-level lock: someone holding an unlocked phone has the app, and the card's QR
is visible in the app-switcher thumbnail. Both are acceptable given the QR
rotates every 60 seconds and a stamp still needs a member of staff to scan it.

## Panel

Session cookie is a signed JWT (audience `netaville-panel`, so an app token can
never open the panel), `httpOnly`, `sameSite=lax`, `secure` in production, 12h.
It used to be the bare user id — and `newId` is a timestamp plus three random
characters, so it was guessable.

`ADMIN_PASSWORD` from the environment, compared in constant time. Unset in
development falls back to `netaville`; unset in production refuses every
sign-in rather than accept a default that is public in this repository.

## Everything else

- **Rate limits** on sign-in, sign-up, refresh and panel login
  (`lib/rateLimit.ts`). In-process, so behind several instances the effective
  limit multiplies — move it to Redis when that happens.
- **Password bounds.** scrypt at N=2^17 is expensive on purpose, so an
  unbounded password is a denial of service in one request. Capped at 200.
- **Security headers** (`next.config.ts`): `frame-ancestors 'none'`, nosniff,
  `Referrer-Policy`, `Permissions-Policy`, HSTS.
- **Uploads** are served with `default-src 'none'; sandbox`, which neutralises
  the SVG-as-script vector while still letting `<img src="/uploads/…">` render.
- **SQL** is parameterised throughout; the two dynamic `UPDATE`s build column
  names from hardcoded whitelists (`lib/store.ts`).
- **Malformed request bodies** parse to `{}` rather than throwing a 500.

## Required in production

```
APP_JWT_SECRET=      # openssl rand -base64 48 — mints every session; the one that matters
ADMIN_PASSWORD=      # unset refuses all panel sign-ins
RESEND_API_KEY=      # unset logs verification codes to the console instead of mailing them
MAIL_FROM=           # an address on a domain verified with Resend
CANVA_TOKEN_KEY=     # else the Canva refresh token is stored in plain text
```

`APP_JWT_SECRET` unset is a hard startup failure in production, on purpose.
`RESEND_API_KEY` unset is not fatal — but nobody outside the server console can
then register.

## Still owed

- **Student ownership is only mailbox control.** A verified code proves someone
  can read mail at a ukim.mk address, not that they are the enrolled student it
  belongs to — a shared, forwarded or compromised faculty mailbox gets the
  discount. Microsoft SSO would close this; the tenant-consent wall is why it
  isn't there.
- **Legacy screen feed** (`/api/screens/[id]/feed`) is still unauthenticated
  and guarded only by the guessable `newId`. It is kept for the admin's
  `/screen/[id]` preview; real screens now go through `/tv`, which enrols the
  device and gives it a 32-byte token (`lib/tvToken.ts`, stored as SHA-256).
  `/api/tv/feed` checks that token. The old route should be retired once the
  preview moves to a token too, or restricted to an authenticated admin.
- **Registration enumeration.** `/register` answers 409 for an address that
  already exists, which confirms it. A generic "check your email" reply for both
  cases would close it, at the cost of a worse experience for the common
  typo-the-email case.
- **Rate limiting is per-instance.** See above.
- **`x-forwarded-for` is client-controlled** unless something upstream
  overwrites it. Behind a proxy that sets it, the limits hold; exposed
  directly, they can be rotated around.
- **Stamp QR codes are not signed** (`lib/stampCode.ts`). What stands behind a
  stamp is that a member of staff scanned a phone in front of them; the rotation
  only stops a forwarded screenshot. Signing them would close the gap.
- **No certificate pinning** in the app. Worth it if the API ever moves to a
  fixed production host.
- **`npm audit`** in the mobile app reports 16 moderate advisories, all in
  `@expo/config-plugins` (build-time tooling, not shipped in the binary).
