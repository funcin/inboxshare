-- 托管版意向名单：首页“想要托管版？留下邮箱”收集，只存邮箱、语言、时间
CREATE TABLE IF NOT EXISTS waitlist (
  email TEXT PRIMARY KEY,
  locale TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
