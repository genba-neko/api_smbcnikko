#!/usr/bin/env bash
# sign_count.sh - sign-count API テスト

# shellcheck source=../lib/api_test_runner.sh
source "$(dirname "$0")/../lib/api_test_runner.sh"

BASE_URL="https://${CLOUDFLARE_SUBDOMAIN}"
AUTH="Authorization: Bearer ${API_SECRET}"
CRED="test-$(date +%s)"

echo "========================================"
echo " sign-count API Tests"
echo " credential: $CRED"
echo "========================================"
echo ""

# 1. PUT 新規登録 → 200
run_case "PUT 新規登録" 200 \
  -X PUT "$BASE_URL/sign-count/$CRED" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{"sign_count": 1}'

# 2. GET 取得 → 200、created_at キーあり、user_id キーなし
run_case "GET 取得" 200 \
  -X GET "$BASE_URL/sign-count/$CRED" \
  -H "$AUTH"

assert_json_key "created_at"
assert_json_key_missing "user_id"

# 3. PUT 単調増加（sign_count+2 = 3）→ 200
run_case "PUT 単調増加 (sign_count=3)" 200 \
  -X PUT "$BASE_URL/sign-count/$CRED" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{"sign_count": 3}'

# 4. PUT 同値 → 409
run_case "PUT 同値 (sign_count=3) → 409" 409 \
  -X PUT "$BASE_URL/sign-count/$CRED" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{"sign_count": 3}'

# 5. PUT 負の値 → 400
run_case "PUT 負の値 (sign_count=-1) → 400" 400 \
  -X PUT "$BASE_URL/sign-count/$CRED" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{"sign_count": -1}'

# 6. DELETE → 200
run_case "DELETE" 200 \
  -X DELETE "$BASE_URL/sign-count/$CRED" \
  -H "$AUTH"

# 7. GET 削除後 → 404
run_case "GET 削除後 → 404" 404 \
  -X GET "$BASE_URL/sign-count/$CRED" \
  -H "$AUTH"

print_summary
