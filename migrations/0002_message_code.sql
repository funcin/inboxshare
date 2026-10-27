-- 入库时识别出的验证码（没有则 NULL），分享页用它做醒目展示
ALTER TABLE messages ADD COLUMN code TEXT;
