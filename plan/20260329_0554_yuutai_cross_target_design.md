# プラン: yuutai / stocks / cross_target テーブル設計

## 背景

現在の `yuutai` テーブルは仮設計。スクレイピングデータの活用・フロントエンド表示・
クロス取引発注システムとの連動を見据えた本設計を行う。

## 関連資料

- `schemas/yuutai.sql`（現行・仮設計）
- `schemas/yuutai_drop.sql`
- `docs/schema/yuutai.md`
- `.work/めもめも`（cross_target の元メモ）

---

## データストア方針

### yuutai → R2（JSON）

**理由：**
- スクレイピングデータは廃止・改悪・新設が不定期に発生し、差分が特定できないため**全件入れ替え**が安全
- D1 で全件削除 → 再 INSERT すると書き込みコストが毎回発生し、無料枠を圧迫する
- R2 は上書き PUT が安価で、全件入れ替えでもコスト問題なし
- スクレイピング元の構造の揺れをスキーマに縛らず吸収できる

**ファイル構成（案）：**
```
r2://
  yuutai/by-month/03-XX.json   # 3月末日権利のすべての銘柄
  yuutai/by-month/03-20.json   # 3月20日権利のすべての銘柄
  yuutai/by-ticker/2914.json   # 銘柄 2914 のすべての優待情報
```

**フロントからのクエリ対応：**
- 月別一覧 → `by-month/*.json` をそのまま返す
- 銘柄別 → `by-ticker/{ticker}.json`
- 複合フィルタ・ソート → Worker 側で JSON を読み込んでフィルタ

### stocks / cross_target → D1

**理由：**
- `stocks` は変更が少なく、`cross_target` との JOIN が必要
- `cross_target` は発注システムと連動する操作データであり、SQL で管理すべき

---

## テーブル設計

### stocks（銘柄マスタ）← D1

```sql
CREATE TABLE IF NOT EXISTS stocks (
  ticker_code  TEXT    PRIMARY KEY,
  stock_name   TEXT    NOT NULL,
  market       TEXT,                -- 東証プライム等
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
```

### yuutai（優待情報）← R2 JSON

**1行の意味：** 銘柄 × 権利日 × 株数閾値 → 合計優待価値

```json
{
  "ticker_code": "2914",
  "record_date": "03-XX",
  "shares_condition_num": 100,
  "benefit_yen": 3500,
  "benefit_desc": "食品詰め合わせ3000円相当 + QUOカード500円",
  "benefit_category": "食品",
  "requires_continuation": false,
  "scraped_at": 1774700000
}
```

**record_date フォーマット：**
- `MM-XX` = M月末日権利（例: `03-XX` = 3月末日）
- `MM-DD` = 特定日権利（例: `03-20` = 3月20日）

**キー設計：**
- `(ticker_code, record_date, shares_condition_num)` が一意キー
- 1銘柄に株数ティアが複数ある場合は複数オブジェクト

**利回り計算の考え方：**
```
yield_rate = benefit_yen / (stock_price × shares_condition_num) × 100
```
- `stock_price` は前日終値等を別途採取して D1 or R2 に保存
- 利回り計算は Worker or バッチで実施

### cross_target（クロス対象リスト）← D1

```sql
CREATE TABLE IF NOT EXISTS cross_target (
  ticker_code   TEXT    NOT NULL,  -- → stocks.ticker_code
  record_date   TEXT    NOT NULL,  -- "03-XX", "03-20"
  shares_needed INTEGER NOT NULL,  -- 確保株数（yuutai の shares_condition_num に対応）
  start_date    TEXT,              -- 確保開始日
  is_seido      INTEGER NOT NULL DEFAULT 1,  -- 制度信用可否
  is_ippan      INTEGER NOT NULL DEFAULT 1,  -- 一般信用可否
  -- 登録時点のスナップショット
  stock_name    TEXT,              -- stocks.stock_name のコピー
  benefit_yen   INTEGER,           -- yuutai の値のコピー
  stock_price   INTEGER,           -- 参照した株価
  yield_rate    REAL,              -- 計算済み利回り
  -- 状態管理
  status        TEXT    NOT NULL DEFAULT 'active',
                                   -- 'active' / 'needs_review' / 'obsolete'
  status_reason TEXT,              -- needs_review / obsolete になった理由
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (ticker_code, record_date)
);
```

**粒度に関する未決事項：**
- PK を `(ticker_code, record_date)` にするか `(ticker_code, record_date, shares_needed)` にするか
- 1銘柄1権利日で「最適な株数ティアを1つ選ぶ」運用なら前者
- 複数ティアを並べて比較したい場合は後者
- → **発注システムの仕様が決まり次第確定**

---

## yuutai 変更時の cross_target 反映方針

### cross_target の性質

cross_target は**意思決定テーブル**（派生テーブルではない）。

- 「この銘柄をクロス対象にする」という人間の判断を記録
- yuutai が変わっても自動で上書きせず、**レビューを挟む**
- 発注済み・発注判断済みの行が意図せず変わることを防ぐ

### status フラグによる管理フロー

```
yuutai 更新（スクレイピング）
  ↓
変更検知バッチ
  ├─ 優待廃止   → status = 'needs_review', status_reason = '優待廃止'
  ├─ benefit_yen 変更 → status = 'needs_review', status_reason = '優待内容変更'
  └─ 変更なし   → 何もしない
  ↓
人間がレビュー
  ├─ 継続 → status = 'active' に戻す（shares_needed・benefit_yen を更新）
  └─ 対象外 → status = 'obsolete' または削除
```

**発注システムへのガード：**
- `status = 'active'` の行のみ発注システムに流す
- `needs_review` / `obsolete` はスキップ

---

## 未決事項

| 項目 | 内容 | 決定に必要な情報 |
|---|---|---|
| cross_target の PK 粒度 | 銘柄単位 or 銘柄＋株数単位 | 発注システムの入力仕様 |
| 発注システムとのインターフェース | 何を渡すか・フォーマット | 発注システム仕様確認 |
| stock_price の保管場所 | D1 か R2 か、更新頻度 | 株価取得方法の決定 |
| 変更検知バッチの実装 | どこで動かすか（Worker cron？外部？） | インフラ方針 |
| yuutai の年次管理 | 前年比・廃止履歴を残すか | 運用要件の確認 |
| フロントエンドの実装場所 | Cloudflare Pages？ | 別途検討 |

---

## 現行 yuutai テーブルからの移行

- 現行 `yuutai` テーブル（D1）は仮設計のため**消失許容**
- `d1_schema.sh drop yuutai` で削除
- データを R2 に移行するバッチを別途作成
- `stocks` テーブルを D1 に新規作成

## タスク案（未登録）

1. **[feat] stocks テーブルを D1 に新規作成**
2. **[feat] yuutai データを R2 JSON 形式で管理するスクレイピング・投入バッチ設計**
3. **[feat] yuutai API エンドポイントを R2 参照に切り替え**
4. **[feat] cross_target テーブル設計・実装**（発注システム仕様確定後）
5. **[feat] yuutai 変更検知 → cross_target status 更新バッチ**
6. **[feat] 優待情報フロントエンド**
