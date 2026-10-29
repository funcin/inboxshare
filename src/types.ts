export interface Env {
  DB: D1Database;
  ATTACHMENTS: R2Bucket;
  /** 管理接口的 Bearer token（secret） */
  ADMIN_TOKEN?: string;
  RETENTION_DAYS?: string;
  PUBLIC_BASE_URL?: string;
  FORWARD_TO?: string;
  /** 分享页语言：zh-CN | en（部署时在 wrangler.jsonc 里定） */
  LOCALE?: string;
  /** 可选：首页统计，站长 Plausible 面板里的站点名（src/analytics.ts）。留空 = 首页不打标 */
  ANALYTICS_DOMAIN?: string;
  /** 可选：首页“想要托管版”名单的通知邮件。三者都配了才发信，否则只落库 */
  EMAIL?: SendEmail;
  WAITLIST_TO?: string;
  WAITLIST_FROM?: string;
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
  /** 入库时识别出的验证码，没有则 null */
  code: string | null;
  /** 入库时识别出的操作链接（点开才拿到验证码 / 确认是我本人），没有则 null */
  link: string | null;
  /** code | reset | billing | security | other */
  category: string;
}

export interface MessageListRow {
  id: string;
  from_address: string | null;
  from_name: string | null;
  subject: string | null;
  received_at: number;
  snippet: string | null;
  attachments_json: string;
  code: string | null;
  link: string | null;
  category: string;
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
  /** 1 = 这条链接也显示密码重置/账单/账户安全类邮件；默认 0 */
  show_sensitive: number;
}

/** 允许的时间窗口（分钟）；0 = 不限（仍受保留天数约束） */
export const WINDOW_OPTIONS = [0, 30, 60, 360, 1440, 10080] as const;
