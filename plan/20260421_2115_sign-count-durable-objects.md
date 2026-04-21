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

## 設計：アトミック MAX+1 更新

DO のシリアライズ保証を活かし、クライアント1ステップで次の sign_count を取得する設計。

```
POST {local_sign_count: N}
  → DO 内で MAX(current, N) + 1 をアトミックに保存
  → 新しい sign_count を返す
```

### クライアントの同期フロー

```
# オンライン時（1ステップ）
before auth:  next = POST {local_sign_count: local} → local = next.sign_count

# オフライン時
before auth:  local += 1

# オフライン復帰後
POST {local_sign_count: local}  ← DO が MAX で吸収、巻き戻りなし
```

### なぜこの設計か

- **2ステップ不要**: GET → local += 1 → POST after success の3操作が POST 1つに集約
- **競合ゼロ**: DO 単一インスタンスのシリアライズ → DynamoDB conditional update 不要
- **オフライン耐性**: ローカルで進んだ値を復帰後に POST するだけで DO が吸収
- **巻き戻りなし**: MAX semantics で小さい値は無視、飛び値は WebAuthn 仕様上 OK

## API

```
GET  /webauthn-sign-count/:credentialId          → 現在値取得（404 if 未登録）
POST /webauthn-sign-count/:credentialId          → MAX(current, local_sign_count) + 1 を保存・返却
DELETE /webauthn-sign-count/:credentialId        → 削除
```

## DO データスキーマ

```sql
CREATE TABLE IF NOT EXISTS webauthn_sign_count (
  credential_id TEXT    PRIMARY KEY,
  sign_count    INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);
```

POST の UPDATE:
```sql
ON CONFLICT(credential_id) DO UPDATE SET
  sign_count = MAX(sign_count, excluded.sign_count) + 1,
  updated_at = unixepoch()
```

## ファイル変更一覧

| ファイル | 変更種別 |
|---|---|
| `src/features/webauthn-sign-count/durable.ts` | 新規 |
| `src/features/webauthn-sign-count/route.ts` | 新規 |
| `src/features/webauthn-sign-count/index.ts` | 新規 |
| `src/features/webauthn-sign-count/README.md` | 新規 |
| `src/types/env.ts` | 更新 |
| `wrangler.jsonc` | 更新 |
| `src/index.ts` | 更新 |
| `.gitignore` | 更新（wrangler.jsonc 等を追跡、.dev.vars 除外） |
