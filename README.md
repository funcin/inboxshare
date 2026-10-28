# InboxShare

**New device, new code. Your family gets it without asking you.**

InboxShare is an open-source, self-hosted **shared verification inbox**. Forward the verification emails from your existing mailbox (Gmail, Outlook, iCloud Mail, anything that can forward) to an address on your own domain, and the people you authorize read the latest login code themselves through one read-only link.

No shared email password. No account or app for viewers. $0/month on Cloudflare's free tier.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/funcin/inboxshare)

**Website:** [inboxshare.app](https://inboxshare.app) · **中文文档:** [README.zh-CN.md](./README.zh-CN.md)

---

## 1. Scenario

You are the person whose email address is on the shared accounts. Every one of these lands on you:

- **Saturday night, your parents' new TV.** Netflix asks for a 4-digit code on the TV and emails it to you. It expires in 15 minutes. You dig through your inbox, screenshot it, post it in the family chat, and hope they got it in time.
- **"Yes, this was me", from another city.** Disney+ and HBO Max send a confirmation button instead of a code. The button is in your mailbox; the person signing in is 300 km away. You end up clicking it blind.
- **The shared ChatGPT or Claude account.** ChatGPT and Claude sign you in with a 6-digit code sent to the registered mailbox instead of a password. The account is in your name, so every teammate's login lands on you.
- **The team's Canva or social-media account.** Email-code login only. Three people, one mailbox, and whoever owns it is the bottleneck.

Use InboxShare within each service's sharing rules: the people in your household, or the seats on your team plan.

## 2. The problem

1. **The code is in the wrong inbox.** The service emails the account holder, but the person who needs the code is on another device, often in another place.
2. **Codes expire fast.** Most are valid for 10 to 15 minutes. Forward it late and the other person has to request a new one.
3. **The obvious fix is dangerous.** Giving family or teammates your mailbox password hands them the password-reset links for every account you own.

Existing workarounds all fail on one of these: manual forwarding is slow, shared mailboxes expose everything, and IMAP-polling tools need your mailbox password and still lag.

## 3. The solution

InboxShare turns one address on your domain into a **read-only web page** that shows only the emails you choose to forward there, with the verification code pulled to the top.

```text
Netflix sends            Your mailbox            code@yourdomain          InboxShare                    Your family
verification email  →   one forwarding rule  →  Cloudflare Email     →  finds the code,          →   opens the link,
                                                 Routing                  hides the rest                reads the code
```

### How it works

1. **Forward only the verification emails.** In Gmail or Outlook, add one rule: mail from Netflix, Disney+, HBO Max, OpenAI or Anthropic goes to `code@yourdomain.com`. Everything else stays where it is.
2. **InboxShare picks out the code.** Cloudflare Email Routing hands each message to the Worker the moment it arrives. The 4 to 8 digit code is detected and shown with a copy button; confirmation buttons in HTML mail still work. Password resets, receipts and account-security alerts are classified and hidden by default.
3. **Send one link.** In the admin page, create a read-only link for that address with a rolling time window (last 30 minutes, 1 hour, 6 hours, 1 day, 7 days, or all retained mail). Pin it in the family chat. Revoke or delete it whenever you like.

### What viewers see

A mobile-friendly inbox for that one address: sender, subject, relative time, the code as a chip in the list and as a large copy button in the message, the sanitized HTML body in a sandboxed frame, and attachments as downloads. On phones the newest code sits in a card at the top. The page refreshes every 30 seconds.

### What InboxShare does not do

- It does not send, reply or forward mail to viewers. The page is read-only.
- It does not connect to your Gmail or Outlook. No OAuth, no IMAP, no mailbox password. It only receives what your forwarding rule sends.
- It does not generate OTP or TOTP codes. It displays codes found in emails you actually received.
- It is not a disposable-email service, and it does not change any service's household or account-sharing rules.

### Features

| Feature | Description |
| --- | --- |
| Read-only share links | `/s/<key>` pages; viewers cannot send, reply or delete. Keys are `<mailbox user><letter><10 random characters>`; the random tail is the access control. |
| Code detection | 4 to 8 digit verification codes detected on arrival; conservative rules avoid years and order numbers. |
| Rolling time windows | Each link shows only recent mail; old codes scroll out on their own. |
| Expiry, revoke, delete | Optional expiry date, instant revoke (record kept) or delete (record removed). |
| Sensitive-mail isolation | Password reset, billing and account-security emails never appear unless a link explicitly opts in. |
| English and Chinese | `LOCALE` sets the default; viewers and admins can switch in the UI. |
| Serverless | One Cloudflare Worker with D1, R2 and a daily cleanup cron. No VPS, no SMTP server, no port 25. |

## 4. Deployment plan

Total time: about 20 minutes. You need a Cloudflare account with a domain on it, and for the CLI route Node.js 22+ and pnpm.

### Step 1: Deploy the Worker (pick one)

**A. Deploy to Cloudflare button** (easiest)

Click the [Deploy to Cloudflare](https://deploy.workers.cloudflare.com/?url=https://github.com/funcin/inboxshare) button and follow the flow. It creates the Worker, the D1 database and the R2 bucket. Then, from the repository it created for you:

```bash
pnpm install
pnpm wrangler d1 migrations apply DB --remote
pnpm wrangler secret put ADMIN_TOKEN     # a random string, 16+ characters
```

**B. Fork + GitHub Actions**

1. Fork this repository.
2. In **Settings → Secrets and variables → Actions** add the variable `DEPLOY_WITH_ACTIONS=true` and the secrets `CLOUDFLARE_API_TOKEN` (Workers Scripts, D1, R2 and Email Routing: Edit), `CLOUDFLARE_ACCOUNT_ID` and `ADMIN_TOKEN`.
3. Push to `main` or run the workflow manually. It installs, migrates, deploys and sets the admin secret. Without `DEPLOY_WITH_ACTIONS` the workflow is skipped, so forks do not fail by default.

**C. Wrangler CLI**

```bash
git clone https://github.com/funcin/inboxshare.git
cd inboxshare
pnpm install
pnpm wrangler login
pnpm run deploy                      # applies D1 migrations, then deploys
pnpm wrangler secret put ADMIN_TOKEN
```

The top-level `wrangler.jsonc` is a generic template with no resource ids. `env.production` is the author's own instance; delete it or replace it with yours.

### Step 2: Point an address at the Worker

1. **Cloudflare Dashboard → your domain → Email → Email Routing**, enable it (MX and SPF records are added for you).
2. **Routing rules → Create address**, for example `code@yourdomain.com`. Action: **Send to a Worker** → your InboxShare Worker.
3. Optional: set the **Catch-all** to the same Worker so any address on the domain (`disney@`, `team@`) becomes its own shared inbox without further setup.

### Step 3: Forward the right emails from your mailbox

- **Gmail:** Settings → Forwarding → add `code@yourdomain.com` (the confirmation email lands in InboxShare; create a link in step 4 to read its code). Then Filters → create: `from:(netflix.com OR disneyplus.com OR openai.com)` → *Forward it to* that address.
- **Outlook:** Settings → Mail → Rules → condition on sender or subject → action *Forward to*.
- **iCloud, QQ Mail, 163 and others:** the same rule-based forwarding under Rules or Auto-forward.

Keep the rule narrow. Only the verification emails need to leave your mailbox.

### Step 4: Create a share link

Open `https://<your-worker-host>/admin`, enter `ADMIN_TOKEN`, pick the receiving address, choose a time window and an optional expiry and label, click **Create link**. Copy the `/s/<key>` URL and send it to the people who need it.

### Step 5: Verify

Send a test email through the forwarding rule and open the share link on a phone. You should see the message within seconds with the code at the top. Password-reset or billing emails sent the same way should not appear.

### Optional: custom domain and language

```jsonc
"routes": [{ "pattern": "inbox.yourdomain.com", "custom_domain": true }],
"vars": {
  "PUBLIC_BASE_URL": "https://inbox.yourdomain.com",
  "LOCALE": "en"
}
```

Share links use `PUBLIC_BASE_URL`. `LOCALE` is `en` or `zh-CN`; every page also has a language switch. Note that adding a custom domain route disables the `workers.dev` hostname by default.

## Configuration reference

| Setting | Location | Description |
| --- | --- | --- |
| `ADMIN_TOKEN` | secret / `.dev.vars` | Required, 16+ characters. Admin endpoints return 503 without it. |
| `RETENTION_DAYS` | `vars` | Days to keep mail and attachments; default `30`. A daily cron deletes older data from D1 and R2. |
| `PUBLIC_BASE_URL` | `vars` | Base URL for generated share links; empty = request origin. |
| `FORWARD_TO` | `vars` | Optional: also forward every received email to this verified Email Routing destination. |
| `LOCALE` | `vars` | `en` (default) or `zh-CN`. |
| `WAITLIST_FROM` | `vars` | Optional. The landing page's "hosted version" signup is stored in the D1 `waitlist` table. To also get an email per signup, set this sender on your domain, add a `send_email` binding named `EMAIL`, and store the recipient with `wrangler secret put WAITLIST_TO` (a verified Email Routing destination). Unset = store only. |
| `WAITLIST_TO` | secret | Recipient for waitlist notifications; see `WAITLIST_FROM`. |
| `ANALYTICS_DOMAIN` | `vars` | Optional. Your site name in a [Plausible](https://plausible.io) dashboard; the landing page then loads the Plausible script (cookie-free). The script host is set in `src/analytics.ts`. Only the landing page is tagged; share and admin pages never load third-party resources. Unset = no analytics. |

## Local development

```bash
pnpm install
cp .dev.vars.example .dev.vars    # set a 16+ character ADMIN_TOKEN
pnpm db:migrate:local
pnpm dev                          # http://127.0.0.1:8787
pnpm test:email                   # delivers scripts/fixtures/sample.eml to the local Worker
pnpm test:classify                # code detection and classification cases
pnpm typecheck
```

Open `/admin`, create a link for `share@example.com`, then open `/s/<key>` on desktop and phone widths.

## Security and privacy

**Anyone with a valid share URL can read the messages that link permits. Treat the URL as a secret.**

- Share keys end in 10 random alphanumeric characters (about 60 bits). The readable prefix is for recognition only. Labels are admin-only and never part of the URL.
- Links can expire, be revoked or be deleted; rolling windows and `RETENTION_DAYS` bound what is visible.
- Password resets, billing and account-security emails are hidden unless an admin enables them for a specific link. Only do that for people you fully trust.
- Email HTML is sanitized in the browser and rendered in a sandboxed iframe with its own strict CSP; scripts, forms and remote images are stripped. Share and admin pages load no third-party resources; the landing page carries a cookie-free Plausible tag only if `ANALYTICS_DOMAIN` is set.
- Attachments are always served as downloads; HTML, SVG, XML and script types are forced to `application/octet-stream`.
- Every page is served with `no-store`, `noindex` and `no-referrer`; only the landing page is indexable.
- `ADMIN_TOKEN` lives in a Worker secret, never in the repository.

There is no built-in rate limiting on the public viewer API. Consider a Cloudflare rate-limiting rule for `/api/s/*`.

## Limitations

- Cloudflare Email Workers accept messages up to roughly 25 MB including attachments.
- Inline `cid:` images are not displayed; large HTML bodies are stored in R2.
- Forwarding and DMARC behaviour differs between providers; test each sender you rely on.
- Cloudflare usage limits and charges depend on your plan.

## FAQ

**Is this a temporary-email service?** No. It uses an address on a domain you control and only shows mail forwarded from your existing mailbox.

**Does it read my Gmail?** No. There is no OAuth and no IMAP. Your provider's forwarding rule is the only connection.

**Does it generate codes?** No. It detects codes inside emails you actually received.

**Can viewers reply or manage my mailbox?** No. The page is read-only and has no access to the original mailbox. A verification email can still authorize a login, so share links only with people you trust.

**Does it change Netflix's household rules?** No. Use it with the people in your household, within each service's terms.

## Hosted version

Prefer not to run it yourself? Leave your email at the bottom of [inboxshare.app](https://inboxshare.app) and we will reply within 24 hours.

## License

MIT
