# 当前任务

## 目标
用 Cloudflare Email Routing + Worker 给自有域名邮箱搭一个只读共享收件箱（复刻 dingyue.xzys.me 的 /s/<key> 分享层）。

## 计划
- [x] 项目骨架：wrangler.jsonc（D1/R2/cron/vars）、tsconfig、迁移 SQL
- [x] Email Worker 收信：postal-mime 解析 → 附件进 R2 → 正文/元数据进 D1，可选 FORWARD_TO
- [x] 管理接口 + /admin 页：Bearer 令牌、建链（窗口/过期/备注）、撤销、邮箱列表
- [x] 公开接口 + /s/<key> 页：窗口过滤、只读、沙盒渲染、附件下载
- [x] 定时清理：按 RETENTION_DAYS 删 D1 + R2
- [x] 本地验证：真实投递 sample.eml、API 全链路、浏览器渲染
- [x] 线上资源：D1、R2、远程迁移、ADMIN_TOKEN secret（2026-10-27 完成）
- [x] 推 GitHub（funcin/emailshare）→ Workers Builds 接仓库 → 首次构建失败（未锁 pnpm/Node 版本）→ 锁定后成功，线上 https://emailshare.funcin.workers.dev 管理接口验证通过（2026-10-27）
- [x] Email Routing 规则 <共享地址> → Worker `emailshare` 已启用；测试邮件（个人邮箱 → 共享地址）落库；管理接口建链接（24h 窗口、7 天有效）；浏览器真实渲染 /s/<key> 列表 + 详情通过（2026-10-27）

## 进度
2026-10-27 线上全链路跑通：Email Routing → Worker → D1 → /s/<key>。首条链接 key 存本地 dev/first-link.json（不进 git）。

2026-10-27 绑自定义域名 mail.funcin.de（routes custom_domain + PUBLIC_BASE_URL），分享链接改用该域名。注意：配置 routes 后 wrangler 默认关闭 workers.dev 入口，emailshare.funcin.workers.dev 已返回 404，只保留 mail.funcin.de。

2026-10-28 移动端适配：分享页头部两行、列表短时间戳、详情全屏 + 系统返回手势回列表、iframe 按视口高度；管理页输入框 16px、窄屏表格改卡片。本地手机/桌面视口真实渲染验证通过。

2026-10-28 分享页按 Claude Design 设计稿重做：发件人头像、相对时间、验证码标签与复制卡片、锁形信任提示；服务端新增 `code` 列（迁移 0002）与识别器；`LOCALE` 中英切换。本地中英、桌面手机真实渲染通过。

2026-10-28 管理页也跟随 LOCALE 中英双语（字典在 src/i18n.ts 的 ADMIN_DICTS）。

2026-10-28 首页上线：`/` 按 LOCALE、`/en` `/zh` 固定语言，hreflang + canonical + sitemap，robots 只放行首页；文案按 SEO 结论（主词 share email verification codes）。加了 MIT LICENSE。

2026-10-28 首页 SEO 二次迭代（Serverless 卖点）：标题/描述改为"serverless shared OTP inbox + Cloudflare Email Routing"；新增"为什么 Serverless"区块（0 元无维护 / Email Worker 即时送达不轮询 IMAP / 不要邮箱密码不要 OAuth）、转发链路条、第三个场景"Cloudflare Email Routing 网页收件箱"、3 条 FAQ（要不要邮件服务器、Gmail 怎么只转验证码、能否当 Email Routing 的 web UI）；`<head>` 注入 SoftwareApplication + FAQPage 的 JSON-LD（在 `src/routes/landing.ts` 生成，`@@JSONLD@@` 占位不走 HTML 转义）。只写项目真实支持的能力：不宣称通用 HTTP webhook / SendGrid / Vercel。中英、桌面（Chrome 扩展）、手机 390px（Playwright 驱动本机 Chrome，scrollWidth=390 无横向溢出）真实渲染通过。
  站长待办：GitHub 仓库 About 改成 serverless 版描述、加 Topics（cloudflare-email-routing、cloudflare-workers、serverless、otp-inbox、shared-inbox、self-hosted 等）、README 首屏同步 Serverless 措辞；外链：awesome-selfhosted / awesome-cloudflare PR、Dev.to 教程。

未做（可选）：`/api/s/*` 的 Rate Limiting 规则；`FORWARD_TO` 目前为空，共享地址的邮件只进共享收件箱不转发。

## 审查
- 页面只读，HTML 在浏览器端消毒 + sandbox iframe + srcdoc CSP；附件强制下载。
- 管理令牌缺失时管理接口整体 503，不会裸奔。

## 决策记录（2026-10-27）
对比四条路线后站长选 A（自写 Worker）：
- A 自写 Worker：已完成，零月费零运维，数据全在自己 Cloudflare 账号。
- B SubNest + 本 Worker 当邮箱后端：多 1~2 天接口开发 + Workers 付费版（Queues），只在需要合租管理时值得。
- C SubNest + 自建 LanQin 邮局：VPS + 25 端口 + 邮局运维，且公开 LanQin 缺 SubNest 私有接口，不选。
- D 向作者要 mail.newszxcn.com 令牌：验证码邮件经第三方，不选。

## 决策记录（2026-10-28）：品牌与域名
- 品牌名 **InboxShare**，域名 **inboxshare.app**（.com 在 Atom 出售、.io 被一个无流量静态页占用；两者均无注册商标，判断可正面竞争）。
- 否决：OTPLink（OTP 易被理解为短信验证码）、InboxLink（.com/.app 已被占且 .app 一个月前刚被注册）、emailcodeshare（描述性太强、无品牌感，仅作备选）。
- 品牌词只出现在显示层（标题、README、Logo）。硬标识（GitHub 组织、仓库、域名、Worker 名）一旦定下不再随品牌变动。
- 待办（站长）：注册 inboxshare.app → 把域名接入 Cloudflare → 建 GitHub 组织 `inboxshare`。
- 2026-10-28 开源前整改完成：敏感邮件分类与隔离（迁移 0003，链接 show_sensitive）、Deploy 按钮 + fork 即部署 Actions + `pnpm run deploy`、wrangler.jsonc 顶层通用化（作者实例移到 env.production）、README/CLAUDE.md 换品牌 InboxShare。代码推到 `funcin/inboxshare`（站长已建）。
- 2026-10-28 站长把 Worker 从 `emailshare` 改名为 `inboxshare`（密钥、D1、R2、mail.funcin.de 均保留），wrangler.jsonc 的 name 同步改为 `inboxshare`。
- 2026-10-28 Workers Builds 已从 `funcin/inboxshare` 成功部署（绑定、密钥、域名、数据均保留）；旧仓库 `funcin/emailshare` 已归档，本地 old 远端已删。域名 inboxshare.app 已注册并接入 Cloudflare（2026-10-28），已加为正式入口，PUBLIC_BASE_URL 切换；mail.funcin.de 保留给旧链接。
