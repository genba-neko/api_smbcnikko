# webauthn-sign-count

WebAuthn sign count を Durable Objects (SQLite) で管理するエンドポイント。
書き込みはシリアライズ保証。credentialId 単位で DO インスタンスを分離。

## エンドポイント

`GET /webauthn-sign-count/:credentialId` — 取得  
`PUT /webauthn-sign-count/:credentialId` — 更新（現在値より大きい値のみ）  
`DELETE /webauthn-sign-count/:credentialId` — 削除

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

# PUT
Invoke-WebRequest -Method PUT -Uri "http://localhost:8787/webauthn-sign-count/test123" -Headers @{Authorization="Bearer test_secret"} -ContentType "application/json" -Body '{"sign_count": 1}'

# DELETE
Invoke-WebRequest -Method DELETE -Uri "http://localhost:8787/webauthn-sign-count/test123" -Headers @{Authorization="Bearer test_secret"}
```

確認コマンド（bash）:

```bash
# GET
curl -H "Authorization: Bearer test_secret" http://localhost:8787/webauthn-sign-count/test123

# PUT
curl -X PUT -H "Authorization: Bearer test_secret" -H "Content-Type: application/json" \
  -d '{"sign_count": 1}' http://localhost:8787/webauthn-sign-count/test123

# DELETE
curl -X DELETE -H "Authorization: Bearer test_secret" http://localhost:8787/webauthn-sign-count/test123
```

## エラーレスポンス

- `404` — credential_id 未登録
- `400` — sign_count が数値でない or 負値
- `409` — sign_count が現在値以下（`current` フィールドに現在値を返す）
