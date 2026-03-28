#!/usr/bin/env bash
# yuutai.sh - yuutai (株主優待) API テスト

# shellcheck source=../lib/api_test_runner.sh
source "$(dirname "$0")/../lib/api_test_runner.sh"

BASE_URL="https://${CLOUDFLARE_SUBDOMAIN}"
AUTH="Authorization: Bearer ${API_SECRET}"
TICKER="${TEST_TICKER:-2914}"   # .env の TEST_TICKER、なければデフォルト 2914

echo "========================================"
echo " yuutai API Tests"
echo " ticker: $TICKER"
echo "========================================"
echo ""

# 1. GET /yuutai/:tickerCode → 200
run_case "GET /yuutai/$TICKER (銘柄情報取得)" 200 \
  -X GET "$BASE_URL/yuutai/$TICKER" \
  -H "$AUTH"

# 2. GET /yuutai/:tickerCode/:shares → 200 (shares=100)
run_case "GET /yuutai/$TICKER/100 (保有株数指定)" 200 \
  -X GET "$BASE_URL/yuutai/$TICKER/100" \
  -H "$AUTH"

# 3. GET /yuutai/month/:recordDate → 200 (recordDate=3月)
run_case "GET /yuutai/month/3 (月別優待一覧)" 200 \
  -X GET "$BASE_URL/yuutai/month/3" \
  -H "$AUTH"

# 4. GET 存在しない銘柄 → 200 空配列（yuutai API は存在しない銘柄に空配列を返す仕様）
run_case "GET /yuutai/0000 (存在しない銘柄) → 200 空配列" 200 \
  -X GET "$BASE_URL/yuutai/0000" \
  -H "$AUTH"

print_summary
