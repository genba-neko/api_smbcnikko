# プラン: webauthn_sign_count テーブル再設計 + スキーマ説明ドキュメント追加

## 背景

現在の `webauthn_sign_count` テーブルは仮設計。このテーブルはパスキーの sign_count を記録・参照する用途であり、認証デバイスを示す `credential_id` のみでキーとして十分。`user_id` は不要。

また `tools/webauthn_sign_count.sh` は create/drop が `d1_schema.sh` に統合されたため削除する。

## 関連資料

- `schemas/webauthn-sign-count.sql`
- `schemas/webauthn-sign-count_drop.sql`
- `src/routes/sign-count.ts`
- `src/services/signCount.ts`
- `src/repository/signCount.ts`
- `src/services/signCount.test.ts`
- `docs/api/sign-count.md`

## スキーマ変更

**変更前:**
```sql
CREATE TABLE IF NOT EXISTS webauthn_sign_count (
  credential_id TEXT    PRIMARY KEY,
  sign_count    INTEGER NOT NULL DEFAULT 0,
  user_id       TEXT    NOT NULL,
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_user_id ON webauthn_sign_count(user_id);
```

**変更後:**
```sql
CREATE TABLE IF NOT EXISTS webauthn_sign_count (
  credential_id TEXT    PRIMARY KEY,
  sign_count    INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);
```

## マイグレーション方針

- 既存データは**消失許容**
- `d1_schema.sh recreate webauthn-sign-count` で drop & recreate する

## API 破壊的変更

- `PUT /sign-count/:credentialId` のリクエストボディから `user_id` を除去
- `GET /sign-count/:credentialId` のレスポンスから `user_id` を除去、`created_at` を追加

## タスク案

1. **[refactor] webauthn_sign_count スキーマ・コード修正** [完了 PR#(後で追記) 2026-03-29]
   - `schemas/webauthn-sign-count.sql`: `user_id` 削除・`created_at` 追加・インデックス削除
   - `schemas/webauthn-sign-count_drop.sql`: `DROP INDEX IF EXISTS idx_user_id;` を削除
   - `src/repository/signCount.ts`: `SignCountRow` 型・upsert から `user_id` を除去
   - `src/services/signCount.ts`: `userId` パラメータを除去
   - `src/routes/sign-count.ts`: リクエストボディから `user_id` を除去
   - `src/services/signCount.test.ts`: `user_id` 関連のモック・引数・検証を削除

2. **[chore] tools/webauthn_sign_count.sh を削除** [完了 PR#(後で追記) 2026-03-29]
   - create/drop は `d1_schema.sh` で完結
   - README の WebAuthn Import Script セクションも削除

3. **[docs] docs/schema/ にスキーマ説明 .md を作成** [完了 PR#(後で追記) 2026-03-29]
   - `docs/schema/webauthn-sign-count.md`
     - テーブル定義・カラム説明
     - `sign_count` は単調増加（サービス層で担保、リプレイアタック防止）
     - `created_at` は登録時のみセット、UPDATE では変わらない
     - 操作コマンド（`d1_schema.sh` 使用例）
   - `docs/schema/yuutai.md`
     - テーブル定義・カラム説明
     - 操作コマンド

## 方針メモ

- テスト修正は実装と同一 issue に含める
- D1 本番への recreate はマージ後に手動実行（CI では行わない）
