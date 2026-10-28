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

2026-10-28 仓库 funcin/inboxshare 设为公开（公开前扫描：历史无令牌/分享 key/账号 id，todo 中个人邮箱已替换）；GitHub 描述、主页 inboxshare.app、12 个 Topics 已设。本地目录改名为 /Volumes/Outmac/Dev/inboxshare。

2026-10-28 按 `dev/design/design/handoff/HANDOFF.md`（Claude 设计画布「InboxShare Redesign」导出）整体改版三个页面 + 接入品牌资源：
  - `public/`（Workers Static Assets，`wrangler.jsonc` 顶层和 env.production 都加了 `assets`）：favicon.svg/.ico、apple-touch-icon、icon-192/512、og-image(-zh).png、site.webmanifest。三页 `<head>` 加 icon/apple-touch-icon/theme-color；首页按语言给 og:image + twitter:card。
  - 首页：墨黑/钴蓝体系，Hero 两栏 + 演示卡、五步管道、Why 左右分栏、Features 1px 网格、Security 墨黑带、FAQ 左右分栏（`+`/`−` 纯 CSS）、CTA 面板、页脚语言切换。文案新增 trust*/flowTag*/sTag*/cta* 等 key。
  - 分享页：新页头（地址框 + 窗口徽标 + 44px 刷新 + 分段语言切换）、列表项选中态左 3px 内阴影、验证码区 40px、正文 iframe 容器、页脚 Powered by。手机：页头两行、新增「最新验证码」卡片（取列表第一封带 code 的邮件）、验证码标签放右侧、语言切换移到页脚。列表项 role=button + Enter/Space，验证码 aria-label 按位朗读，复制反馈进 aria-live。脚本逻辑（消毒、sandbox iframe 重建、history 返回）未动。
  - 管理页：左表单右表格两栏，登录卡片独立，页头 Signed in / Sign out，创建成功绿色结果框 + Copy，状态胶囊，撤销/过期行置灰不显示操作，表格 overflow-x 滚动。
  - 验证：typecheck、test:classify 通过；Playwright 驱动本机 Chrome 在 1440 / 390 两个视口真实渲染中英文全部页面（无横向溢出），交互测试 14 项通过（建链/复制/错误态/退出、手机详情与返回手势、键盘打开、FAQ 展开），深色模式三页截图检查。
  - 踩坑：表头里 `position:absolute` 的隐藏文本会撑大 scrollWidth 造成手机横向滚动，要放在 `position:relative` 的容器内。
  - 未做：README 换 `design/brand/logo.svg`（HANDOFF §7 说明仅供外部使用，README 由站长决定）。

2026-10-28 分享链接 key 改成可读格式：`邮箱用户名 + 备注（slug 化，中文等非 ASCII 丢弃后为空则用序号字母 A/B/C…）+ 10 位字母数字随机尾巴`，例如 `sharedisneyfamilyv6X5Si4Yl5`、`hiAA5ZR5179HG`。站长明确不要日期、不要连字符。随机尾巴是唯一的访问控制，不能去掉（`src/util.ts` 的 `buildShareKey`）。`public.ts` 的 key 校验最短从 16 放宽到 8，旧的 32 位随机 key 继续可用。管理页链接列改为显示完整 key（CSS 省略）。首页 Security 文案、README、CLAUDE.md 里"32 位随机 key"同步改掉。本地验证：带备注 / 无备注连续两条（F、G）/ 中文备注 / 新邮箱首条（A）四种情况，新旧 key 都能打开分享页，过短或含非法字符的 key 返回 403。

2026-10-28 分享页手动刷新加反馈：按钮转圈 + 蓝色描边并禁用（至少 500ms），列表头先显示"正在刷新…"，完成后绿色"已刷新"1.5 秒再恢复，aria-live 播报；自动刷新不走这套。减少动态效果时不转圈。
2026-10-28 管理页加"删除"：`DELETE /api/admin/links/:key` 改为真删除（任意状态可删，删后 /s/<key> 立即 403，列表不再显示），撤销改走 `POST /api/admin/links/:key/revoke`。删除按钮是垃圾桶图标（aria-label + title），走 confirm()。链接表格按站长要求定为七列：邮箱 / 窗口 / 状态 / 分享链接 / 过期 / 备注 / 管理（复制、撤销、删除三个图标按钮，title + aria-label，复制成功图标变对勾 1.5 秒）。`table-layout: fixed` + 像素列宽（128/84/96/112/130/84/132 = 766，正好贴合桌面卡片），单元格单行省略、完整内容在 title 里；窄屏在容器内横向滚动。过期时间用紧凑数字日期。`buildShareKey` 里备注 slug 与邮箱用户名相同时改用序号，避免 `netflixcodenetflixcode…`。

2026-10-28 站长定：备注不进 key。key 最终格式 = `邮箱用户名 + 序号字母 + 10 位随机`（`hiAK7qM2xP9aB`），`buildShareKey(mailbox, existingCount)`。

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
