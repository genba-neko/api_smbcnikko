

## API リファレンス

### 共通

- **Base URL**: `https://webauthn-signcount.<your-subdomain>.workers.dev`
- **認証**: `Authorization: Bearer <API_SECRET>`

### エンドポイント

| メソッド | パス | 用途 |
|---|---|---|
| `GET` | `/sign-count/:credentialId` | 現在の sign_count を取得 |
| `PUT` | `/sign-count/:credentialId` | 認証成功後に sign_count を更新 |
| `DELETE` | `/sign-count/:credentialId` | Credential 登録解除時に削除 |

### 使用例

```bash
# 取得
curl -H "Authorization: Bearer $API_SECRET" \
  https://webauthn-signcount.workers.dev/sign-count/abc123

# 更新（認証成功後に呼ぶ）
curl -X PUT \
  -H "Authorization: Bearer $API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"sign_count": 5, "user_id": "user_001"}' \
  https://webauthn-signcount.workers.dev/sign-count/abc123

# 削除
curl -X DELETE \
  -H "Authorization: Bearer $API_SECRET" \
  https://webauthn-signcount.workers.dev/sign-count/abc123
```

### レスポンス例

```jsonc
// GET 成功
{ "sign_count": 5, "updated_at": 1742551234 }

// PUT 成功
{ "ok": true, "sign_count": 6 }

// PUT 失敗（Replay Attack 検出）
{ "error": "sign_count_not_greater", "current": 6 }  // 409

// 存在しない
{ "error": "not_found" }  // 404
```