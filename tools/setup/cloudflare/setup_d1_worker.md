# Cloudflare Workers + D1 で WebAuthn sign_count API を作る

## 概要

WebAuthn の `sign_count` を管理する軽量 REST API を
Cloudflare Workers (Hono) + D1 で構築する。
開発環境は Dev Container に閉じ込め、Windows ホストを汚さない。

---

## アーキテクチャ

- **Cloudflare Workers**: サーバーレスランタイム（エッジ実行）
- **Hono**: Workers 向け軽量フレームワーク
- **D1**: Workers に紐付く SQLite マネージドDB
- **Dev Container**: Node.js / wrangler をコンテナ内に完結

```
[呼び出し元サーバー] --HTTPS--> [Cloudflare Workers (Hono)] ---> [D1]
                Bearer Token認証
```

---

## ディレクトリ構成

```
my-worker/
├── .devcontainer/
│   └── devcontainer.json
├── src/
│   └── index.ts
├── schemas/
│   ├── webauthn-sign-count.sql
│   └── yuutai.sql
├── wrangler.jsonc
├── package.json
├── tsconfig.json
└── .env.local          ← APIトークン（.gitignore 対象）
```

---

## セットアップ

### wrangler.jsonc 作成
{
  "name": "api-smbcnikko",
  "main": "src/index.ts",
  "compatibility_date": "2025-01-01",
  "account_id": "whoamiで出たAccountID"
}

### account_idを取得（表示されたアカウントをwranger.jsoncに記載
npx wrangler whoami

### D1作成（初回のみ、リモートに作成される）
npx wrangler d1 create smbcnikko-db

``` bash
 ⛅️ wrangler 4.76.0
───────────────────
✅ Successfully created DB 'smbcnikko-db' in region APAC
Created your new D1 database.

To access your new D1 Database in your Worker, add the following snippet to your configuration file:
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "smbcnikko-db",
      "database_id": "51d19720-02b1-42d7-afcf-7126f7f7288f"
    }
  ]
}
✔ Would you like Wrangler to add it on your behalf? … yes
✔ What binding name would you like to use? … DB
✔ For local dev, do you want to connect to the remote resource instead of a local resource? … yes
```

### 出力されたdatabase_idをwrangler.jsoncに記載
※自動で記録された

### データベース作成
npx wrangler d1 execute smbcnikko-db --remote --file=./schemas/webauthn-sign-count.sql

```bash
 ⛅️ wrangler 4.76.0
───────────────────
Resource location: remote

✔ ⚠️ This process may take some time, during which your D1 database will be unavailable to serve queries.
  Ok to proceed? … yes
🌀 Executing on remote database smbcnikko-db (51d19720-02b1-42d7-afcf-7126f7f7288f):
🌀 To execute on your local development database, remove the --remote flag from your wrangler command.
Note: if the execution fails to complete, your DB will return to its original state and you can safely retry.
├ 🌀 Uploading 51d19720-02b1-42d7-afcf-7126f7f7288f.484ad0c9eb871ca7.sql
│ 🌀 Uploading complete.
│
🌀 Starting import...
🌀 Processed 2 queries.
🚣 Executed 2 queries in 2.57ms (3 rows read, 4 rows written)
   Database is currently at bookmark 00000001-00000006-00005035-f5fdfcba9037c26ee9d6c1caeebb21d5.
┌────────────────────────┬───────────┬──────────────┬────────────────────┐
│ Total queries executed │ Rows read │ Rows written │ Database size (MB) │
├────────────────────────┼───────────┼──────────────┼────────────────────┤
│ 2                      │ 3         │ 4            │ 0.02               │
└────────────────────────┴───────────┴──────────────┴────────────────────┘
```

### API_SECRETを環境変数に登録
npx wrangler secret put API_SECRET

```bash
 ⛅️ wrangler 4.76.0
───────────────────
✔ Enter a secret value: … ***********
🌀 Creating the secret for the Worker "api-smbcnikko"
✔ There doesn't seem to be a Worker called "api-smbcnikko". Do you want to create a new Worker with that name and add secrets to it? … yes
🌀 Creating new Worker "api-smbcnikko"...
✨ Success! Uploaded secret API_SECRET
```

入力した文字列をAPI_SECRETという名前.envに入力


### honoインストール
npm install hono

### ワーカーデプロイ
npx wrangler deploy

``` bash

 ⛅️ wrangler 4.76.0
───────────────────
Total Upload: 69.90 KiB / gzip: 17.25 KiB
Your Worker has access to the following bindings:
Binding                              Resource
env.smbcnikko_db (smbcnikko-db)      D1 Database

Uploaded api-smbcnikko (3.46 sec)
▲ [WARNING] You need to register a workers.dev subdomain before publishing to workers.dev


✔ What would you like your workers.dev subdomain to be? It will be accessible at https://<subdomain>.workers.dev … dds-net
✔ Creating a workers.dev subdomain for your account at https://dds-net.workers.dev. Ok to proceed? … yes
Success! It may take a few minutes for DNS records to update.
Visit https://dash.cloudflare.com/96ec8417a1c866baa9cfdeca9e5d25f1/workers/subdomain to edit your workers.dev subdomain
▲ [WARNING] Because 'workers_dev' is not in your Wrangler file, it will be enabled for this deployment by default.

  To override this setting, you can disable workers.dev by explicitly setting 'workers_dev = false'
  in your Wrangler file.


▲ [WARNING] Because your 'workers.dev' route is enabled and your 'preview_urls' setting is not in your Wrangler file, Preview URLs will be enabled for this deployment by default.

  To override this setting, you can disable Preview URLs by explicitly setting 'preview_urls =
  false' in your Wrangler file.


Deployed api-smbcnikko triggers (76.52 sec)
  https://api-smbcnikko.dds-net.workers.dev
Current Version ID: 6add46cb-bf0b-4ca6-b343-ba9c1a6774be
🪵  Logs were written to "/home/node/.config/.wrangler/logs/wrangler-2026-03-21_11-17-35_005.log"
```

### PUT（登録）
curl -X PUT \
  -H "Authorization: Bearer <API_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"sign_count": 1, "user_id": "user_001"}' \
  https://api-smbcnikko.dds-net.workers.dev/sign-count/test123


### GET（確認）
curl -H "Authorization: Bearer <API_SECRET>" \
  https://api-smbcnikko.dds-net.workers.dev/sign-count/test123
