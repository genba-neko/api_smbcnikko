# Schemas

`schemas/` は D1 に適用する現行 SQL の置き場です。

## Rules

- 運用中のテーブル定義は `schemas/` 直下に置く
- テーブルを追加するときは `<name>.sql`（CREATE）と `<name>_drop.sql`（DROP）を対で作成する
- D1 への実行は `tools/d1_schema.sh` を使う（直接 `wrangler d1 execute` を叩かない）

## Current Files

| ファイル | 役割 |
|---|---|
| `webauthn-sign-count.sql` | `webauthn_sign_count` テーブル・インデックスの CREATE |
| `webauthn-sign-count_drop.sql` | 上記の DROP |
| `yuutai.sql` | `yuutai` テーブル・インデックスの CREATE |
| `yuutai_drop.sql` | 上記の DROP |
