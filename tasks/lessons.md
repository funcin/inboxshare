# 经验教训

## 2026-10-27 - 调研结论下早了
**问题**: 分析 dingyue.xzys.me 时，只搜到上游 Renewlet 仓库没有共享收件箱代码，就断言"分享层是站长私有二开、不公开"。实际 SubNest 本身开源（zxyszx/subnest），共享收件箱代码就在里面。
**原因**: 只按产品名做了一次泛搜索，没有用 GitHub 仓库搜索按名字精确查，也没查 Renewlet 的 fork 列表。
**教训**: 判断"某功能有没有开源实现"之前，至少做三件事：GitHub 按仓库名搜、看上游仓库的 fork 列表、用代码搜索查独特的接口路径/标识符。
**规则**: 对"不存在/不公开"这类否定结论，必须给出检索方式和范围，没有穷举就写"未找到"而不是"没有"。

## 2026-10-27 - Workers Builds 首次构建失败
**问题**: 推上去的首个版本在 Workers Builds 构建失败，锁定 `packageManager: pnpm@11.15.1` 和 `.node-version` 22 后通过。
**原因**: 本地用 pnpm 11 生成锁文件并在 pnpm-workspace.yaml 用了 `allowBuilds`，没告诉 CI 用哪个 pnpm/Node，CI 默认版本对不上。
**教训**: 新建 Cloudflare 项目时骨架就要带 `packageManager` + `.node-version`（和 freesongmaker 一致），不要等 CI 报错。
**规则**: 初始化任何走 Workers Builds 的项目，第一个提交必须包含 `packageManager` 与 `.node-version`。
