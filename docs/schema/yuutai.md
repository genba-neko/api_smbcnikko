# yuutai テーブル

## 用途

株主優待データを参照するテーブルです。
銘柄コード・権利確定日・必要株数などの条件と、優待内容（金額・現物）を管理します。

## カラム一覧

| カラム名               | 型      | 説明                                                  |
|-----------------------|---------|-------------------------------------------------------|
| `id`                  | INTEGER | 自動採番の主キー（AUTOINCREMENT）                      |
| `ticker_code`         | TEXT    | 銘柄コード（例: `7203`）                               |
| `record_date`         | TEXT    | 権利確定日（例: `2024-03`）                            |
| `shares_condition`    | TEXT    | 株数条件のラベル（例: `100株以上`）                    |
| `shares_condition_num` | INTEGER | 株数条件の数値（例: `100`）                           |
| `benefit_yen`         | INTEGER | 優待の金額換算値（円）。金額不明の場合は NULL          |
| `benefit_original`    | TEXT    | 優待の原文説明（例: `QUOカード500円分`）。NULL 可      |
| `benefit_type`        | TEXT    | 優待の種別（例: `食事券`, `QUOカード`）。NULL 可       |
| `is_continuation`     | INTEGER | 継続保有条件の有無（`0`: なし, `1`: あり）デフォルト 0 |

## インデックス一覧

| インデックス名                  | カラム                              | 用途                             |
|-------------------------------|-------------------------------------|----------------------------------|
| `idx_yuutai_ticker_shares`    | `ticker_code`, `shares_condition_num` | 銘柄コード＋株数での検索用       |
| `idx_yuutai_record_date`      | `record_date`                       | 権利確定月での検索用             |

## 操作コマンド例

`tools/d1_schema.sh` を使ってテーブルを操作します。

```bash
# テーブル作成
bash ./tools/d1_schema.sh create yuutai

# テーブル削除
bash ./tools/d1_schema.sh drop yuutai

# 再作成（drop → create）
bash ./tools/d1_schema.sh recreate yuutai

# ローカル D1 に向ける場合
TARGET=local bash ./tools/d1_schema.sh create yuutai

# dry-run（SQL を表示するのみ、実行しない）
bash ./tools/d1_schema.sh recreate yuutai --dry-run
```
