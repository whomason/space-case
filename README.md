# Space Crates

An 8-bit space crate-opening game: open crates, gear up your astronaut and ship, land on 20 planets, fight aliens, mine ore. Sign in to keep your save in the cloud, add friends, join a crew and trade.

**Play:** https://spacecrates.net/

## Planets and relics

- Every planet has one signature mechanic and its own map shape: supply drops on Dustmoor, black ice on Glacis, tides on Saltmere, total darkness on Abyssia, and so on.
- Each boss drops a **relic**. It is the key to the next planet's mechanic (cleat spikes stop you sliding on Glacis, the coolant core handles Pyrrhos's heat).
- The star map and the warp screen show each planet's signature, its prize relic, and which relic helps you there. The code is in `src/sigs.js`.

## How it's built

- `src/` holds the game code, and `head.html` holds the page shell.
- `python3 build.py` joins them into one file, `index.html`, which is what GitHub Pages serves.
  - On the website the whole game runs inside one closure, so nothing can be changed from the browser console.
  - `space-case.html` is the same game with everything exposed, for the tests.
- The online features use [Supabase](https://supabase.com).
  - `server/schema.sql` sets up the whole backend: tables, read rules and the server functions.
  - To set it up or update it, paste the file into Supabase → SQL Editor and run it. It's safe to run again.

## Online safety notes

- The key in `src/online.js` is Supabase's *publishable* key. It's meant to be public.
- Players can only read what the database rules allow, and every change goes through the server functions.
- Never put the **secret / service_role** key in this repo.

## Fair play and moderation

- Saves on a device carry a seal. Editing the save file by hand marks it.
- Every cloud save goes through a fair-play check (coins, item levels, how much changed since the last save).
- An impossible jump never deletes anything. It flags the account: trading and the market pause and it drops off the leaderboards until a moderator clears it.
- Players can report each other. Moderators get a MOD tab in the ONLINE screen: reports, flags, bans, force-rename.
- To make yourself a moderator, run this once in the Supabase SQL Editor (with your callsign):
  `insert into public.admins select id from public.profiles where callsign = 'MASON';`

## Password reset

- "Forgot password?" on the sign-in screen sends a Supabase reset email that links back to the game.
- In Supabase → Authentication → URL Configuration, the Site URL should be `https://spacecrates.net/` (add it and the old `https://whomason.github.io/space-case/` under Redirect URLs).

## The store (Stardust, the season pass, the supporter plate)

Money goes through Stripe. Prices live in the database and in `server/functions/checkout/index.ts`, never in the game.

1. Make a Stripe account. **It has to be in an adult's name** (a parent or guardian if you're under 18).
2. Supabase → Edge Functions → Deploy a new function called `checkout`. Paste `server/functions/checkout/index.ts`.
3. Deploy another called `stripe-webhook`. Paste `server/functions/stripe-webhook/index.ts`, and turn **Verify JWT off** for this one.
4. Stripe → Developers → Webhooks → Add endpoint: `https://covyfmkuqynrlzsaieme.supabase.co/functions/v1/stripe-webhook`, with the events `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `charge.refunded`.
5. Supabase → Edge Functions → Secrets: add `STRIPE_SECRET_KEY` (Stripe → Developers → API keys) and `STRIPE_WEBHOOK_SECRET` (the webhook's signing secret).
6. Test with Stripe's test mode keys first (card `4242 4242 4242 4242`), then switch to live keys.

Never put either Stripe key in this repo. Until the secrets are set, the store says "payments are not set up yet".

- Stardust packs, the FROSTFALL pass (ends January 1) and the supporter plate are the things money buys. Stardust buys shop cosmetics, coin packs, the pass and the plate.
- Store, pass and streak cosmetics can never be traded, listed, sold or fused. A save edited to add them has them removed by the server.
- The moderator STATS tab shows players per day, how many come back, the new-player funnel, money, bug reports and crashes.

## Legal pages

`terms.html` and `privacy.html` sit next to the game. Read them and add a support email before taking real payments. They're a starting point, not legal advice.

## Co-op

Land on a planet with a friend from the star map ("LAND WITH A FRIEND"). The host's game runs the aliens; the guest sees and shoots copies of them, and each player decides their own hits. Kills pay both players; ore and cargo are separate. If one player leaves, the other keeps playing. Co-op uses realtime messages too (about 13 a second per pair).

## Tests

- `server/test_schema.py` runs the backend against a local Postgres.
- `server/e2e.py` plays sign-up, friends, crews and a full trade in real browsers against `server/mock_supabase.py`.
- `server/arena_e2e.py` plays FFA servers, kill rewards, host hand-over, ranked 1v1s and AI duels across browser tabs.
- `server/test_store.py` checks the store, Stardust, the pass, daily rewards v2, bug reports, crashes and analytics in the database.
- `server/store_e2e.py` buys Stardust through a fake checkout, claims pass tiers, uses the shop and checks clickable profiles, bug reports and stats.
- `server/coop_e2e.py` plays a co-op landing across two tabs: invite, shared aliens, shared kills, the boss, and one player leaving.
- `server/live_e2e.py` plays daily rewards, the market, reports and bans, friend challenges, watching a 1v1, emotes, password reset, key rebinding and the fair-play flag.

## Live play

- Arenas and duels use Supabase Realtime: broadcast plus presence.
- The first player in a room also runs the AI pilots.
- 1v1 matchmaking looks for a real pilot first. If other players are online it waits up to about 35 seconds, otherwise about 10, then brings in an AI pilot. Friends who type the same code on the 1V1 tab only get matched with each other.
- A server holds 10 pilots: up to 5 real players, and AI pilots fill the empty seats, never more than 5 of them.
- The free plan allows 100 realtime messages per second for the whole project, so that's the real limit on how many live matches can run at once.
