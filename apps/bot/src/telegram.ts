import type { Env } from "./types.ts";

async function call(env: Env, method: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error(`Telegram ${method} failed: ${res.status} ${await res.text()}`);
}

export function sendMessage(env: Env, chatId: number, text: string, replyTo?: number) {
  return call(env, "sendMessage", {
    chat_id: chatId,
    text,
    ...(replyTo ? { reply_parameters: { message_id: replyTo } } : {}),
  });
}

export function sendTyping(env: Env, chatId: number) {
  return call(env, "sendChatAction", { chat_id: chatId, action: "typing" });
}

/** Constant-time comparison for the webhook secret header. */
export function secretMatches(got: string | null, expected: string): boolean {
  if (!got || !expected) return false;
  const a = new TextEncoder().encode(got);
  const b = new TextEncoder().encode(expected);
  if (a.byteLength !== b.byteLength) return false;
  return crypto.subtle.timingSafeEqual(a, b);
}
