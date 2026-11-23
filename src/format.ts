import type { Triage } from "./types.ts";

/** "2026-11-23 08:50" in the given IANA time zone. */
export function formatTimestamp(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return parts.replace("T", " ");
}

/**
 * One Inbox entry: a summary line plus the raw message quoted below it,
 * so the original capture is never lost even if the summary is off.
 */
export function formatInboxEntry(
  timestamp: string,
  triage: Triage,
  raw: string,
  attachmentNote?: string,
): string {
  const head = `- ${timestamp} · **${triage.title}** — ${triage.summary} \`#${triage.tag}\``;
  const quoted = raw
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.length > 0)
    .map((l) => `  > ${l}`);
  if (attachmentNote) quoted.push(`  > ${attachmentNote}`);
  return [head, ...quoted].join("\n");
}

/** Appends an entry to existing markdown, keeping exactly one newline between them. */
export function appendEntry(existing: string, entry: string): string {
  if (existing.length === 0) return entry + "\n";
  const base = existing.endsWith("\n") ? existing : existing + "\n";
  return base + entry + "\n";
}

const TAG_RE = /^[a-z0-9-]{1,30}$/;

/**
 * Parses the model's JSON answer. Tolerates surrounding prose or code fences.
 * Returns null if nothing usable is found, so the caller can fall back.
 */
export function parseTriage(text: string): Triage | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  if (typeof obj !== "object" || obj === null) return null;
  const o = obj as Record<string, unknown>;
  if (typeof o.title !== "string" || typeof o.summary !== "string") return null;
  const tag = typeof o.tag === "string" && TAG_RE.test(o.tag) ? o.tag : "egyeb";
  return {
    title: o.title.trim().slice(0, 80) || "Névtelen",
    summary: o.summary.trim().replace(/\s+/g, " ").slice(0, 300),
    tag,
  };
}

/** Used when the LLM call fails: the capture still lands in the Inbox. */
export function fallbackTriage(raw: string): Triage {
  const firstLine = raw.trim().split(/\r?\n/)[0] ?? "";
  return {
    title: firstLine.slice(0, 60) || "Csatolmány",
    summary: "(automatikus összefoglaló nem készült)",
    tag: "egyeb",
  };
}
