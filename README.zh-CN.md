# InboxShare

**换设备登录，无干扰，家庭成员自己收验证码。**

InboxShare 是一个开源、自部署的**共享验证码收件箱**。把你现有邮箱（Gmail、Outlook、iCloud、QQ 邮箱、163，任何能转发的邮箱）里的验证码邮件转发到你自己域名下的一个地址，被授权的家人或同事通过一个只读链接自己看最新的登录验证码。

不交邮箱密码。看的人不用注册、不装 App。跑在 Cloudflare 免费额度上，每月 0 元。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/funcin/inboxshare)

**官网：** [inboxshare.app/zh](https://inboxshare.app/zh) · **English:** [README.md](./README.md)

---

## 一、场景

你是那个邮箱挂在所有共享账号上的人，下面这些都会落到你头上：

- **周六晚上十点，爸妈家的新电视。** Netflix 在电视上要一个 4 位验证码，邮件发到了你这里，15 分钟内有效。你翻邮箱、截图、发家庭群，还得祈祷他们来得及输。
- **"是我本人"的确认按钮，人在另一个城市。** Disney+ 和 HBO Max 不发验证码，发一封带确认按钮的邮件。按钮在你的邮箱里，登录的人在三百公里外，你只能凭感觉点。
- **共享的 ChatGPT、Claude 账号。** ChatGPT 和 Claude 不用密码，登录时往注册邮箱发一个 6 位验证码。账号是用你的邮箱注册的，同事每次登录都得来问你要。
- **团队共用的 Canva 或社交媒体账号。** 只能用邮箱验证码登录，三个人用，一个邮箱收，谁拥有邮箱谁就是瓶颈。

请在各平台允许的共享范围内使用：同住的家人，或团队套餐里的席位。

## 二、问题

1. **验证码在错误的收件箱里。** 服务商把码发给账号持有人，而需要它的人在另一台设备上，往往还在另一个地方。
2. **验证码过期很快。** 大多数只有 10 到 15 分钟有效，转发慢一步，对方只能重新申请。
3. **最直接的办法最危险。** 把邮箱密码给家人或同事，等于把你所有账号的密码重置入口一起交出去。

现有的变通办法都卡在其中一条：手动转发太慢，共享邮箱暴露一切，IMAP 轮询类工具既要你的邮箱密码又有延迟。

## 三、解决方案

InboxShare 把你域名下的一个地址变成一个**只读网页**，只显示你主动转发到这里的邮件，并把验证码挑到最上面。

```text
Netflix 发出        你的邮箱            code@你的域名            InboxShare              家人
验证码邮件    →    一条转发规则    →   Cloudflare Email    →   挑出验证码，       →   打开链接，
                                       Routing                  藏起其他                看到验证码
```

### 工作方式

1. **只转发验证码邮件。** 在 Gmail 或 Outlook 加一条规则：来自 Netflix、Disney+、HBO Max、OpenAI、Anthropic 的邮件转到 `code@你的域名`，其余邮件原地不动。
2. **InboxShare 把验证码或按钮挑出来。** 邮件一到，Cloudflare Email Routing 就交给 Worker。4 到 8 位验证码被识别出来并配一个复制按钮。邮件里不是码而是按钮时（Netflix 的「取得存取码」、Claude Console 的「Sign in」魔法链接、Disney+ 的「是我本人」），这个链接同样会被识别出来，显示为「打开验证链接」按钮，旁边带复制。密码重置、账单、账户安全提醒会被分类并默认隐藏。
3. **发一个链接。** 在管理页为这个地址生成只读链接，带滚动时间窗口（最近 30 分钟、1 小时、6 小时、1 天、7 天或保留期内全部），钉在家庭群里。随时撤销或删除。

### 访客看到什么

一个适配手机的收件箱：发件人、主题、相对时间，验证码在列表里是标签、在详情里是大号复制按钮，正文经消毒后在沙箱 iframe 里渲染，附件只能下载。验证码藏在按钮后面的邮件，列表里显示「点击验证」标签，详情里是「打开验证链接」按钮；正文里的链接同样能点开新标签页。手机上最新的验证码或链接会放在顶部的卡片里。页面每 30 秒自动刷新。

### InboxShare 不做什么

- 不发信、不回复、不转发给访客，页面永远只读。
- 不连接你的 Gmail 或 Outlook。没有 OAuth，没有 IMAP，不要邮箱密码，只收你转发规则送来的邮件。
- 不生成 OTP 或 TOTP，只显示你真实收到的邮件里的验证码。
- 不是临时邮箱服务，也不改变任何平台的家庭组或账号共享规则。

### 功能

| 功能 | 说明 |
| --- | --- |
| 只读分享链接 | `/s/<key>` 页面，访客不能发信、回复、删除。key = 邮箱用户名 + 序号字母 + 10 位随机字符，随机尾巴是访问控制。 |
| 验证码识别 | 入库时识别 4 到 8 位验证码，规则保守，年份和订单号不会误判。 |
| 验证链接识别 | 入库时识别「取得存取码」「Sign in」「是我本人」这类按钮，显示为打开 / 复制按钮；退订、帮助、登出链接会被忽略。 |
| 滚动时间窗口 | 每条链接只显示最近的邮件，旧验证码自己滑出视野。 |
| 过期、撤销、删除 | 可设过期时间；撤销保留记录，删除移除记录，两者都立即失效。 |
| 敏感邮件隔离 | 密码重置、账单、账户安全类邮件默认不出现，除非某条链接显式打开。 |
| 中英文 | `LOCALE` 设默认语言，访客和管理员都能在页面上切换。 |
| Serverless | 一个 Cloudflare Worker 加 D1、R2 和每日清理 cron。不用 VPS、SMTP 服务器和 25 端口。 |

## 四、部署计划

全程大约 20 分钟。需要一个 Cloudflare 账号和一个托管在上面的域名；走命令行的话还需要 Node.js 22+ 和 pnpm。

### 第 1 步：部署 Worker（三选一）

**A. Deploy to Cloudflare 按钮**（最省事）

点上面的 [Deploy to Cloudflare](https://deploy.workers.cloudflare.com/?url=https://github.com/funcin/inboxshare) 按钮走完流程，它会创建 Worker、D1 数据库和 R2 存储桶。然后在它为你创建的仓库目录里：

```bash
pnpm install
pnpm wrangler d1 migrations apply DB --remote
pnpm wrangler secret put ADMIN_TOKEN     # 16 位以上的随机字符串
```

**B. Fork + GitHub Actions**

1. Fork 本仓库。
2. 在 **Settings → Secrets and variables → Actions** 里加变量 `DEPLOY_WITH_ACTIONS=true`，以及密钥 `CLOUDFLARE_API_TOKEN`（Workers Scripts、D1、R2、Email Routing 均需 Edit 权限）、`CLOUDFLARE_ACCOUNT_ID`、`ADMIN_TOKEN`。
3. 推送到 `main` 或手动运行工作流。它会安装依赖、跑迁移、部署并设置管理密钥。没设 `DEPLOY_WITH_ACTIONS` 时工作流直接跳过，fork 后不会报错。

**C. Wrangler 命令行**

```bash
git clone https://github.com/funcin/inboxshare.git
cd inboxshare
pnpm install
pnpm wrangler login
pnpm run deploy                      # 先跑 D1 迁移，再部署
pnpm wrangler secret put ADMIN_TOKEN
```

顶层 `wrangler.jsonc` 是通用模板，没有任何资源 id。`env.production` 是作者自己的实例，删掉或换成你的。

### 第 2 步：把一个地址指向 Worker

1. **Cloudflare 后台 → 你的域名 → Email → Email Routing**，启用（MX 和 SPF 记录会自动添加）。
2. **Routing rules → Create address**，比如 `code@你的域名`。Action 选 **Send to a Worker** → 你的 InboxShare Worker。
3. 可选：把 **Catch-all** 也指向同一个 Worker，这样域名下任意地址（`disney@`、`team@`）都自动成为独立的共享收件箱，不用再回后台加。

### 第 3 步：在原邮箱设转发规则

- **Gmail：** 设置 → 转发 → 添加 `code@你的域名`（Gmail 的确认邮件会落到 InboxShare，第 4 步建好链接就能看到确认码）。然后过滤器 → 新建：`from:(netflix.com OR disneyplus.com OR openai.com)` → 动作选 *转发到* 这个地址。
- **Outlook：** 设置 → 邮件 → 规则 → 按发件人或主题设条件 → 动作 *转发到*。
- **iCloud、QQ 邮箱、163 等：** 同样在"规则"或"自动转发"里设置。

规则尽量窄，只让验证码邮件离开你的邮箱。

### 第 4 步：生成分享链接

打开 `https://<你的 Worker 域名>/admin`，输入 `ADMIN_TOKEN`，选接收地址，选时间窗口，按需填过期时间和备注，点**生成链接**。复制 `/s/<key>` 地址发给需要的人。

### 第 5 步：验证

通过转发规则发一封测试邮件，用手机打开分享链接。几秒内应该能看到这封邮件，验证码在最上面。同样方式发一封密码重置或账单邮件，它不应该出现。

### 可选：自定义域名与语言

```jsonc
"routes": [{ "pattern": "inbox.你的域名", "custom_domain": true }],
"vars": {
  "PUBLIC_BASE_URL": "https://inbox.你的域名",
  "LOCALE": "zh-CN"
}
```

分享链接用 `PUBLIC_BASE_URL` 拼接。`LOCALE` 为 `en` 或 `zh-CN`，每个页面也都有语言切换。注意：配置自定义域名路由后，`workers.dev` 域名默认会关闭。

## 配置参考

| 配置 | 位置 | 说明 |
| --- | --- | --- |
| `ADMIN_TOKEN` | secret / `.dev.vars` | 必填，16 位以上。缺失时管理接口返回 503。 |
| `RETENTION_DAYS` | `vars` | 邮件和附件保留天数，默认 `30`。每日 cron 清理 D1 和 R2 里更早的数据。 |
| `PUBLIC_BASE_URL` | `vars` | 生成分享链接用的站点地址，留空则用请求自身的 origin。 |
| `FORWARD_TO` | `vars` | 可选：收到的每封邮件同时转发一份到这个已验证的 Email Routing 目标地址。 |
| `LOCALE` | `vars` | `en`（默认）或 `zh-CN`。 |
| `WAITLIST_FROM` | `vars` | 可选。首页"托管版"入口收集的邮箱存在 D1 的 `waitlist` 表。要每条都收到邮件通知，设置这个发件地址（你域名下的地址）、加一个名为 `EMAIL` 的 `send_email` 绑定，并用 `wrangler secret put WAITLIST_TO` 存收件人（必须是 Email Routing 里已验证的目标地址）。不设则只落库。 |
| `WAITLIST_TO` | secret | 名单通知的收件人，见 `WAITLIST_FROM`。 |
| `ANALYTICS_DOMAIN` | `vars` | 可选。你在 [Plausible](https://plausible.io) 面板里的站点名，设了首页就会加载 Plausible 脚本（无 Cookie）。脚本地址在 `src/analytics.ts` 里改。只有首页打标，分享页和管理页永远不加载第三方资源。不设则没有统计。 |

## 本地开发

```bash
pnpm install
cp .dev.vars.example .dev.vars    # 填一个 16 位以上的 ADMIN_TOKEN
pnpm db:migrate:local
pnpm dev                          # http://127.0.0.1:8787
pnpm test:email                   # 向本地 Worker 投递 scripts/fixtures/sample.eml
pnpm test:classify                # 验证码识别与分类用例
pnpm typecheck
```

打开 `/admin` 给 `share@example.com` 建一条链接，再分别在桌面和手机宽度打开 `/s/<key>`。

## 安全与隐私

**拿到有效分享链接的任何人都能看到该链接允许的邮件，请把链接当密码对待。**

- key 以 10 位随机字母数字结尾（约 60 bit），可读前缀只为好认。备注只在管理页显示，不进 URL。
- 链接可过期、撤销、删除；滚动窗口和 `RETENTION_DAYS` 限定可见范围。
- 密码重置、账单、账户安全邮件默认隐藏，除非管理员为某条链接显式打开。只对完全信任的人打开。
- 邮件 HTML 在浏览器端消毒后放进带独立严格 CSP 的沙箱 iframe 渲染，脚本、表单、远程图片都被去掉。分享页和管理页不加载任何第三方资源；首页只在设置了 `ANALYTICS_DOMAIN` 时带一个无 Cookie 的 Plausible 统计标签。
- 附件一律按下载处理，HTML、SVG、XML、脚本类型强制为 `application/octet-stream`。
- 所有页面带 `no-store`、`noindex`、`no-referrer`，只有首页允许被索引。
- `ADMIN_TOKEN` 存在 Worker secret 里，不进仓库。

公开查看接口没有内置限流，建议给 `/api/s/*` 加一条 Cloudflare 限流规则。

## 已知限制

- Cloudflare Email Workers 接收的邮件含附件约 25 MB 以内。
- 不显示内嵌 `cid:` 图片；超大 HTML 正文存 R2。
- 各邮件服务商的转发和 DMARC 行为不同，依赖的每个发件方都要实测。
- Cloudflare 的用量限制和费用取决于你的套餐。

## 常见问题

**这是临时邮箱吗？** 不是。它用的是你自己域名下的地址，只显示从你现有邮箱转发来的邮件。

**它会读我的 Gmail 吗？** 不会。没有 OAuth，没有 IMAP，唯一的连接是你在邮箱服务商那里设的转发规则。

**它会生成验证码吗？** 不会。它只识别你真实收到的邮件里的验证码。

**访客能回复或管理我的邮箱吗？** 不能。页面只读，也不接触原邮箱。但验证码邮件本身能授权登录，所以链接只给信任的人。

**这会改变 Netflix 的家庭组规则吗？** 不会。请和同住的家人一起、在各平台条款允许的范围内使用。

## 托管版

不想自己部署？在 [inboxshare.app/zh](https://inboxshare.app/zh) 底部留下邮箱，我们会在 24 小时内回复你。

## 许可证

MIT
