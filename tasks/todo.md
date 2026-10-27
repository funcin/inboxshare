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
- [x] Email Routing 规则 hi@funcin.de → Worker `emailshare` 已启用；测试邮件（funcin@icloud.com → hi@funcin.de）落库；管理接口建链接（24h 窗口、7 天有效）；浏览器真实渲染 /s/<key> 列表 + 详情通过（2026-10-27）

## 进度
2026-10-27 线上全链路跑通：Email Routing → Worker → D1 → /s/<key>。首条链接 key 存本地 dev/first-link.json（不进 git）。

2026-10-27 绑自定义域名 mail.funcin.de（routes custom_domain + PUBLIC_BASE_URL），分享链接改用该域名；workers.dev 地址仍可用。

未做（可选）：`/api/s/*` 的 Rate Limiting 规则；`FORWARD_TO` 目前为空，hi@funcin.de 的邮件只进共享收件箱不转发。

## 审查
- 页面只读，HTML 在浏览器端消毒 + sandbox iframe + srcdoc CSP；附件强制下载。
- 管理令牌缺失时管理接口整体 503，不会裸奔。

## 决策记录（2026-10-27）
对比四条路线后站长选 A（自写 Worker）：
- A 自写 Worker：已完成，零月费零运维，数据全在自己 Cloudflare 账号。
- B SubNest + 本 Worker 当邮箱后端：多 1~2 天接口开发 + Workers 付费版（Queues），只在需要合租管理时值得。
- C SubNest + 自建 LanQin 邮局：VPS + 25 端口 + 邮局运维，且公开 LanQin 缺 SubNest 私有接口，不选。
- D 向作者要 mail.newszxcn.com 令牌：验证码邮件经第三方，不选。
