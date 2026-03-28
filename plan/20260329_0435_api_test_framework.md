# プラン: API テストフレームワーク構築

## 目的

既存の `tools/setup/cloudflare/get_test.sh` / `put_test.sh` を廃止し、
全 API で再利用できるシェルベースのテストフレームワークを構築する。

## 関連資料

- `tools/setup/cloudflare/get_test.sh`（廃止対象）
- `tools/setup/cloudflare/put_test.sh`（廃止対象）
- `docs/api/sign-count.md`
- `docs/api/yuutai.md`

## 構成

```
tools/
├── lib/
│   └── api_test_runner.sh     # 共通関数（assert・色出力・.env 読み込み）
├── tests/
│   ├── sign_count.sh          # sign-count API のテストケース定義
│   └── yuutai.sh              # yuutai API のテストケース定義
└── run_tests.sh               # エントリポイント
```

## 使い方

```bash
# 全 API テスト
bash ./tools/run_tests.sh

# 特定 API だけ
bash ./tools/run_tests.sh sign_count
bash ./tools/run_tests.sh yuutai
```

## api_test_runner.sh が提供する関数

- `run_case "説明" <expected_status> <curl args>`: 1ケースの実行・結果表示
- `assert_json_key "key"`: JSON キーの存在確認
- `assert_json_key_missing "key"`: JSON キーが存在しないことを確認
- `assert_json_value "key" "value"`: 値の一致確認
- `.env` の自動読み込み（`API_SECRET` / `CLOUDFLARE_SUBDOMAIN`）
- 色付き出力（✓ 緑 / ✗ 赤）・pass/fail カウント

## sign_count テストケース

1. PUT 新規登録 → 200
2. GET 取得（`created_at` / `updated_at` あり、`user_id` なし）→ 200
3. PUT 単調増加（sign_count+2）→ 200
4. PUT 409（同値）→ 409
5. PUT 400（負の値）→ 400
6. DELETE → 200
7. GET 404 確認 → 404

`CREDENTIAL_ID` は `test-$(date +%s)` でユニーク生成。

## yuutai テストケース

1. GET /yuutai/:tickerCode → 200（銘柄コードは `.env` の `TEST_TICKER` から読む）
2. GET /yuutai/:tickerCode/:shares → 200
3. GET /yuutai/month/:recordDate → 200
4. GET 存在しない銘柄 → 200 空配列（yuutai API は存在しない銘柄に空配列を返す仕様）

## タスク案

1. **[feat] `tools/lib/api_test_runner.sh` を新規作成** [完了 PR#12 2026-03-29]
   - 共通関数・色出力・.env 読み込み・pass/fail 集計

2. **[feat] `tools/tests/sign_count.sh` を新規作成・旧スクリプトを廃止** [完了 PR#12 2026-03-29]
   - sign-count API の全テストケース実装
   - `get_test.sh` / `put_test.sh` を廃止（削除）

3. **[feat] `tools/tests/yuutai.sh` を新規作成** [完了 PR#12 2026-03-29]
   - yuutai API の全テストケース実装

4. **[feat] `tools/run_tests.sh` を新規作成** [完了 PR#12 2026-03-29]
   - 引数なしで全テスト、引数ありで指定テストを実行

## 方針メモ

- `jq` 必須（なければ起動時にエラーで終了）
- `set -euo pipefail` は runner 内で適用しない
- テスト失敗時も全ケースを最後まで実行してから終了コードを返す
