# webauthn-sign-count Durable Objects 実装プラン

refs #26 [完了 PR#XX 2026-04-21]

## 目標

sign_count の Source of Truth を D1 → Durable Objects (SQLite) に切替。
書き込みシリアライズを設計レベルで保証。既存 D1 `signCount` はそのまま残す。

## フォルダ構成方針

feature-first + shared/ ハイブリッド（段階移行）。
新機能は `src/features/` 配下に置く。`index.ts` が Worker エントリポイント兼 re-export。

```
src/
  features/
    webauthn-sign-count/
      durable.ts   ← WebauthnSignCount DO クラス
      route.ts     ← Hono ルート (/webauthn-sign-count)
      index.ts     ← re-export + standalone Worker エントリポイント
  routes/          ← 既存（そのまま）
  services/        ← 既存（そのまま）
  repository/      ← 既存（そのまま）
  middleware/
  types/
  index.ts         ← モノリシック Worker エントリポイント
```

別 Worker デプロイ時は `wrangler.webauthn-sign-count.jsonc` で `main` を feature の `index.ts` に向ける。

## アーキテクチャ

```
PUT /webauthn-sign-count/:credentialId
  ↓
Worker (Hono)
  ↓
WebauthnSignCount DO (credentialId でインスタンス分離)
  ↓ DO 内 SQLite
  sign_count 更新 (シリアライズ保証)
  ↓
response
```

### write-through cache フロー（scrapy worker）

```
起動 → GET /webauthn-sign-count/:credentialId → ローカル上書き
カウントアップ → PUT /webauthn-sign-count/:credentialId → DO に書く
```

## DO データスキーマ

D1 の `webauthn_sign_count` テーブルと同構造：

```sql
CREATE TABLE IF NOT EXISTS webauthn_sign_count (
  credential_id TEXT    PRIMARY KEY,
  sign_count    INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);
```

## 実装ステップ

### 1. `src/features/webauthn-sign-count/durable.ts`

- `WebauthnSignCount` クラス（`DurableObject` 継承）
- DO 内 SQLite でテーブル初期化
- GET / PUT / DELETE を `fetch()` でハンドル
- sign_count 増加チェック（現在値以下なら 409）

### 2. `src/features/webauthn-sign-count/route.ts`

- Hono ルート: GET / PUT / DELETE `/webauthn-sign-count/:credentialId`
- `idFromName(credentialId)` で DO インスタンス取得

### 3. `src/features/webauthn-sign-count/index.ts`

- `WebauthnSignCount` re-export
- standalone Worker 用 Hono app export

### 4. `wrangler.jsonc` 更新

```jsonc
"durable_objects": {
  "bindings": [{ "name": "WEBAUTHN_SIGN_COUNT", "class_name": "WebauthnSignCount" }]
},
"migrations": [{ "tag": "v1", "new_classes": ["WebauthnSignCount"] }]
```

### 5. `src/types/env.ts` 更新

`WEBAUTHN_SIGN_COUNT: DurableObjectNamespace` 追加

### 6. `src/index.ts` 更新

- `export { WebauthnSignCount }` 追加
- `/webauthn-sign-count` ルート登録

## ファイル変更一覧

| ファイル | 変更種別 |
|---|---|
| `src/features/webauthn-sign-count/durable.ts` | 新規 |
| `src/features/webauthn-sign-count/route.ts` | 新規 |
| `src/features/webauthn-sign-count/index.ts` | 新規 |
| `src/types/env.ts` | 更新 |
| `wrangler.jsonc` | 更新 |
| `src/index.ts` | 更新 |
