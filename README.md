# Space Case

An 8-bit space crate-opening game: open crates, gear up your astronaut and ship, land on 20 planets, fight aliens, mine ore. Sign in to keep your save in the cloud, add friends, join a crew and trade.

**Play:** https://whomason.github.io/space-case/

## How it's built

- `src/` holds the game code, and `head.html` holds the page shell.
- `python3 build.py` joins them into one file, `index.html`, which is what GitHub Pages serves.
- The online features use [Supabase](https://supabase.com).
  - `server/schema.sql` sets up the whole backend: tables, read rules and the server functions.
  - To set it up or update it, paste the file into Supabase → SQL Editor and run it. It's safe to run again.

## Online safety notes

- The key in `src/online.js` is Supabase's *publishable* key. It's meant to be public.
- Players can only read what the database rules allow, and every change goes through the server functions.
- Never put the **secret / service_role** key in this repo.

## Tests

- `server/test_schema.py` runs the backend against a local Postgres.
- `server/e2e.py` plays sign-up, friends, crews and a full trade in real browsers against `server/mock_supabase.py`.
- `server/arena_e2e.py` plays FFA servers, kill rewards, host hand-over, ranked 1v1s and AI duels across browser tabs.

## Live play

- Arenas and duels use Supabase Realtime: broadcast plus presence.
- The first player in a room also runs the AI pilots.
- 1v1 matchmaking looks for a real pilot first. If other players are online it waits up to about 35 seconds, otherwise about 10, then brings in an AI pilot. Friends who type the same code on the 1V1 tab only get matched with each other.
- A server holds 10 pilots: up to 5 real players, and AI pilots fill the empty seats, never more than 5 of them.
- The free plan allows 100 realtime messages per second for the whole project, so that's the real limit on how many live matches can run at once.
