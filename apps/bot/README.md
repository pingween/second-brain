# second-brain-bot

Telegram → Cloudflare Worker → Claude (AI Gateway, Unified Billing) → Obsidian vault a Google Drive-on.

**1. lépés (ez a verzió):** minden üzenet egy rövid összefoglalóval és az eredeti szöveggel bekerül egy Inbox markdown fájlba, és a bot visszaigazol. Routing, `_meta.md`-k és csatolmány-iktatás a következő lépésekben jön.

```
Telegram ──webhook──▶ Worker /telegram
                        ├─ secret header + user ID ellenőrzés
                        ├─ Claude (env.AI.run, AI Gateway) → cím, összefoglaló, címke
                        ├─ Drive: Inbox .md letöltés → új bejegyzés → visszaírás
                        └─ Telegram visszajelzés
```

## Beállítás

### 1. Telegram
1. A **@BotFather**-ben `/newbot`, a tokent mentsd el.
2. A saját user ID-dat a **@userinfobot** megmondja → `wrangler.toml` → `ALLOWED_USER_ID`.
3. Generálj egy webhook-titkot (csak `A–Z a–z 0–9 _ -`): `openssl rand -hex 32`.

### 2. Cloudflare AI Gateway
1. Dashboard → **AI → AI Gateway** → új gateway `second-brain` néven.
2. Kapcsold be az **authentikációt** és a **Unified Billinget**, tölts fel egy kis kreditet.
3. A modell ID-ja a [katalógus](https://developers.cloudflare.com/ai/models/) szerint `anthropic/claude-haiku-5.5` (pontokkal, nem kötőjellel). Ez a modell Anthropic Messages formátumot vár, ezért a rendszerprompt felső szintű `system` mező.
4. A TypeSafe Jev (`typesafe/jev`, ill. `typesafe/jev-1.14.0`) third-party modellként szerepel a katalógusban, így az AI bindingen át Unified Billinggel hívható.

API-ból (token: AI Gateway Edit):
```bash
curl "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/ai-gateway/gateways" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H 'Content-Type: application/json' \
  -d '{"id":"second-brain","authentication":true,"byok_only":false,"workers_ai_billing_mode":"unified",
       "collect_logs":true,"cache_ttl":0,"cache_invalidate_on_update":true,"rate_limiting_interval":0,"rate_limiting_limit":0}'
```

### 3. Google Drive (OAuth)
Személyes Gmail-es Drive-on a service account nem tud fájlt birtokolni (a bináris feltöltésnél ez gond lenne), ezért a Worker a te nevedben, OAuth refresh tokennel ír.

1. [Google Cloud Console](https://console.cloud.google.com/) → új projekt → **Google Drive API** engedélyezése.
2. **OAuth consent screen**: External, add hozzá magad tesztfelhasználónak, majd állítsd **In production**-re. Tesztelési módban a refresh token 7 nap után lejár. Ellenőrizetlen appként a bejelentkezésnél figyelmeztetést kapsz; személyes használatra ez rendben van.
3. **Credentials → OAuth client ID → Desktop app.** A client ID-t és a secretet mentsd el.
4. Refresh token:
   ```bash
   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... npm run google-token
   ```
   Nyisd meg a kiírt URL-t, lépj be, és a terminál kiírja a `GOOGLE_REFRESH_TOKEN`-t.
5. Hozz létre a vaultban egy üres fájlt: `03 Inbox/telegram-inbox.md`. A Drive-linkjéből (`/file/d/<ID>/`) másold ki az ID-t → `wrangler.toml` → `INBOX_FILE_ID`.

### 4. Telepítés
```bash
npm install
npx wrangler login
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
npm run deploy
```

### 5. Webhook beállítása
A Worker maga regisztrálja a webhookot a saját tokenjével, így a bot tokenjének nem kell elhagynia a Cloudflare-t:
```bash
curl -X POST "https://second-brain-bot.<accountod>.workers.dev/setup-webhook" \
  -H "X-Telegram-Bot-Api-Secret-Token: <WEBHOOK_SECRET>"
```
A válasz a Telegram `setWebhook` válasza (`{"ok":true,...}`).

A titkokat a `wrangler secret put` helyett a dashboardon is megadhatod: Workers & Pages → `second-brain-bot` → Settings → Variables and Secrets → Add → típus: **Secret**.

Küldj a botnak egy üzenetet, pl. „megnézendő: Parasite”. Pár másodperc múlva válaszol, és a bejegyzés megjelenik a `telegram-inbox.md`-ben.

## Hibakeresés
- `npx wrangler tail`: élő logok.
- `GET /health`: `ok`, ha a Worker fut.
- Ha a Claude-hívás elszáll, a bejegyzés akkor is bekerül egy tartalék címmel, a hiba pedig a logban látszik.

## Fejlesztés
```bash
npm run typecheck
npm test
```
