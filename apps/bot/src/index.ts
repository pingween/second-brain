import type { Env, TgMessage, TgUpdate } from "./types.ts";
import { secretMatches, sendMessage, sendTyping, setWebhook } from "./telegram.ts";
import { triageMessage } from "./llm.ts";
import { readTextFile, writeTextFile } from "./drive.ts";
import { homePage, privacyPage } from "./pages.ts";
import { appendEntry, fallbackTriage, formatInboxEntry, formatTimestamp } from "./format.ts";

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/health") return new Response("ok");
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/privacy")) {
      return new Response(url.pathname === "/" ? homePage : privacyPage, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    if (req.method !== "POST" || (url.pathname !== "/telegram" && url.pathname !== "/setup-webhook")) {
      return new Response("not found", { status: 404 });
    }
    if (!secretMatches(req.headers.get("X-Telegram-Bot-Api-Secret-Token"), env.TELEGRAM_WEBHOOK_SECRET)) {
      return new Response("forbidden", { status: 403 });
    }

    // One-off: register this Worker's /telegram URL as the bot's webhook.
    if (url.pathname === "/setup-webhook") {
      const result = await setWebhook(env, `${url.origin}/telegram`);
      return Response.json(result);
    }

    const update = (await req.json()) as TgUpdate;
    // Ack immediately so Telegram doesn't retry; do the work in the background.
    ctx.waitUntil(
      handleUpdate(update, env).catch((err) => console.error("handleUpdate failed", err)),
    );
    return new Response("ok");
  },
} satisfies ExportedHandler<Env>;

async function handleUpdate(update: TgUpdate, env: Env): Promise<void> {
  const msg = update.message;
  if (!msg) return;

  if (String(msg.from?.id ?? "") !== env.ALLOWED_USER_ID) {
    console.warn("Ignored message from non-whitelisted user", msg.from?.id);
    return;
  }

  const text = (msg.text ?? msg.caption ?? "").trim();
  const attachmentNote = describeAttachment(msg);
  if (!text && !attachmentNote) return;

  await sendTyping(env, msg.chat.id);

  try {
    let triage = null;
    try {
      triage = await triageMessage(env, text || attachmentNote!);
    } catch (err) {
      console.error("LLM call failed, using fallback", err);
    }
    triage ??= fallbackTriage(text || attachmentNote!);

    const timestamp = formatTimestamp(new Date(msg.date * 1000), env.TIMEZONE);
    const entry = formatInboxEntry(timestamp, triage, text, attachmentNote ?? undefined);

    const existing = await readTextFile(env, env.INBOX_FILE_ID);
    await writeTextFile(env, env.INBOX_FILE_ID, appendEntry(existing, entry));

    await sendMessage(env, msg.chat.id, `📥 Inboxba mentve: ${triage.title} (#${triage.tag})`, msg.message_id);
  } catch (err) {
    console.error("Capture failed", err);
    await sendMessage(
      env,
      msg.chat.id,
      `⚠️ Nem sikerült menteni: ${err instanceof Error ? err.message.slice(0, 200) : "ismeretlen hiba"}`,
      msg.message_id,
    );
  }
}

/** Attachments are only noted in step 1; downloading/filing them comes in step 3. */
function describeAttachment(msg: TgMessage): string | null {
  if (msg.photo?.length) return "[fotó csatolva – még nincs feldolgozva]";
  if (msg.document) return `[dokumentum: ${msg.document.file_name ?? "névtelen"} – még nincs feldolgozva]`;
  return null;
}
