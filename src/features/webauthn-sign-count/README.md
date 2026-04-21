# webauthn-sign-count

WebAuthn sign count を Durable Objects (SQLite) で管理するエンドポイント。
書き込みはシリアライズ保証。credentialId 単位で DO インスタンスを分離。

## エンドポイント

`GET /webauthn-sign-count/:credentialId` — 現在値取得  
`POST /webauthn-sign-count/:credentialId` — `MAX(current, local_sign_count) + 1` を保存して返す  
`DELETE /webauthn-sign-count/:credentialId` — 削除

## 同期アルゴリズム

```
# オンライン時
before auth:  next = POST {local_sign_count: local} → local = next.sign_count

# オフライン時
before auth:  local += 1

# オフライン復帰後
POST {local_sign_count: local}  ← DO が MAX で吸収
```

## ローカル確認

`.dev.vars` が必要:

```
API_SECRET=test_secret
```

起動:

```bash
npx wrangler dev --local
```

確認コマンド（PowerShell）:

```powershell
# GET
Invoke-WebRequest -Uri "http://localhost:8787/webauthn-sign-count/test123" -Headers @{Authorization="Bearer test_secret"}

# POST
Invoke-WebRequest -Method POST -Uri "http://localhost:8787/webauthn-sign-count/test123" -Headers @{Authorization="Bearer test_secret"} -ContentType "application/json" -Body '{"local_sign_count": 1}'

# DELETE
Invoke-WebRequest -Method DELETE -Uri "http://localhost:8787/webauthn-sign-count/test123" -Headers @{Authorization="Bearer test_secret"}
```

確認コマンド（bash）:

```bash
# GET
curl -H "Authorization: Bearer test_secret" http://localhost:8787/webauthn-sign-count/test123

# POST
curl -X POST -H "Authorization: Bearer test_secret" -H "Content-Type: application/json" \
  -d '{"local_sign_count": 1}' http://localhost:8787/webauthn-sign-count/test123

# DELETE
curl -X DELETE -H "Authorization: Bearer test_secret" http://localhost:8787/webauthn-sign-count/test123
```

## エラーレスポンス

- `404` — credential_id 未登録（GET のみ）
- `400` — local_sign_count が数値でない or 負値
