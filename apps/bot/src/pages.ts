// Static pages the Google OAuth consent screen requires (home page + privacy policy).
// The app is single-user; these only describe what the Worker does with data.

const page = (title: string, body: string) => `<!doctype html>
<html lang="hu"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;color:#222}</style>
</head><body>${body}</body></html>`;

export const homePage = page(
  "Second Brain",
  `<h1>Second Brain</h1>
<p>Személyes, egyfelhasználós Telegram-bot: a tulajdonosa által küldött jegyzeteket
a saját Obsidian-vaultjába (Google Drive) menti.</p>
<p>A personal, single-user Telegram bot that files its owner's notes into their own
Obsidian vault on Google Drive.</p>
<p><a href="/privacy">Adatkezelés / Privacy policy</a></p>`,
);

export const privacyPage = page(
  "Second Brain – Adatkezelés",
  `<h1>Adatkezelés / Privacy policy</h1>
<p>Ezt az alkalmazást kizárólag a tulajdonosa használja. Más felhasználók üzeneteit a bot figyelmen kívül hagyja.</p>
<ul>
<li><b>Milyen adatot kezel:</b> a tulajdonos Telegram-üzeneteit, és a tulajdonos Google Drive-ján lévő jegyzetfájlokat.</li>
<li><b>Mire használja:</b> az üzenetek feldolgozására (összefoglalás, kategorizálás egy MI-modellel a Cloudflare AI Gatewayen keresztül), és a megfelelő jegyzetfájlba írására a tulajdonos saját Drive-ján.</li>
<li><b>Tárolás:</b> az alkalmazás saját adatbázist nem tart fenn; a tartalom a tulajdonos Google Drive-ján marad. Hibakereséshez rövid ideig technikai naplók keletkezhetnek a Cloudflare-nél.</li>
<li><b>Megosztás:</b> adatot harmadik félnek nem ad tovább, a feldolgozáshoz használt szolgáltatókon (Telegram, Cloudflare, az MI-modell szolgáltatója, Google) kívül.</li>
<li><b>Google-adatok:</b> a Google API-kból kapott adatok használata megfelel a Google API Services User Data Policy előírásainak, beleértve a Limited Use követelményeit.</li>
</ul>
<p>This app is used only by its owner. It processes the owner's Telegram messages and the
owner's Google Drive notes solely to file those messages into the owner's own vault. No data
is sold or shared beyond the service providers needed to run it (Telegram, Cloudflare, the AI
model provider, Google). Use of Google API data complies with the Google API Services User
Data Policy, including the Limited Use requirements.</p>`,
);
