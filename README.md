# InboxShare

**Share email verification codes through one read-only link.**
Forward verification emails from any mailbox to an address on your own domain; InboxShare turns that address into a read-only web page you can hand to family or teammates. No app, no accounts for viewers, runs free on Cloudflare Workers.

把任意邮箱里的验证码邮件转发到你自己域名下的一个地址，InboxShare 把这个地址变成一个只读网页链接，发给家人或同事即可自助查看验证码。访客不装 App、不注册账号；整套跑在 Cloudflare Workers 免费额度上。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/funcin/inboxshare)

```
sender ──SMTP──▶ Cloudflare Email Routing ──▶ Worker.email()
                                                │  postal-mime 解析 → 识别验证码 → 分类
                                                ├─▶ D1  messages / share_links
                                                └─▶ R2  附件、超大正文
访客 ──GET /s/<key>──▶ Worker.fetch() ──▶ 校验链接 → 只返回窗口内、非敏感的邮件（只读）
管理员 ──Bearer ADMIN_TOKEN──▶ /admin 与 /api/admin/*  建链 / 撤销 / 看邮箱
cron 每日 ──▶ 删除超过 RETENTION_DAYS 的邮件与附件
```

## 功能

- **一个链接看验证码**：链接是 32 位随机 key，可设过期时间，可随时撤销；访客只能看，不能回复、转发、删除。
- **滚动时间窗口**：每条链接只显示最近 30 分钟 / 1 小时 / 6 小时 / 1 天 / 7 天的邮件，或不限（受保留期约束）。
- **验证码识别**：入库时从主题和正文识别 4～8 位验证码，列表里做成标签，详情顶部做成大号复制卡片。规则保守，年份、订单号不会误判。
- **敏感邮件默认隔离**：密码重置、账单、账户安全变更三类邮件默认不出现在分享页，管理员建链接时可显式打开。
- **中英文**：`LOCALE` 设 `zh-CN` 或 `en`，分享页和管理页一起切换。
- **手机友好**：列表与详情全屏切换，系统返回手势回到列表。

## 工作方式

1. 用户在自己的主邮箱（Gmail、Outlook、iCloud 等）建一条过滤规则：只把特定发件人或含"验证码"的邮件转发到 `share@yourdomain.com`。
2. Cloudflare Email Routing 把这个地址的来信交给 Worker，Worker 解析、识别验证码、分类后存入 D1/R2。
3. 管理员在 `/admin` 为这个地址生成分享链接，发给需要看验证码的人。
4. 访客打开 `/s/<key>`，看到时间窗口内的邮件和验证码；页面每 30 秒自动刷新。

## 部署

三种方式任选，都不需要服务器。前提：有一个托管在 Cloudflare 的域名。

### 方式一：Deploy to Cloudflare 按钮

点上面的按钮，Cloudflare 会把仓库复制到你的账号、自动创建 D1 和 R2、接好 Workers Builds。完成后：

```bash
# 在你 fork 出来的仓库目录里
pnpm install
pnpm wrangler d1 migrations apply DB --remote        # 建表
pnpm wrangler secret put ADMIN_TOKEN                 # 一串 ≥16 位随机字符串，管理页的登录令牌
```

然后做下面的「Email Routing」一步。

### 方式二：fork + GitHub Actions

1. Fork 本仓库。
2. 仓库 Settings → Secrets and variables → Actions：
   - Variables：`DEPLOY_WITH_ACTIONS` = `true`
   - Secrets：`CLOUDFLARE_API_TOKEN`（Workers Scripts、D1、R2、Email Routing 均需 Edit）、`CLOUDFLARE_ACCOUNT_ID`、`ADMIN_TOKEN`
3. 推一次 `main`，工作流会建表、部署、写入令牌。没有创建的 D1/R2 会由 wrangler 自动创建。

### 方式三：本地 wrangler

```bash
pnpm install
pnpm wrangler login
pnpm run deploy            # 自动创建 D1/R2、建表、部署
pnpm wrangler secret put ADMIN_TOKEN
```

### Email Routing（三种方式都要做）

