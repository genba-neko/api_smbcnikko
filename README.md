# API SMBC Nikko

Cloudflare Workers + Hono + D1 で構成された小規模 API プロジェクトです。

現在の API は次の 2 系統です。

- `sign-count`: WebAuthn の `sign_count` 管理
- `yuutai`: 株主優待データ参照

## Structure

```text
.
├── src/
│   ├── index.ts
│   ├── middleware/
│   ├── repository/
│   ├── routes/
│   ├── services/
│   └── types/
├── schemas/
│   ├── webauthn-sign-count.sql
│   └── yuutai.sql
├── docs/
│   └── api/
├── tools/
├── data/
└── plan/
```

## App Layout

| ディレクトリ | 役割 |
|---|---|
| `src/routes/` | HTTP エンドポイント定義。リクエストを受け取りサービスを呼び出してレスポンスを返す |
| `src/services/` | ビジネスロジック層。値の検証や判断ロジックを記述し、Repository を通じてデータを操作する |
| `src/repository/` | D1 へのアクセスを集約。SQL はここだけに書き、他の層は SQL を意識しない |
| `src/middleware/` | Bearer 認証など複数エンドポイントで共通して実行する処理 |
| `src/types/` | Workers の Bindings（環境変数・D1）の型定義 |
| `schemas/` | 現行の D1 スキーマ SQL |
| `docs/api/` | API 仕様メモ |
| `tools/` | データ投入やセットアップ補助スクリプト |
| `plan/` | 作業計画 |

新しい API を追加するときは `routes/` → `services/` → `repository/` の順にファイルを追加し、`src/index.ts` で `app.route()` に登録してください。

## Endpoints

- `GET /sign-count/:credentialId`
- `PUT /sign-count/:credentialId`
- `DELETE /sign-count/:credentialId`
- `GET /yuutai/:tickerCode`
- `GET /yuutai/:tickerCode/:shares`
- `GET /yuutai/month/:recordDate`

Bearer 認証を全エンドポイントで利用します。

## Development

```bash
npm install
npm run dev
```

## Test

```bash
npm run test
```

`src/services/*.test.ts` でサービス層のユニットテストを管理しています。Repository をモック化することで DB の状態に依存せず高速にロジックを検証できます。

## Schema Operations

テーブルの作成・削除・再作成は `tools/d1_schema.sh` で行います。

```bash
# テーブル作成
bash ./tools/d1_schema.sh create webauthn-sign-count
bash ./tools/d1_schema.sh create yuutai

# テーブル削除
bash ./tools/d1_schema.sh drop webauthn-sign-count

# 再作成（drop → create）
bash ./tools/d1_schema.sh recreate yuutai

# 全テーブル一括（--all を明示）
bash ./tools/d1_schema.sh recreate --all

# dry-run（SQL を表示するのみ、実行しない）
bash ./tools/d1_schema.sh recreate --all --dry-run
```

`TARGET=local` でローカル D1 に向けることもできます（デフォルトは `remote`）。

新しいテーブルを追加するときは `schemas/<name>.sql` と `schemas/<name>_drop.sql` を対で作成してください。

## Related Docs

- `docs/api/sign-count.md`
- `docs/api/yuutai.md`
- `tools/setup/cloudflare/setup_d1_worker.md`

## WebAuthn Import Script

`webauthn_sign_count` テーブルへのデータ投入は専用スクリプトを使います。

```bash
bash ./tools/webauthn_sign_count.sh import
```
