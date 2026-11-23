# second-brain

Személyes „második agy”: Telegramon beküldött jegyzetek, linkek, fotók és dokumentumok automatikusan a megfelelő helyre kerülnek egy Johnny Decimal szerint rendezett Obsidian vaultban, ami Google Drive-on van.

## Felépítés

| Mappa | Mi van benne |
| --- | --- |
| [`apps/bot`](apps/bot) | Cloudflare Worker: Telegram → Claude (AI Gateway) → Drive. Telepítési leírás a saját README-jében. |
| `packages/` | Közös kód több rész számára (pl. Drive-kliens, JD-útvonalak), ha szükség lesz rá. |
| `scripts/` | Egyszeri vagy ritka feladatok, pl. a meglévő Drive migrálása a JD-struktúrába. |
| [`docs`](docs) | Architektúra és döntések. |

npm workspaces: a gyökérben futtatott `npm install` minden részt telepít.

```bash
npm install
npm test          # minden rész tesztje
npm run typecheck
```

Egy részen belül: `npm run deploy -w apps/bot`.
