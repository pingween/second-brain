import type { Env, Triage } from "./types.ts";
import { parseTriage } from "./format.ts";

const SYSTEM_PROMPT = `Egy személyes jegyzetrendszer (Obsidian, Johnny Decimal) beérkező üzeneteit dolgozod fel.
A felhasználó Telegramon küld rövid, gyakran vázlatos üzeneteket: filmeket, linkeket, ötleteket, számlákat, egészségügyi papírokat, teendőket.
Feladatod: rövid címet és egymondatos magyar összefoglalót adni, és egy címkét választani.

Válaszolj KIZÁRÓLAG egyetlen JSON objektummal, semmi mással:
{"title": "max 60 karakter", "summary": "egy mondat magyarul", "tag": "egy szó, kisbetű, ékezet nélkül"}

Javasolt címkék: film, konyv, link, otlet, teendo, szamla, egeszseg, ajandek, egyeb.`;

/**
 * Asks Claude (via Cloudflare AI Gateway, Unified Billing) for a short triage.
 * Throws on transport errors; returns null if the answer can't be parsed.
 */
export async function triageMessage(env: Env, text: string): Promise<Triage | null> {
  const result: unknown = await (env.AI as any).run(
    env.CLAUDE_MODEL,
    {
      // Claude models take the Anthropic Messages format: the system prompt is a
      // top-level field, not a message with role "system".
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
      max_tokens: 300,
    },
    { gateway: { id: env.AI_GATEWAY_ID } },
  );
  const answer = extractText(result);
  return answer ? parseTriage(answer) : null;
}

/**
 * Pulls the text out of whichever response shape the gateway returns:
 * Workers AI style ({response}), OpenAI style ({choices}) or Anthropic style ({content}).
 */
export function extractText(result: unknown): string | null {
  if (typeof result === "string") return result;
  if (typeof result !== "object" || result === null) return null;
  const r = result as Record<string, any>;
  if (typeof r.response === "string") return r.response;
  const choice = r.choices?.[0]?.message?.content;
  if (typeof choice === "string") return choice;
  if (Array.isArray(r.content)) {
    const t = r.content.find((c: any) => c?.type === "text")?.text;
    if (typeof t === "string") return t;
  }
  return null;
}
