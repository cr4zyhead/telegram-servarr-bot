# telegram-servarr-bot

A Telegram bot to manage **Radarr** (movies) and **Sonarr** (series) from chat: search with a **poster carousel**, add with quality profile and folder, browse your library and the upcoming calendar. Inline-button UI, **bilingual (English/Spanish)** — it auto-detects each user's Telegram language and can be overridden per user with `/language`.

Modern rewrite (Node 22+, ESM, [grammY](https://grammy.dev)) inspired by [itsmegb/telegram-radarr-bot](https://github.com/itsmegb/telegram-radarr-bot) (MIT), which relied on long-retired APIs. This bot speaks `/api/v3`, the current API on both apps (note the API number doesn't match the app version) — compatible with Radarr v3 and later (tested on v6.x) and Sonarr v3/v4 (tested on v4.x).

## Commands

| Command | Description |
|---|---|
| `/movie <name>` (aliases `/q`, `/query`) | Search and add a movie to Radarr: browse results in a poster carousel (◀️ ✅ ▶️, with synopsis) → quality profile → folder (skipped if there's only one) → download now? |
| `/serie <name>` | Same for Sonarr, with an extra step: which seasons to monitor (all / future / first / last). If the series is already in the library, it shows its seasons (with download %) so you can monitor and search another one |
| `/library [filter]` | Combined 🎬 + 📺 library, with optional filter (text or regex) |
| `/upcoming [days]` | Combined calendar of releases and episodes (default 30 days) |
| `/queue` | Current downloads across both services, with progress % |
| `/language es\|en` | Set your language. Without it, the bot follows your Telegram client's language (English/Spanish, Spanish as fallback); the choice is saved per user |
| `/clear` | Cancel the wizard in progress |
| `/auth <password>` | Request access to the bot |
| `/help`, `/start` | Help |

**Admin only** (the `owner` from the config): `/remove <name>` (delete a movie/series from the library, with confirmation and optional file deletion), `/rss` (RSS sync on both services), `/wanted` (search missing items), `/refresh` (refresh libraries), `/users`, `/revoke`, `/unrevoke` (user management with buttons), `/cid` (chat ID).

## Requirements

- A Telegram bot: create it with [@BotFather](https://t.me/BotFather) and keep the token.
- Radarr (v3 or later, including v6) and/or Sonarr (v3/v4) reachable over the network, with their API keys (Settings → General → Security → API Key). Sonarr is optional: without it, the bot works movies-only.
- Your numeric Telegram ID to be the admin (ask [@userinfobot](https://t.me/userinfobot)).
- Docker (recommended) or Node.js 22+.

## Configuration

Create `config/config.json` from the example:

```bash
cp config/config.example.json config/config.json
```

```jsonc
{
    "telegram": { "botToken": "123456:ABC..." },   // BotFather token
    "bot": {
        "password": "pick-a-password",             // used with /auth
        "owner": 123456789,                        // your numeric ID (admin)
        "maxResults": 10                           // max search results shown
    },
    "radarr": {
        "hostname": "192.168.1.10",
        "apiKey": "RADARR_API_KEY",
        "port": 7878
    },
    "sonarr": {                                    // optional: remove if you don't use Sonarr
        "hostname": "192.168.1.10",
        "apiKey": "SONARR_API_KEY",
        "port": 8989
    }
}
```

Optional per-service fields: `ssl` (bool) and `urlBase` (e.g. `"/radarr"` behind a subpath reverse proxy).

### Download notifications (optional)

Add a `webhook` section to `config.json` to get a Telegram message when a download finishes importing:

```jsonc
"webhook": {
    "token": "any-long-random-string",   // e.g. openssl rand -hex 16
    "port": 8787                          // optional, default 8787
}
```

The bot then listens on that port (already exposed in `docker-compose.yml`). In **Radarr and Sonarr → Settings → Connect → + → Webhook**, set:

- URL: `http://<bot-host>:8787/webhook?token=<your token>`
- Method: POST, trigger **On Import Complete / On Download**

Notifications go to `bot.owner`, or to a group if you add `"notifyId": <group chat id>` under `bot` (get the id with `/cid` in the group). Episodes of the same series are batched: when a whole season comes in, you get **one** message listing all episodes (e.g. `Friends — 10 new episode(s): 2x01–2x10`) after a ~2-minute quiet window, instead of one alert per episode. Keep the port LAN-only (firewall it) — the endpoint is plain HTTP.

Also create `config/acl.json` with an empty user list:

```bash
echo '{"allowedUsers":[],"revokedUsers":[]}' > config/acl.json
```

`config/config.json` and `config/acl.json` are gitignored: your tokens are never committed.

## Run

**With Docker (recommended):**

```bash
docker compose up -d --build
docker logs -f telegram-radarr-bot   # should print: Bot iniciando… sonarr: true|false
```

**Without Docker:**

```bash
npm install
npm start
```

## First use

1. Message the bot on Telegram: `/auth <the password from config.json>`.
2. The first authorized user lands in `config/acl.json`; the `owner` also sees admin commands in `/help`.
3. Try `/movie dune` and follow the buttons. If your Telegram is in English you'll get English replies automatically; `/language es|en` overrides it.

## Development

```bash
npm test        # node:test, no frameworks
```

| File | Responsibility |
|---|---|
| `src/bot.js` | Entry point: auth/ACL, language middleware, command and conversation registration |
| `src/api.js` | Minimal REST client for Radarr/Sonarr (`fetch` → `/api/v3`) |
| `src/movie.js` / `src/serie.js` | Add wizards (grammY conversations) |
| `src/wizard.js` | Inline-keyboard selection helpers (`pick`, `yesNo`) |
| `src/library.js` | Library, calendar and combined commands (pure functions) |
| `src/payloads.js` | Radarr/Sonarr v3 add payloads |
| `src/admin.js` | User management (revoke/restore) |
| `src/remove.js` | Remove wizard (admin) |
| `src/notify.js` | Webhook server for download notifications (`node:http`) |
| `src/acl.js` | Access-list persistence (`config/acl.json`), including per-user language |
| `src/lang.js` / `src/strings.js` | Language resolution and all texts (es/en) |
| `src/config.js` | Config loading |

Dependencies: just `grammy` and `@grammyjs/conversations`. Adding a third language = one more dictionary in `strings.js` plus its code in `/language`'s validation.

## License

MIT
