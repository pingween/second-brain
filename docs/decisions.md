# Döntések

A vaultban lévő `01.01 Second Brain build/design-overview.md` a tervezési háttér. Itt a kódot érintő döntések vannak röviden.

## Architektúra
- **Futtatás:** Cloudflare Worker (TypeScript), Telegram webhookkal. A webhook-titkot és a Telegram user ID-t ellenőrzi; csak a tulajdonos üzeneteit fogadja.
- **Vault:** Google Drive-on marad, nem Gitben, mert a Folder Notes mappákban bináris fájlok is vannak. A Worker a Drive API-n keresztül ír.
- **Drive-hitelesítés:** OAuth refresh token a tulajdonos nevében, nem service account. Személyes Drive-on a service account nem birtokolhat fájlt, ami a bináris feltöltést megakadályozná. Az OAuth appnak „In production” módban kell lennie, különben a token 7 nap után lejár.
- **AI:** minden hívás a Cloudflare AI Gatewayen, Unified Billinggel megy, így egy számla van. A szöveghez és a képhez Claude-ot használ. Modell: `anthropic/claude-haiku-5.5`. A routinghoz a TypeSafe Jev a jelölt (`typesafe/jev`): a katalógusban third-party modellként szerepel, így Unified Billinggel elérhető.
- **Routing:** nincs kötelező előtag, a rendszer maga ismeri fel a szándékot (szöveg, fotó, PDF). Hibrid: egy központi router-index (JD 00.00) dönti el a cél-JD-elemet, a tartalmi szabályok pedig a célmappában lévő `_meta.md`-ben vannak. A Worker kódja általános; új kategória = új `_meta.md`, kódmódosítás nélkül.
- **Bizonytalanság:** alacsony biztonságnál a bot Telegram-gombokkal kérdez vissza, javasolt célokkal.
- **Bináris fájlok:** új csatolmányt feltölthet a célmappába, meglévő binárist nem módosít és nem töröl.
- **Titkok:** `wrangler secret put`, soha nem kerülnek a repóba.

## Ütemterv
1. ✅ Minimális lánc: Telegram → Worker → Claude → Inbox-bejegyzés → visszaigazolás (`apps/bot`).
2. Router-index + a filmlista `_meta.md`-je + bizonytalansági gombok.
3. Bináris iktatás (számlák, egészségügyi papírok).
4. A meglévő Drive migrálása a JD-struktúrába (`scripts/`).
