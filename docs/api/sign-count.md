# WebAuthn Sign Count API 仕様・設計ドキュメント

## 1. テーブル設計 (`webauthn_sign_count`)

### 設計方針
- **主キー (`credential_id`)**: WebAuthn の認証器を一意に特定する `credential_id` をそのまま主キーとして採用。
- **一貫性の保証**: `sign_count` は常に単調増加（既存の値より大きい場合のみ更新可能）であることを Service 層で保証し、リプレイ攻撃等の不正を防止。
- **インデックス**: `user_id` による逆引きを想定し、`idx_user_id` を設定。

### カラム定義
| カラム名 | 型 | 説明 |
| :--- | :--- | :--- |
| `credential_id` | TEXT | WebAuthn の Credential ID（主キー） |
| `sign_count` | INTEGER | 署名回数（単調増加が必要） |
| `user_id` | TEXT | ユーザーを一意識別する ID |
| `updated_at` | INTEGER | 最終更新日時（UNIX エポック秒） |

---

## 2. API エンドポイント

### A. カウント取得 (`GET /sign-count/:credentialId`)
特定の Credential ID に紐づく現在の `sign_count` を取得。

- **Response (200 OK)**:
  ```json
  {
    "credential_id": "test123",
    "sign_count": 45,
    "user_id": "user_001",
    "updated_at": 1774104978
  }
  ```
- **Response (404 Not Found)**:
  ```json
  { "error": "not_found" }
  ```

### B. カウント更新・登録 (`PUT /sign-count/:credentialId`)
`sign_count` を更新または新規登録。

- **Request Body**:
  ```json
  {
    "sign_count": 50,
    "user_id": "user_001"
  }
  ```
- **Validation**:
  - `sign_count` は既存の値よりも大きい必要があります（409 Conflict）。
  - `sign_count` は 0 以上である必要があります（400 Bad Request）。
- **Response (200 OK)**:
  ```json
  { "ok": true, "sign_count": 50 }
  ```

### C. 削除 (`DELETE /sign-count/:credentialId`)
特定の Credential ID のデータを削除。

- **Response (200 OK)**:
  ```json
  { "ok": true }
  ```

---

## 3. 認証
すべてのエンドポイントは `Authorization: Bearer <API_SECRET>` ヘッダーによる認証が必要です。
