# Sync setup — 5 minutes in the Supabase dashboard

The app's sync code is complete and ships disabled. It turns on when a
Supabase project exists and its two public keys are in the build. The
assistant's environment cannot reach supabase.com, so these dashboard steps
are the one human part; everything before and after is automated.

## 1. Create the project

[database.new](https://database.new) (or Dashboard → New project). Any name
(e.g. `endgame-trainer`), the free tier, nearest region, any strong database
password (you never need it again — the app doesn't use it).

## 2. Apply the schema

Project → **SQL Editor** → New query → paste the entire contents of
[`supabase/schema.sql`](../supabase/schema.sql) → **Run**. It creates the
three tables (`progress`, `lesson_reads`, `games`) with row-level security
so every row is private to its owner.

## 3. Configure auth for the deployed app

Project → **Authentication → URL Configuration**:

- **Site URL:** `https://nico101rsa.github.io/endgame-trainer/`
- **Redirect URLs:** add the same URL, and `http://localhost:5173` for
  local dev.

(Email magic links are enabled by default — nothing else to switch on. The
free tier's built-in email service is fine for a single user.)

## 4. Hand over the two public keys

Project → **Settings → API**. Copy:

- **Project URL** — looks like `https://xxxx.supabase.co`
- **anon / public key** — the long `eyJ…` one marked *anon* *public*

Paste both into the Claude session (or put them in `.env` yourself, see
`.env.example`). They are designed to ship in a public static build — RLS
does the protecting; the **service_role** key is the secret one and is
never needed here.

## 5. Done — the rest is automated

With the keys, the assistant commits `.env.production`, the Pages build
picks them up, and Settings → Account & sync shows the magic-link sign-in.
First live checks: sign in on one device, solve a position, sign in on a
second device and watch it appear.
