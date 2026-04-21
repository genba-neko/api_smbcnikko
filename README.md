# API SMBC Nikko

Cloudflare Workers + Hono + D1 で構成された小規模 API プロジェクト。

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
├── plan/
├── workbench/          ← git submodule (開発ツールキット)
├── .workbench/         ← プロジェクト固有の workbench 設定
├── biome.json          ← lint / format 設定
├── tsconfig.json       ← TypeScript 設定
└── worker-configuration.d.ts  ← wrangler types で生成
```

## App Layout

| ディレクトリ | 役割 |
|---|---|
| `src/routes/` | HTTP エンドポイント定義 |
| `src/services/` | ビジネスロジック層 |
| `src/repository/` | D1 へのアクセスを集約。SQL はここだけに書く |
| `src/middleware/` | Bearer 認証など共通処理 |
| `src/types/` | Workers Bindings の型定義 |
| `schemas/` | D1 スキーマ SQL |
| `docs/api/` | API 仕様メモ |
| `tools/` | データ投入・スキーマ操作スクリプト |
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

### 前提

- Node.js v20 以上
- `.env` ファイルをプロジェクトルートに作成

```env
CLOUDFLARE_API_TOKEN=your_token
API_SECRET=your_secret
CLOUDFLARE_SUBDOMAIN=your_subdomain
```

### セットアップ (初回 / 環境再構築)

```powershell
# Windows (PowerShell)
workbench\npm\setup-node.bat
```

```bash
# Git Bash / WSL
bash workbench/npm/setup-node.sh
```

`node_modules` に wrangler / typescript / biome / vitest がインストールされます。

### 開発サーバー起動

VSCode で **PowerShell (workbench)** ターミナルを開くと以下のショートカットが使えます。

| コマンド | 動作 |
|---|---|
| `dev` | `wrangler dev` — ローカル D1 で起動 |
| `dev-remote` | `wrangler dev --remote` — リモート D1 で起動 |
| `deploy` | `wrangler deploy` — 本番デプロイ |
| `test-unit` | `vitest run` |
| `type-check` | `tsc --noEmit` |
| `lint` | `biome check .` |
| `format` | `biome check --write .` (自動修正) |
| `d1-init` | ローカル D1 スキーマ初期化 |

### ローカル D1 初期化

```bash
d1-init
# または
TARGET=local bash tools/d1_schema.sh recreate --all
```

### 型定義の再生成

`wrangler.jsonc` を変更したら実行する。

```bash
npx wrangler types
```

## Test

```bash
test-unit
# または
npm exec --no -- vitest run
```

`src/services/*.test.ts` でサービス層のユニットテストを管理しています。Repository をモックすることで DB 状態に依存せず高速に検証できます。

## Lint / Format

```bash
lint    # biome check (エラー表示)
format  # biome check --write (自動修正)
```

設定: `biome.json`（対象: `src/` / `tools/`）

## Schema Operations

テーブルの作成・削除・再作成は `tools/d1_schema.sh` で行います。

```bash
# テーブル作成
bash ./tools/d1_schema.sh create webauthn-sign-count
bash ./tools/d1_schema.sh create yuutai

# 再作成（drop → create）
bash ./tools/d1_schema.sh recreate yuutai

# 全テーブル一括
bash ./tools/d1_schema.sh recreate --all

# dry-run（SQL を表示するのみ、実行しない）
bash ./tools/d1_schema.sh recreate --all --dry-run
```

`TARGET=local` でローカル D1 に向けることができます（デフォルトは `remote`）。

新しいテーブルを追加するときは `schemas/<name>.sql` と `schemas/<name>_drop.sql` を対で作成してください。

## Related Docs

- `docs/api/sign-count.md`
- `docs/api/yuutai.md`
- `tools/setup/cloudflare/setup_d1_worker.md`
