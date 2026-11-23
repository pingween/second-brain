import type { Env } from "./types.ts";

// Personal Gmail Drive: service accounts can't own files there, so we use an
// OAuth refresh token issued to the user (see scripts/get-google-refresh-token.mjs).

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(env: Env): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

export async function readTextFile(env: Env, fileId: string): Promise<string> {
  const token = await getAccessToken(env);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Drive read failed: ${res.status} ${await res.text()}`);
  return res.text();
}

export async function writeTextFile(env: Env, fileId: string, content: string): Promise<void> {
  const token = await getAccessToken(env);
  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/markdown; charset=UTF-8",
      },
      body: content,
    },
  );
  if (!res.ok) throw new Error(`Drive write failed: ${res.status} ${await res.text()}`);
}
