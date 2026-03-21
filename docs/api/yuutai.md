# 株主優待 API 仕様・設計ドキュメント

## 1. テーブル設計 (`yuutai`)

### 設計方針
- **主キー (`id`)**: 柔軟性と実装のシンプルさを考慮し、`INTEGER PRIMARY KEY AUTOINCREMENT`（サロゲートキー）を採用。
- **一意性の検討**: `ticker_code + record_date + shares_condition_num + is_continuation` の組み合わせで論理的な一意性を担保。
- **インデックス**: 
    - `idx_yuutai_ticker_shares`: 銘柄コードと株数による高速検索。
    - `idx_yuutai_record_date`: 権利確定月（3-XXなど）による高速検索。

### カラム定義
| カラム名 | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | INTEGER | 自動採番 ID（主キー） |
| `ticker_code` | TEXT | 証券コード（例: "1301"） |
| `record_date` | TEXT | 権利確定月（例: "3-XX"） |
| `shares_condition` | TEXT | 保有株数条件テキスト（例: "100株以上"） |
| `shares_condition_num` | INTEGER | 保有株数（数値、例: 100） |
| `benefit_yen` | INTEGER | 優待の換算金額（NULL 可） |
| `benefit_original` | TEXT | 優待内容の原本テキスト（NULL 可） |
| `benefit_type` | TEXT | 優待カテゴリ（NULL 可） |
| `is_continuation` | INTEGER | 継続保有フラグ（0: false, 1: true） |

---

## 2. API レスポンスイメージ

### A. 銘柄コードで取得 (`GET /yuutai/1301`)
特定の銘柄の全優待条件を配列で取得。

```json
[
  {
    "id": 1,
    "ticker_code": "1301",
    "record_date": "3-XX",
    "shares_condition": "100株以上",
    "shares_condition_num": 100,
    "benefit_yen": 2500,
    "benefit_original": "2,500円相当",
    "benefit_type": "飲食料品",
    "is_continuation": false
  },
  {
    "id": 2,
    "ticker_code": "1301",
    "record_date": "3-XX",
    "shares_condition_num": 300,
    ...
  }
]
```

### B. 銘柄コード + 株数で取得 (`GET /yuutai/1301/100`)
特定の株数条件に合致するデータを配列で取得（継続保有条件などで複数ヒットする可能性があるため）。

```json
[
  {
    "id": 1,
    "ticker_code": "1301",
    "record_date": "3-XX",
    "shares_condition_num": 100,
    "is_continuation": false,
    ...
  }
]
```

### C. 権利確定月で取得 (`GET /yuutai/month/3-XX`)
その月に権利が確定する全銘柄の優待情報を配列で取得。

```json
[
  { "ticker_code": "1301", ... },
  { "ticker_code": "7203", ... }
]
```
