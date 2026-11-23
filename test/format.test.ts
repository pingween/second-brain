import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appendEntry,
  fallbackTriage,
  formatInboxEntry,
  formatTimestamp,
  parseTriage,
} from "../src/format.ts";
import { extractText } from "../src/llm.ts";

test("formatTimestamp uses the given time zone", () => {
  // 2026-11-23 07:50 UTC = 08:50 in Budapest (CET)
  assert.equal(formatTimestamp(new Date("2026-11-23T07:50:00Z"), "Europe/Budapest"), "2026-11-23 08:50");
});

test("parseTriage accepts JSON wrapped in prose or fences", () => {
  const t = parseTriage('Here:\n```json\n{"title":"Parasite","summary":"Megnézendő film.","tag":"film"}\n```');
  assert.deepEqual(t, { title: "Parasite", summary: "Megnézendő film.", tag: "film" });
});

test("parseTriage rejects garbage and sanitises bad tags", () => {
  assert.equal(parseTriage("no json here"), null);
  assert.equal(parseTriage('{"title": 3}'), null);
  assert.equal(parseTriage('{"title":"x","summary":"y","tag":"Számla!"}')?.tag, "egyeb");
});

test("formatInboxEntry quotes the raw message and the attachment note", () => {
  const entry = formatInboxEntry(
    "2026-11-23 08:50",
    { title: "Parasite", summary: "Megnézendő.", tag: "film" },
    "megnézendő\n\nParasite",
    "[fotó csatolva – még nincs feldolgozva]",
  );
  assert.equal(
    entry,
    "- 2026-11-23 08:50 · **Parasite** — Megnézendő. `#film`\n" +
      "  > megnézendő\n  > Parasite\n  > [fotó csatolva – még nincs feldolgozva]",
  );
});

test("appendEntry keeps one newline between entries", () => {
  assert.equal(appendEntry("", "a"), "a\n");
  assert.equal(appendEntry("x", "a"), "x\na\n");
  assert.equal(appendEntry("x\n", "a"), "x\na\n");
});

test("fallbackTriage uses the first line", () => {
  assert.equal(fallbackTriage("első sor\nmásodik").title, "első sor");
});

test("extractText handles the three response shapes", () => {
  assert.equal(extractText({ response: "a" }), "a");
  assert.equal(extractText({ choices: [{ message: { content: "b" } }] }), "b");
  assert.equal(extractText({ content: [{ type: "text", text: "c" }] }), "c");
  assert.equal(extractText({}), null);
});
