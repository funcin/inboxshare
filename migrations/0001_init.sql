-- 收到的邮件（正文直接存库；过大的 HTML 正文落 R2，html_r2_key 记录键名）
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  mailbox TEXT NOT NULL,
  from_address TEXT,
  from_name TEXT,
  subject TEXT,
  received_at INTEGER NOT NULL,
  text_body TEXT,
  html_body TEXT,
  html_r2_key TEXT,
  size INTEGER NOT NULL DEFAULT 0,
  attachments_json TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_messages_mailbox_received ON messages (mailbox, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_received ON messages (received_at);

-- 只读分享链接：一条链接 = 一个邮箱 + 一个滚动时间窗口（分钟，0 表示不限）
CREATE TABLE IF NOT EXISTS share_links (
  key TEXT PRIMARY KEY,
  mailbox TEXT NOT NULL,
  label TEXT,
  window_minutes INTEGER NOT NULL DEFAULT 30,
  expires_at INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_share_links_mailbox ON share_links (mailbox);
