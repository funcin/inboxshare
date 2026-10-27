# emailshare（shared-inbox）

自有域名邮箱的只读共享收件箱，纯 Cloudflare 栈：**Email Routing → Email Worker → D1 + R2 → `/s/<key>` 只读页面**。

```
sender ──SMTP──▶ Cloudflare Email Routing ──▶ Worker.email()
                                                │  postal-mime 解析
                                                ├─▶ D1  messages / share_links
                                                └─▶ R2  附件、超大正文
访客 ──GET /s/<key>──▶ Worker.fetch() ──▶ 校验链接 → 只返回窗口内的邮件（只读）
管理员 ──Bearer ADMIN_TOKEN──▶ /admin 与 /api/admin/*  建链 / 撤销 / 看邮箱
cron 每日 ──▶ 删除超过 RETENTION_DAYS 的邮件与附件
```

## 本地开发

```bash
pnpm install
cp .dev.vars.example .dev.vars        # 改 ADMIN_TOKEN（≥16 字符）
pnpm db:migrate:local
pnpm dev                              # http://127.0.0.1:8787
pnpm test:email                       # 投递一封样例邮件到 share@example.com
```

打开 `http://127.0.0.1:8787/admin`，输入令牌 → 选邮箱、时间窗口 → 生成链接 → 打开 `/s/<key>`。

## 部署（首次）

> 2026-10-27 已完成：D1 `shared-inbox`（id 见 wrangler.jsonc）、R2 `shared-inbox-attachments`、远程迁移、
> `ADMIN_TOKEN` secret。线上 Worker 名为 `emailshare`（与 GitHub 仓库 funcin/emailshare 同名，由 Workers Builds 创建）。令牌明文在本地 `dev/admin-token.txt`（不进 git）。

1. 建资源并回填配置（已做）：
   ```bash
   pnpm wrangler d1 create shared-inbox          # 把输出的 database_id 填进 wrangler.jsonc
   pnpm wrangler r2 bucket create shared-inbox-attachments
   pnpm db:migrate:remote
   pnpm wrangler secret put ADMIN_TOKEN --name emailshare     # 一串长随机字符串
   ```
2. 代码推到 GitHub（私有仓库即可）。
3. 接 Workers Builds（已做）：Dashboard → Workers & Pages → Create → Import a repository → 选 `funcin/emailshare`，
   分支 `main`，Build command 留空，Deploy command `npx wrangler deploy`。Worker 名随仓库名为 `emailshare`。
   之后 `git push` 即部署，不要手动 deploy。
4. 自定义域名（已做：`mail.funcin.de`）：`wrangler.jsonc` 的 `routes` 用 `custom_domain: true`，部署时 Cloudflare 自动建 DNS 和证书；`PUBLIC_BASE_URL` 设成同一域名，管理页生成的链接才会用它。
5. Email Routing：Dashboard → 你的域名 → Email → Email Routing
   - 启用 Email Routing（按提示添加 MX / SPF 记录；域名在 Cloudflare 托管则一键添加）
   - Routing rules → Create address → 填要共享的地址（如 `share@yourdomain.com`）→ Action 选 **Send to a Worker** → 选 `emailshare`
   - 想同时收到真实邮件：在 Destination addresses 验证一个目标邮箱，再把它填进 `vars.FORWARD_TO`
6. 发一封测试邮件到该地址 → `/admin` 里应出现这个邮箱 → 建链接 → 分享。

## 配置

| 项 | 位置 | 说明 |
|---|---|---|
| `ADMIN_TOKEN` | secret | 管理接口 Bearer 令牌，≥16 字符；未设置时管理接口返回 503 |
| `RETENTION_DAYS` | vars | 邮件保留天数，默认 30 |
| `PUBLIC_BASE_URL` | vars | 分享链接前缀，留空用请求 origin |
| `FORWARD_TO` | vars | 可选，收到后整体转发到此地址（须在 Email Routing 验证） |
| `LOCALE` | vars | 分享页与管理页语言：`zh-CN`（默认）或 `en`，部署时定 |

时间窗口可选：`0`（不限，仍受保留期约束）、`30`、`60`、`360`、`1440`、`10080` 分钟，相对“现在”滚动计算。

## 安全设计

- 链接 key 32 位 URL 安全随机串（约 192 bit 熵），可设过期时间，可随时撤销。
- 所有响应 `no-store` + `noindex` + `no-referrer`；自家页面 CSP `default-src 'none'`。
- 邮件 HTML 在浏览器端消毒（去 script/form/iframe/on* 属性、非 http(s)/mailto 链接、外链图片）后，
  放进 `sandbox="allow-popups allow-popups-to-escape-sandbox"` 的 iframe，srcdoc 自带
  `default-src 'none'; img-src data:` CSP，远程追踪像素不会加载。
- 附件强制下载；可被浏览器直接执行的类型改成 `application/octet-stream`。
- 管理令牌常量时间比较；令牌只存于浏览器 sessionStorage。

## 验证码识别

入库时从主题和纯文本正文里识别验证码（`src/code.ts`），存到 `messages.code`。规则保守：邮件里必须出现“验证码 / code / OTP”一类词，才把 4～8 位数字当验证码；年份、订单号不会误判。分享页把识别到的验证码做成列表标签和详情顶部的大号复制卡片。

## 已知限制

- 单条邮件（含附件）上限受 Email Workers 限制（约 25 MB）；HTML 正文 >700 KB 时落 R2。
- `cid:` 内联图片不显示（CSP 只放行 data: 图片）。验证码类邮件基本不受影响。
- 公开接口没有限速；如暴露在公网建议在 Cloudflare 加一条 Rate Limiting 规则（`/api/s/*`）。
