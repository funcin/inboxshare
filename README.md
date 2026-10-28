# InboxShare

**Share verification emails and login codes through one read-only link.**

InboxShare is an open-source, self-hosted **shared verification inbox**. Forward selected emails from Gmail, Outlook, iCloud Mail, or another existing mailbox to an address on your own domain. Authorized family members and teammates can then open a permanent web link to read messages and copy email verification codes without asking an administrator to forward each message.

**No shared email password. No viewer registration. No app to install.**

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/funcin/inboxshare)

[中文简介](#中文简介)

## The problem

A family member or teammate needs an email login code. It lands in an administrator's inbox, so everyone has to wait while that person finds and forwards it. InboxShare makes access self-service.

1. Set up a filter in your existing mailbox to forward **only selected verification emails** to `share@yourdomain.com`.
2. Cloudflare Email Routing delivers those messages to InboxShare.
3. Create a revocable, read-only link in the admin dashboard.
4. Share the link with authorized viewers. They can view recent emails and copy codes themselves.

Typical use cases include household subscription management where the provider's terms allow sharing, team email-based login verification, and read-only access to operational notifications.

> InboxShare does not create disposable mailboxes, generate TOTP codes, bypass verification, or circumvent account-sharing restrictions. It displays emails received through forwarding.

## Streaming verification email use cases

Account owners sometimes receive sign-in codes while authorized family members are using a streaming service. Instead of manually copying and sending each email, the owner can selectively forward verification messages to InboxShare. Authorized viewers can open the shared, read-only URL to check the latest mail.

### Netflix verification codes

If Netflix emails a verification code to the account owner's mailbox, configure a sender-specific forwarding rule to deliver that email to your InboxShare receiving address. Permitted household members can view the message and copy the code from the shared link without waiting for the administrator.

This does not bypass Netflix Household rules, device verification, or other account restrictions.

### Disney+ verification codes

For permitted Disney+ household use, forward relevant sign-in or verification emails to InboxShare. Authorized family members can open the read-only inbox link to find the latest verification message or confirmation link.

InboxShare does not change Disney+'s household or account-sharing requirements.

### HBO Max / Max verification emails

When HBO Max or Max sends an email verification or sign-in message to the account owner, selected messages can be forwarded to the same shared inbox. Authorized members can check the received email through the fixed link.

Email-based authentication flows vary by service, account, and region; InboxShare only displays messages actually received. It does not generate codes or override any service's terms.

### Teams and other services

Teams that are authorized to share an account can use the same workflow for email-based sign-in codes and confirmation messages. Create narrowly scoped forwarding filters to prevent unrelated personal or security-sensitive email from reaching the shared viewer.

**Protect shared links:** A verification code can authorize account access. Only distribute links to trusted, authorized members; keep sensitive-message filtering enabled and revoke links when access is no longer needed.

## Features

| Feature | Description |
| --- | --- |
| Read-only shared inbox | Fixed `/s/<key>` link. Viewers can read, but cannot send, reply to, or delete email. |
| Email OTP detection | Detects likely 4–8 digit email verification codes and offers a prominent copyable code. |
| Time-window controls | Show messages from the last 30 minutes, 1 hour, 6 hours, 1 day, 7 days, or all retained messages. |
| Expiry and revocation | Set link expiration and revoke shared access. |
| Sensitive email filtering | Password resets, billing, and account-security messages are hidden from viewers by default. |
| Mobile-friendly UI | Responsive message list and details, refreshed every 30 seconds. |
| English and Chinese | English by default, with a language switch on admin and shared inbox pages; deployment setting `LOCALE` can be `en` or `zh-CN`. |
| Cloudflare-based hosting | Uses Email Routing, Workers, D1, R2, and scheduled cleanup. |

## Architecture

```text
Existing Gmail / Outlook / other mailbox
          │ selective auto-forwarding
          ▼
  share@yourdomain.com
          │
          ▼
 Cloudflare Email Routing
          │
          ▼
 InboxShare Email Worker
    ├── Parse + classify mail and detect codes
    ├── D1: messages + share links
    ├── R2: attachments + large bodies
    ├── /admin: create/revoke links (ADMIN_TOKEN)
    └── /s/<key>: read-only viewer
          │
          ▼
 Authorized household or team members
```

**Important distinction:** The forwarding destination (`share@yourdomain.com`) receives email. The share URL (`https://your-host/s/<key>`) is a web page for viewing authorized messages. They are not interchangeable.

## Deployment

### Prerequisites

- Cloudflare account and a domain managed by Cloudflare
- Node.js 22 or later and pnpm for CLI deployment
- A long, randomly generated `ADMIN_TOKEN` (at least 16 characters)

### Option 1: Deploy to Cloudflare

Use the [Deploy to Cloudflare button](https://deploy.workers.cloudflare.com/?url=https://github.com/funcin/inboxshare) and follow the setup flow.

From your deployed copy of the repository, apply migrations and set the secret:

```bash
pnpm install
pnpm wrangler d1 migrations apply DB --remote
pnpm wrangler secret put ADMIN_TOKEN
```

Continue with [Email Routing](#configure-email-routing).

### Option 2: GitHub Actions

1. Fork the repository.
2. In **Settings → Secrets and variables → Actions**, add:
   - Variable `DEPLOY_WITH_ACTIONS=true`
   - Secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `ADMIN_TOKEN`
3. Give the API token the required Cloudflare permissions for Workers, D1, R2, and Email Routing.
4. Push to `main` or manually run the workflow.

The workflow installs dependencies, applies migrations, deploys, and configures the admin secret. It runs only when `DEPLOY_WITH_ACTIONS` is enabled.

### Option 3: Wrangler CLI

```bash
git clone https://github.com/funcin/inboxshare.git
cd inboxshare
pnpm install
pnpm wrangler login
pnpm run deploy
pnpm wrangler secret put ADMIN_TOKEN
```

The top-level `wrangler.jsonc` is a reusable template. The included `env.production` contains the author's deployment-specific domains and resource identifiers. Replace or remove that environment before using a production environment of your own.

### Configure Email Routing

All deployment options require this step.

1. Open **Cloudflare Dashboard → your domain → Email → Email Routing** and enable it. Complete the MX/SPF DNS setup.
2. Under **Routing rules**, create a receiving address, for example `share@yourdomain.com`.
3. Choose **Send to a Worker** and select the InboxShare Worker.
4. Configure your original mailbox to forward **only the relevant senders or message types** to that address.
5. Send a test email.
6. Visit `https://<your-worker-host>/admin`, enter `ADMIN_TOKEN`, select the receiving address, and create a share link.
7. Open the `/s/<key>` link to verify which messages are visible.

You can optionally forward an additional copy to a verified destination using `FORWARD_TO`.

### Language selection

The interface defaults to **English**. On the admin and shared inbox pages, use the **English / 中文** links to switch the UI language. The choice is kept in the page URL using `?lang=en` or `?lang=zh-CN`; it does not change what email is accessible or the original share key. The homepage also provides English (`/en`) and Chinese (`/zh`) versions.

You can configure the deployment default using `LOCALE`.

### Custom domain and language

Configure your own route and public URL in `wrangler.jsonc`:

```jsonc
"routes": [{ "pattern": "inbox.yourdomain.com", "custom_domain": true }],
"vars": {
  "PUBLIC_BASE_URL": "https://inbox.yourdomain.com",
  "LOCALE": "en"
}
```

Keep the required resource bindings and other variables from the existing config. A custom domain route can change access to the `workers.dev` endpoint.

## Configuration reference

| Setting | Location | Description |
| --- | --- | --- |
| `ADMIN_TOKEN` | Wrangler secret / `.dev.vars` | Required admin token, minimum 16 characters. Admin endpoints return 503 when missing. |
| `RETENTION_DAYS` | `vars` | Days to retain email and attachments; default `30`. |
| `PUBLIC_BASE_URL` | `vars` | Base URL in share links; defaults to the current request origin if empty. |
| `FORWARD_TO` | `vars` | Optional additional destination, verified in Cloudflare Email Routing. |
| `LOCALE` | `vars` | `en` (default) or `zh-CN`; visitors can switch languages in the UI. |

A daily scheduled Worker task deletes messages and attachments beyond the retention period.

## Local development

```bash
pnpm install
cp .dev.vars.example .dev.vars
# Set a unique ADMIN_TOKEN in .dev.vars (16+ characters)
pnpm db:migrate:local
pnpm dev
```

Open `http://127.0.0.1:8787/admin`. To send a sample message and validate the classification rules:

```bash
pnpm test:email
pnpm test:classify
pnpm typecheck
```

Create a share link in the admin dashboard and open `/s/<key>` to inspect the read-only view.

## Security and privacy

**Anyone with a valid share URL can access the messages permitted by that link. Treat it as a secret.**

- Share keys are `<mailbox user><label or letter><10 random characters>`, for example `hidisneyK7qM2xP9aB`: the prefix is for recognition, the random tail is the access control. Links can expire or be revoked.
- Rolling windows and `RETENTION_DAYS` constrain message visibility.
- Password resets, billing, and account-security changes are excluded by default. Administrators can explicitly allow them, so only share links with people you trust.
- Mail HTML is sanitized in the browser and rendered in a sandboxed iframe with restrictive CSP; remote images are blocked.
- Attachments download rather than execute inline; active-content file formats use `application/octet-stream`.
- Responses use `no-store`, `noindex`, and `no-referrer` policies.
- Admin access uses `ADMIN_TOKEN`; it is not stored in the repository.

**Deployment warning:** Public viewer endpoints have no built-in rate limiting. Consider a Cloudflare rate-limiting rule for `/api/s/*`. Only forward emails required for your use case. Even a read-only message can contain an actionable sign-in or account-management link.

## Limitations

- Cloudflare Email Workers impose size limits on incoming messages, approximately 25 MB including attachments.
- Large HTML bodies use R2; inline `cid:` images are not displayed.
- Forwarding and DMARC behavior differs across mail providers; test delivery from each sender you need.
- Cloudflare plan usage and charges depend on your account and applicable limits.
- InboxShare does not override streaming platform household policies or other account-sharing terms.

## FAQ

**Is this a temporary email service?** No. It uses an email address on a domain you control and can receive messages forwarded from your existing mailbox.

**Does it connect directly to my Gmail account?** No Gmail OAuth is required for the forwarding workflow. You set forwarding rules at your email provider.

**Does it generate OTPs or TOTP codes?** No. It detects likely codes inside received emails.

**Can viewers reply or manage my mailbox?** No. The shared page is read-only and does not grant access to the original mailbox. However, viewing verification emails can expose sensitive credentials, so configure filters carefully.

## 中文简介

**InboxShare：把指定验证邮件转发到共享收件箱，通过固定的只读链接让授权成员自助查看验证码。**

例如，家庭或团队共同管理订阅服务时，管理员无需反复打开邮箱并人工分发登录验证码。用户只需在原邮箱设置过滤与转发规则，让相关邮件到达自己域名下的接收地址。随后在 InboxShare 管理页面创建分享链接，成员即可打开网页查看最近的邮件。

- 不共享原始邮箱密码，访客无需注册或安装 App。
- 自动识别邮件中的验证码，支持复制。
- 可配置链接有效期、撤销链接及邮件可见时间窗口。
- 密码重置、账单和账号安全邮件默认不对访客展示。
- 使用 Cloudflare Workers、Email Routing、D1 和 R2 自行部署，默认英文，管理页面和共享页面可切换中文。

典型场景包括 Netflix、Disney+、HBO Max 等服务的验证邮件共享，仅限符合平台规则的授权用户。\n\n本工具不绕过平台验证机制。账号使用仍需遵守服务提供商的相关条款。部署步骤、配置和安全说明见上面的英文文档。

## License

MIT
