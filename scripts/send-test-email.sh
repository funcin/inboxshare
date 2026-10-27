#!/usr/bin/env bash
# 向本地 wrangler dev 投递一封测试邮件（模拟 Email Routing），验证收信入库链路。
# 用法：pnpm dev 跑起来后，bash scripts/send-test-email.sh [to-address] [eml-file]
set -euo pipefail
TO="${1:-share@example.com}"
EML="${2:-$(dirname "$0")/fixtures/sample.eml}"
PORT="${PORT:-8787}"
curl -sS -X POST "http://localhost:${PORT}/cdn-cgi/handler/email?from=noreply@disneyplus.example&to=${TO}" \
  -H 'Content-Type: message/rfc822' \
  --data-binary "@${EML}"
echo
