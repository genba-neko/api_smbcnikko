# Schemas

`schemas/` は D1 に適用する現行 SQL の置き場です。

## Rules

- 運用中のテーブル定義は `schemas/` 直下に置く
- `wrangler d1 execute --file=...` で使うのは原則として `schemas/` 直下のファイルだけにする

## Current Files

- `schemas/webauthn-sign-count.sql`
- `schemas/yuutai.sql`
