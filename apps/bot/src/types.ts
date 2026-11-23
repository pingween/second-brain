export interface Env {
  AI: Ai;

  // Secrets (wrangler secret put ...)
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REFRESH_TOKEN: string;

  // Plain vars (wrangler.toml [vars])
  ALLOWED_USER_ID: string;
  INBOX_FILE_ID: string;
  AI_GATEWAY_ID: string;
  CLAUDE_MODEL: string;
  TIMEZONE: string;
}

export interface TgUser {
  id: number;
  first_name?: string;
}

export interface TgPhotoSize {
  file_id: string;
  width: number;
  height: number;
}

export interface TgDocument {
  file_id: string;
  file_name?: string;
  mime_type?: string;
}

export interface TgMessage {
  message_id: number;
  date: number;
  chat: { id: number };
  from?: TgUser;
  text?: string;
  caption?: string;
  photo?: TgPhotoSize[];
  document?: TgDocument;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
}

export interface Triage {
  title: string;
  summary: string;
  tag: string;
}
