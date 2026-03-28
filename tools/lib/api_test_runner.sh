#!/usr/bin/env bash
# api_test_runner.sh - 共通テストライブラリ
# source される前提。set -euo pipefail は適用しない（全ケース実行のため）

# .env 読み込み
_RUNNER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_ENV_FILE="$(cd "$_RUNNER_DIR/../.." && pwd)/.env"
if [ -f "$_ENV_FILE" ]; then
  # コメント行・空行を除いて export
  set -a
  # shellcheck disable=SC1090
  source "$_ENV_FILE"
  set +a
fi

# jq 必須チェック
if ! command -v jq &>/dev/null; then
  echo "ERROR: jq is required but not installed." >&2
  exit 1
fi

# グローバル集計変数
_PASS_COUNT=0
_FAIL_COUNT=0
_LAST_RESPONSE=""

# run_case "説明" <expected_status> <curl args...>
run_case() {
  local description="$1"
  local expected_status="$2"
  shift 2

  # レスポンスボディとHTTPステータスを分離して取得
  local response
  local http_status
  response=$(curl -s -w "\n__HTTP_STATUS__:%{http_code}" "$@" 2>/dev/null)
  http_status=$(printf '%s' "$response" | grep -o '__HTTP_STATUS__:[0-9]*' | cut -d: -f2)
  _LAST_RESPONSE=$(printf '%s' "$response" | sed 's/__HTTP_STATUS__:[0-9]*$//' | sed 's/[[:space:]]*$//')

  if [ "$http_status" = "$expected_status" ]; then
    printf "\033[32m✓ PASS\033[0m %s (HTTP %s)\n" "$description" "$http_status"
    _PASS_COUNT=$((_PASS_COUNT + 1))
  else
    printf "\033[31m✗ FAIL\033[0m %s (expected HTTP %s, got HTTP %s)\n" "$description" "$expected_status" "$http_status"
    _FAIL_COUNT=$((_FAIL_COUNT + 1))
  fi

  # レスポンス JSON を表示
  if [ -n "$_LAST_RESPONSE" ]; then
    if printf '%s' "$_LAST_RESPONSE" | jq . 2>/dev/null; then
      :
    else
      printf '%s\n' "$_LAST_RESPONSE"
    fi
  fi
  echo ""
}

# assert_json_key "key" - 最後のレスポンスに指定キーが存在するか確認
assert_json_key() {
  local key="$1"
  local value
  value=$(printf '%s' "$_LAST_RESPONSE" | jq -r --arg k "$key" 'if has($k) then "exists" else "missing" end' 2>/dev/null)

  if [ "$value" = "exists" ]; then
    printf "\033[32m✓ PASS\033[0m assert_json_key: '%s' exists\n\n" "$key"
    _PASS_COUNT=$((_PASS_COUNT + 1))
  else
    printf "\033[31m✗ FAIL\033[0m assert_json_key: '%s' not found in response\n\n" "$key"
    _FAIL_COUNT=$((_FAIL_COUNT + 1))
  fi
}

# assert_json_value "key" "expected_value" - 値一致確認
assert_json_value() {
  local key="$1"
  local expected="$2"
  local actual
  actual=$(printf '%s' "$_LAST_RESPONSE" | jq -r --arg k "$key" '.[$k] // empty' 2>/dev/null)

  if [ "$actual" = "$expected" ]; then
    printf "\033[32m✓ PASS\033[0m assert_json_value: '%s' == '%s'\n\n" "$key" "$expected"
    _PASS_COUNT=$((_PASS_COUNT + 1))
  else
    printf "\033[31m✗ FAIL\033[0m assert_json_value: '%s' expected '%s', got '%s'\n\n" "$key" "$expected" "$actual"
    _FAIL_COUNT=$((_FAIL_COUNT + 1))
  fi
}

# assert_json_key_missing "key" - 指定キーが存在しないことを確認
assert_json_key_missing() {
  local key="$1"
  local value
  value=$(printf '%s' "$_LAST_RESPONSE" | jq -r --arg k "$key" 'if has($k) then "exists" else "missing" end' 2>/dev/null)

  if [ "$value" = "missing" ]; then
    printf "\033[32m✓ PASS\033[0m assert_json_key_missing: '%s' not present\n\n" "$key"
    _PASS_COUNT=$((_PASS_COUNT + 1))
  else
    printf "\033[31m✗ FAIL\033[0m assert_json_key_missing: '%s' unexpectedly found in response\n\n" "$key"
    _FAIL_COUNT=$((_FAIL_COUNT + 1))
  fi
}

# print_summary - 集計表示。fail があれば exit 1
print_summary() {
  local total=$((_PASS_COUNT + _FAIL_COUNT))
  echo "========================================"
  echo " Test Summary"
  echo "========================================"
  printf "  Total : %d\n" "$total"
  printf "  \033[32mPASS  : %d\033[0m\n" "$_PASS_COUNT"
  if [ "$_FAIL_COUNT" -gt 0 ]; then
    printf "  \033[31mFAIL  : %d\033[0m\n" "$_FAIL_COUNT"
  else
    printf "  FAIL  : %d\n" "$_FAIL_COUNT"
  fi
  echo "========================================"
  if [ "$_FAIL_COUNT" -gt 0 ]; then
    exit 1
  fi
}
