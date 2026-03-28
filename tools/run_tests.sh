#!/usr/bin/env bash
# run_tests.sh - テストエントリポイント
#
# 使い方:
#   bash ./tools/run_tests.sh          # 全テスト
#   bash ./tools/run_tests.sh sign_count
#   bash ./tools/run_tests.sh yuutai

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-all}"

run() {
  echo "========================================"
  echo " Running: $1"
  echo "========================================"
  bash "$SCRIPT_DIR/tests/$1.sh"
}

case "$TARGET" in
  all)
    run sign_count
    run yuutai
    ;;
  sign_count|yuutai)
    run "$TARGET"
    ;;
  *)
    echo "Unknown target: $TARGET" >&2
    echo "Usage: $0 [sign_count|yuutai]" >&2
    exit 1
    ;;
esac
