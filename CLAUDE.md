# shared-inbox · 项目规范

## 是什么

自有域名下某个邮箱地址的**只读共享收件箱**：Cloudflare Email Routing 把该地址的来信投给本 Worker，
Worker 解析后把元数据/正文存 D1、附件存 R2，管理员生成 `/s/<随机 key>` 链接，访客只能在链接设定的
滚动时间窗口内（30 分钟 … 7 天 / 不限）只读查看邮件与下载附件。典型用途：合租账号的验证码共享。

参考原型：dingyue.xzys.me 的「共享收件箱」（Renewlet 二开 + LanQin-Email），本项目用纯 Cloudflare 栈复刻其分享层。

## 红线（不做什么）

- 不发信、不回复、不转发给访客：页面永远只读。唯一的出站是可选的 `FORWARD_TO` 整体转发。
- 邮件 HTML **只在浏览器端消毒后放进 `sandbox` iframe + 严格 srcdoc CSP** 渲染，不在服务端拼 HTML、不开 `allow-scripts` / `allow-same-origin`。
- 附件下载一律 `Content-Disposition: attachment`，HTML/SVG/XML/JS 类型强制 `application/octet-stream`。
- `ADMIN_TOKEN` 只走 `wrangler secret` / `.dev.vars`，不进 `wrangler.jsonc`，不进 git。
- 不手动 `wrangler deploy`（全局规范）：接 Workers Builds，`git push` 即部署。

## 数据单一源

- 业务数据：D1 `shared-inbox`（表 `messages`、`share_links`，schema 在 `migrations/`）。
- 附件与超大正文：R2 `shared-inbox-attachments`（键 `att/<msgId>/<n>`、`body/<msgId>.html`）。
- 配置：`wrangler.jsonc` 唯一来源；密钥走 secret。
- 邮件最长保留 `RETENTION_DAYS`（默认 30），每天 03:17 UTC 的 cron 清理 D1 + R2。

## 部署方式

见 `README.md`「部署」一节：D1/R2 建资源 → 填 `database_id` → 远程迁移 → 设 secret → 接 Workers Builds →
Email Routing 把地址指向本 Worker。

## 验证命令

```bash
pnpm typecheck                 # tsc --noEmit
pnpm db:migrate:local          # 本地 D1 建表
pnpm dev                       # http://127.0.0.1:8787
pnpm test:email                # 向本地投递 scripts/fixtures/sample.eml
```
投递后用 `/admin`（令牌在 `.dev.vars`）建链接，打开 `/s/<key>` 真实渲染验证。
