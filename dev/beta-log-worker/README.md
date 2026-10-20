# Beta download log (not deployed yet)

The /beta/ page asks for a name and email before the Download buttons work. Each download sends
{name, email, plugin, version, time} to this Cloudflare Worker, and so does the optional
"Send feedback" box (kind feedback, with the message). It all lands in one list, which keeps it in Workers KV.
GitHub Pages cannot store anything, so this is the one small backend.

## Set it up once (Cloudflare account that already holds dirtmonkeymusic.com)

1. `npm i -g wrangler`, then `wrangler login`.
2. `wrangler kv namespace create BETA_LOG` and paste the id into `wrangler.toml`.
3. `wrangler secret put ADMIN_TOKEN` and type a long random password. Keep it private.
4. `wrangler deploy` (from this folder). It prints the address, like https://dm-beta-log.<you>.workers.dev
5. In `js/beta.js`, set `LOG_URL` to that address plus `/log`, run the site checks, and push.

Free plan limits (100k requests a day, 1k KV writes a day) are far more than a beta needs.

## See the list

- In a browser: `https://dm-beta-log.<you>.workers.dev/list?token=<ADMIN_TOKEN>` (a table, newest first).
- As a spreadsheet: `https://dm-beta-log.<you>.workers.dev/export.csv?token=<ADMIN_TOKEN>` (opens in Numbers or Excel).
- Or in the Cloudflare dashboard: Storage and Databases, KV, BETA_LOG. Each key is one download.

## Try it on the Mac without Cloudflare

`node dev/beta-log-server.js` runs the same API on http://127.0.0.1:47330 and writes
dev/beta-log.local.jsonl. The list is at http://127.0.0.1:47330/list?token=local and
http://127.0.0.1:47330/export.csv?token=local.
