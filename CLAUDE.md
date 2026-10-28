# InboxShare · 项目规范

## 是什么

自有域名下某个邮箱地址的**只读共享收件箱**：Cloudflare Email Routing 把该地址的来信投给本 Worker，
Worker 解析、识别验证码、分类后把元数据/正文存 D1、附件存 R2，管理员生成 `/s/<key>` 链接（key = 邮箱用户名 + 备注或序号 + 10 位随机尾巴，随机尾巴是唯一的访问控制），访客只能在
链接设定的滚动时间窗口内（30 分钟 … 7 天 / 不限）只读查看邮件与下载附件。典型用途：把主邮箱里的验证码邮件
转发到这里，让家人或同事自助看验证码。

品牌名 **InboxShare**（只出现在显示层）；GitHub 仓库 `funcin/inboxshare`；正式域名 `inboxshare.app`（mail.funcin.de 作为旧入口保留）。
参考原型：dingyue.xzys.me 的「共享收件箱」（Renewlet 二开 + LanQin-Email）；同栈开源邻居：TooonyChen/AuthInbox。

## 红线（不做什么）

- 不发信、不回复、不转发给访客：页面永远只读。唯一的出站是可选的 `FORWARD_TO` 整体转发。
- 邮件 HTML **只在浏览器端消毒后放进 `sandbox` iframe + 严格 srcdoc CSP** 渲染，不在服务端拼 HTML、不开 `allow-scripts` / `allow-same-origin`。每次换邮件都新建 iframe（复用会往浏览器历史里加记录）。
- 密码重置、账单、账户安全类邮件（`src/classify.ts` 的 reset/billing/security）默认不进分享页，只有链接显式 `show_sensitive=1` 才放行。改分类规则必须跑 `pnpm test:classify`。
- 附件下载一律 `Content-Disposition: attachment`，HTML/SVG/XML/JS 类型强制 `application/octet-stream`。
- `ADMIN_TOKEN` 只走 `wrangler secret` / `.dev.vars`，不进 `wrangler.jsonc`，不进 git。
- 不手动 `wrangler deploy`（全局规范）：接 Workers Builds，`git push` 即部署。
- 页面不加载任何第三方资源（含 Google Fonts），用系统字体栈，CSP 保持 `default-src 'none'`。
- 文案不硬编码：分享页、管理页的字符串都在 `src/i18n.ts`，页面用 `{{key}}` 占位，服务端按 `LOCALE` 渲染。
- 营销与文档措辞不写"绕过 household / bypass"，只写"家人、多设备、合规范围内"。

## 数据单一源

- 业务数据：D1（表 `messages`、`share_links`，schema 在 `migrations/`，新字段只加迁移文件不改旧文件）。
- 附件与超大正文：R2（键 `att/<msgId>/<n>`、`body/<msgId>.html`）。
- 配置：`wrangler.jsonc` 唯一来源。**顶层是通用模板**（无资源 id、无路由，fork 即可用）；
  `env.production` 是作者实例（Worker `inboxshare`、D1 `shared-inbox`、域名 `inboxshare.app` + 旧入口 `mail.funcin.de`）。
  作者实例的 Workers Builds 部署命令是 `pnpm run deploy:production`（先远程迁移再部署）。
- 邮件最长保留 `RETENTION_DAYS`（默认 30），每天 03:17 UTC 的 cron 清理 D1 + R2。

## 部署方式

见 `README.md`「部署」：Deploy 按钮 / fork + Actions / 本地 wrangler 三选一，再在 Email Routing 把地址指向 Worker。
作者实例：Workers Builds 接 `funcin/inboxshare` 的 `main`，部署命令 `pnpm run deploy:production`。

## 验证命令

```bash
pnpm typecheck                 # tsc --noEmit
pnpm test:classify             # 验证码识别 + 邮件分类用例
pnpm db:migrate:local          # 本地 D1 建表
pnpm dev                       # http://127.0.0.1:8787
pnpm test:email                # 向本地投递 scripts/fixtures/sample.eml
```
投递后用 `/admin`（令牌在 `.dev.vars`）建链接，打开 `/s/<key>` 在桌面和手机视口真实渲染验证；改了文案要分别用
`pnpm dev --var LOCALE:en` 看英文版。
