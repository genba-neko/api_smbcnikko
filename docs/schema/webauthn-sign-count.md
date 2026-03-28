# webauthn_sign_count テーブル

## 用途

パスキー認証における `sign_count`（署名カウンタ）を記録・参照するテーブルです。
WebAuthn の仕様に従い、認証器が生成する単調増加のカウンタ値を管理することでリプレイアタックを検出します。

## カラム一覧

| カラム名        | 型      | 説明                                      |
|----------------|---------|-------------------------------------------|
| `credential_id` | TEXT    | 認証器の Credential ID（主キー）           |
| `sign_count`    | INTEGER | 認証器から受け取った署名カウンタ値（デフォルト: 0） |
| `created_at`    | INTEGER | レコード初回登録時の Unix タイムスタンプ   |
| `updated_at`    | INTEGER | 最終更新時の Unix タイムスタンプ           |

## 制約・仕様

### sign_count の単調増加保証

`sign_count` は単調増加のみ許可されます。新しい値が既存の値以下の場合は更新を拒否し、`409 sign_count_not_greater` エラーを返します。この検証はサービス層（`src/services/signCount.ts`）で強制されており、リプレイアタックを防止します。

### created_at の不変性

`created_at` は初回 INSERT 時に `unixepoch()` でセットされます。ON CONFLICT による UPDATE 時には変更されず、初回登録時刻を保持し続けます。

## 操作コマンド例

`tools/d1_schema.sh` を使ってテーブルを操作します。

```bash
# テーブル作成
bash ./tools/d1_schema.sh create webauthn-sign-count

# テーブル削除
bash ./tools/d1_schema.sh drop webauthn-sign-count

# 再作成（drop → create）
bash ./tools/d1_schema.sh recreate webauthn-sign-count

# ローカル D1 に向ける場合
TARGET=local bash ./tools/d1_schema.sh create webauthn-sign-count

# dry-run（SQL を表示するのみ、実行しない）
bash ./tools/d1_schema.sh recreate webauthn-sign-count --dry-run
```
