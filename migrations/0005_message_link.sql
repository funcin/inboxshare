-- 入库时识别出的操作链接（Netflix「取得存取码」、Disney+「是我本人」这类点开才拿到验证码的按钮），没有则 NULL
ALTER TABLE messages ADD COLUMN link TEXT;
