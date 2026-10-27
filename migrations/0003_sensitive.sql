-- 邮件分类：code | reset | billing | security | other（入库时识别）
ALTER TABLE messages ADD COLUMN category TEXT NOT NULL DEFAULT 'other';
-- 分享链接默认不显示敏感类（reset/billing/security），管理员建链接时可显式打开
ALTER TABLE share_links ADD COLUMN show_sensitive INTEGER NOT NULL DEFAULT 0;
