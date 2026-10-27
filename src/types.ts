export interface Env {
  DB: D1Database;
  ATTACHMENTS: R2Bucket;
  /** 管理接口的 Bearer token（secret） */
  ADMIN_TOKEN?: string;
  RETENTION_DAYS?: string;
  PUBLIC_BASE_URL?: string;
  FORWARD_TO?: string;
}

export interface AttachmentMeta {
  n: number;
  filename: string;
  mimeType: string;
  size: number;
  inline: boolean;
  contentId: string | null;
}

export interface MessageRow {
  id: string;
  mailbox: string;
  from_address: string | null;
  from_name: string | null;
  subject: string | null;
  received_at: number;
  text_body: string | null;
  html_body: string | null;
  html_r2_key: string | null;
  size: number;
  attachments_json: string;
}

export interface MessageListRow {
  id: string;
  from_address: string | null;
  from_name: string | null;
  subject: string | null;
  received_at: number;
  snippet: string | null;
  attachments_json: string;
}

export type LinkStatus = 'active' | 'revoked' | 'expired';

export interface ShareLinkRow {
  key: string;
  mailbox: string;
  label: string | null;
  window_minutes: number;
  expires_at: number | null;
  status: LinkStatus;
  created_at: number;
  revoked_at: number | null;
}

/** 允许的时间窗口（分钟）；0 = 不限（仍受保留天数约束） */
export const WINDOW_OPTIONS = [0, 30, 60, 360, 1440, 10080] as const;