Dashboard → 你的域名 → Email → Email Routing：

1. 启用 Email Routing（按提示添加 MX / SPF 记录，一键即可）。
2. Routing rules → Create address → 填要共享的地址（如 `share@yourdomain.com`）→ Action 选 **Send to a Worker** → 选本 Worker。
3. 想同时把邮件转到真实邮箱：在 Destination addresses 验证一个目标邮箱，填进 `vars.FORWARD_TO`。

发一封测试邮件到该地址，打开 `https://<你的 Worker 地址>/admin`，输入令牌，这个邮箱就会出现在列表里，生成链接即可分享。

### 自定义域名与语言

`wrangler.jsonc` 顶层是通用模板。要绑自己的域名、改语言，照 `env.production` 的写法加一个环境（或直接改顶层）：

```jsonc
"routes": [{ "pattern": "inbox.yourdomain.com", "custom_domain": true }],
"vars": { "PUBLIC_BASE_URL": "https://inbox.yourdomain.com", "LOCALE": "en" }
```

`custom_domain: true` 会在部署时自动创建 DNS 记录和证书。注意配置了 `routes` 后 wrangler 默认关闭 `workers.dev` 入口。

## 配置

| 项 | 位置 | 说明 |
|---|---|---|
| `ADMIN_TOKEN` | secret | 管理接口 Bearer 令牌，≥16 字符；未设置时管理接口返回 503 |
| `RETENTION_DAYS` | vars | 邮件保留天数，默认 30 |
| `PUBLIC_BASE_URL` | vars | 分享链接前缀，留空用请求 origin |
| `FORWARD_TO` | vars | 可选，收到后整体转发到此地址（须在 Email Routing 验证） |
| `LOCALE` | vars | 分享页与管理页语言：`zh-CN`（默认）或 `en` |

## 本地开发

```bash
pnpm install
cp .dev.vars.example .dev.vars        # 改 ADMIN_TOKEN（≥16 字符）
pnpm db:migrate:local
pnpm dev                              # http://127.0.0.1:8787
pnpm test:email                       # 投递一封样例邮件到 share@example.com
pnpm test:classify                    # 验证码识别与分类用例
```

打开 `http://127.0.0.1:8787/admin`，输入令牌 → 选邮箱、时间窗口 → 生成链接 → 打开 `/s/<key>`。

## 安全设计

- 链接 key 32 位 URL 安全随机串（约 192 bit 熵），可设过期时间，可随时撤销。
- 密码重置、账单、账户安全类邮件默认不进分享页（`src/classify.ts`），避免拿到链接的人借此接管账号。
- 所有响应 `no-store` + `noindex` + `no-referrer`；自家页面 CSP `default-src 'none'`。
- 邮件 HTML 在浏览器端消毒（去 script/form/iframe/on* 属性、非 http(s)/mailto 链接、外链图片）后，
  放进 `sandbox="allow-popups allow-popups-to-escape-sandbox"` 的 iframe，srcdoc 自带
  `default-src 'none'; img-src data:` CSP，远程追踪像素不会加载。
- 附件强制下载；可被浏览器直接执行的类型改成 `application/octet-stream`。
- 管理令牌常量时间比较；令牌只存于浏览器 sessionStorage。

## 已知限制

- 单条邮件（含附件）上限受 Email Workers 限制（约 25 MB）；HTML 正文 >700 KB 时落 R2。
- `cid:` 内联图片不显示（CSP 只放行 data: 图片）。验证码类邮件基本不受影响。
- 公开接口没有限速；如暴露在公网建议在 Cloudflare 加一条 Rate Limiting 规则（`/api/s/*`）。
- 转发链路的 DMARC：Gmail、iCloud 的转发会保留原始 DKIM 签名；Outlook 请用"重定向"而不是"转发"。

## 合规提示

InboxShare 是邮件工具，不绕过任何平台的验证机制。流媒体等服务对账号共享有各自的条款（例如 Netflix 要求验证码仅在同一住所成员间使用），请在条款允许的范围内使用。

## License

MIT
