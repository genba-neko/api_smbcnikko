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
  "shares_required": 100,
  "benefit_amount": 3500,
  "benefit_detail": "食品詰め合わせ3000円相当 + QUOカード500円",
  "benefit_category": "食品",
  "requires_continuation": false,
  "scraped_at": 1774700000
}
```

**record_date フォーマット：**
- `MM-XX` = M月末日権利（例: `03-XX` = 3月末日）
- `MM-DD` = 特定日権利（例: `03-20` = 3月20日）

**キー設計：**
- `(ticker_code, record_date, shares_required)` が一意キー
- 1銘柄に株数ティアが複数ある場合は複数オブジェクト

**利回り計算の考え方：**
```
yield_rate = benefit_amount / (stock_price × shares_required) × 100
```
- `stock_price` は前日終値等を別途採取して D1 or R2 に保存
- 利回り計算は Worker or バッチで実施

### cross_target（クロス対象リスト）← D1（2テーブル構成）

ユーザ依存データとシステム自動更新データを分離することで、株価バッチの更新コストをユーザ数に依存させない。

#### cross_target_plan（ユーザの意思決定）

```sql
CREATE TABLE IF NOT EXISTS cross_target_plan (

  -- [キー]
  user_id       TEXT    NOT NULL DEFAULT 'default',  -- マルチユーザ対応（当面は 'default' で運用）
  ticker_code   TEXT    NOT NULL,  -- → stocks.ticker_code
  record_date   TEXT    NOT NULL,  -- "03-XX", "03-20"
  shares_required INTEGER NOT NULL,  -- 目標株数

  -- [人間が設定・編集する項目]
  start_date      TEXT    NOT NULL,  -- この株数の確保開始日
  is_wanted       INTEGER NOT NULL DEFAULT 1,  -- 1: 取得したい / 0: 不要
  unwanted_reason TEXT,                         -- 不要理由メモ（例: "食品不要"）

  -- [自動更新: 行が変更されるたびに更新]
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch()),

  PRIMARY KEY (user_id, ticker_code, record_date, shares_required)
);
```

#### cross_target_market（システム自動更新・全ユーザ共有）

```sql
CREATE TABLE IF NOT EXISTS cross_target_market (

  -- [キー] cross_target_plan の登録時に生成、誰も登録していなければ削除
  ticker_code   TEXT    NOT NULL,
  record_date   TEXT    NOT NULL,
  shares_required INTEGER NOT NULL,

  -- [自動更新: 登録時に yuutai / stocks からコピー、以降は変更検知バッチが更新]
  stock_name      TEXT,
  benefit_amount     INTEGER,
  benefit_summary TEXT,
  is_seido        INTEGER NOT NULL DEFAULT 1,  -- 制度信用可否（スクレイピングデータ）
  is_ippan        INTEGER NOT NULL DEFAULT 1,  -- 一般信用可否（スクレイピングデータ）

  -- [自動更新: 毎日の株価バッチが閾値超過時のみ更新]
  stock_price          INTEGER,
  yield_rate           REAL,    -- 計算済み利回り（コスト控除前）
  daily_cost_estimate  REAL,    -- 1日あたりのコスト見積もり（金利ベース）

  -- [自動更新: バッチが設定、人間がレビュー後に 'active' に戻す]
  status        TEXT    NOT NULL DEFAULT 'active',
                           -- 'active' / 'needs_review' / 'obsolete'
  status_reason TEXT,

  updated_at    INTEGER NOT NULL DEFAULT (unixepoch()),

  PRIMARY KEY (ticker_code, record_date, shares_required)
);
```

**テーブル分割の効果：**

| | 単一テーブル | 分割後 |
|---|---|---|
| 株価バッチの UPDATE 対象 | 全ユーザ × 全銘柄行 | cross_target_market のみ（ユーザ数に非依存）|
| ユーザ追加時のコスト増加 | あり | なし |
| 一覧取得 | SELECT のみ | JOIN が必要（D1 規模では問題なし）|

**cross_target_market のライフサイクル：**
- ユーザが `cross_target_plan` に登録 → `cross_target_market` が存在しなければ生成
- ユーザが削除 → `cross_target_plan` の行を削除。他ユーザが同じ行を持っていなければ `cross_target_market` も削除（定期バッチで孤立行を掃除でも可）

**段階的取得の考え方：**

同一銘柄 × 権利日で `shares_required` の異なる複数行を持つことで段階的な確保計画を表現する。

```
例: 2914 × 03-XX
  行1: shares_required=100,  start_date='2026-01-15'  ← 早期から100株確保（利回り3%）
  行2: shares_required=1000, start_date='2026-03-20'  ← 権利日10日前に1000株へ引き上げ（利回り5%）
```

**コスト見積もりの考え方：**

| コスト | 事前見積もり | 確定タイミング |
|---|---|---|
| 手数料 | 株価 × 株数 × 手数料率で試算 | 発注時 |
| 金利・貸株料 | 日数 × 残高 × 金利率 | 返済時 |
| 逆日歩 | 見積もり困難（ゼロ〜高額） | 権利日直前 |
| 名義書換料 | 固定 or 株数比例 | 権利確定後 |

- `daily_cost_estimate` は金利・手数料ベースの1日コスト（逆日歩は含まない）、DB に保存
- `cost_estimate_total` / `yield_net_estimate` は **API 側で都度計算**（DB に持たない）
  - `cost_estimate_total = daily_cost_estimate × (record_date - start_date の日数)`
  - `yield_net_estimate = (benefit_amount - cost_estimate_total) / (stock_price × shares_required) × 100`
- 逆日歩リスクは `is_seido` フラグで制度信用か一般信用かで判断材料にする

**試算エンドポイント（start_date 決定の補助）：**

`start_date` をパラメータで渡すと、その日から取得した場合のコスト・実質利回りを返す。
`start_date` を変えながら繰り返し試算できるため、確保開始日の意思決定補助として機能する。

```
GET /cross-target/estimate?ticker=2914&record_date=03-XX&shares=100&start_date=2026-01-15
→ {
     daily_cost_estimate: 150,
     days: 65,
     cost_estimate_total: 9750,
     yield_rate: 3.5,
     yield_net_estimate: 2.8
   }
```

**発注システムとの連動：**
- 発注システムは現在の保有株数を把握しており、`shares_required - 現在保有数` を差分発注する
- 発注対象の抽出条件: `u.start_date <= 今日` かつ `d.status = 'active'` かつ `u.is_wanted = 1`

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
  ├─ benefit_amount 変更 → status = 'needs_review', status_reason = '優待内容変更'
  └─ 変更なし   → 何もしない
  ↓
人間がレビュー
  ├─ 継続 → status = 'active' に戻す（shares_required・benefit_amount を更新）
  └─ 対象外 → status = 'obsolete' または削除
```

**発注システムへのガード：**
- `status = 'active'` かつ `is_wanted = 1` の行のみ発注システムに流す
- `needs_review` / `obsolete` はスキップ
- `is_wanted = 0` は利回りデータとして保持するが発注対象外

**2つのフラグの役割分担：**

| フラグ | 意味 | 誰が更新 |
|---|---|---|
| `status` | データの状態（有効・要確認・廃止） | バッチ自動 + 人間レビュー |
| `is_wanted` | 取得したいかどうかの意思 | 人間のみ |

---

## stock_price の保管と利回り計算方針

### 方針

- `stock_prices` テーブルを D1 に持ち、**毎日前日終値を UPSERT**
- `cross_target.yield_rate` は毎日バッチで再計算し、**閾値を超えた変化のときのみ UPDATE**
- API の一覧取得は `SELECT * FROM cross_target` のみで完結（リクエスト時に計算しない）

### yield_rate 更新の閾値ロジック

```
毎日バッチ:
  yield_rate を再計算
  ├─ |新 - 旧| < 閾値  → スキップ（D1 書き込みなし）
  └─ |新 - 旧| >= 閾値 → UPDATE
       └─ 変化が大きい場合（例: 相対変化 20% 以上）→ status = 'needs_review' に引き上げ
```

**閾値の案（確定は運用しながら調整）：**
- 軽微な変化（スキップ）: `|新 - 旧| < 0.5%`
- 通常更新: `0.5% <= |新 - 旧| < 相対20%`
- needs_review 引き上げ: `|新 - 旧| / 旧 >= 0.2`（20%相対変化）

**効果：**
- 株価の小幅な日々変動による無駄な書き込みを削減
- 意味のある変化のみ D1 に記録
- 大きな変化は人間のレビューを促す

```sql
CREATE TABLE IF NOT EXISTS stock_prices (
  ticker_code  TEXT    NOT NULL,
  price_date   TEXT    NOT NULL,  -- "2026-03-28"
  close_price  INTEGER NOT NULL,
  PRIMARY KEY (ticker_code, price_date)
);
```

### D1 無料枠に対する見解

**Cloudflare D1 Free tier 制限（アカウント全体）：**

| 項目 | 上限 |
|---|---|
| Rows read | 5,000,000 行/日 |
| Rows written | **100,000 行/日** |
| データベース数 | 10 |
| DB サイズ | 500 MB |
| ストレージ合計 | 5 GB |
| Worker 1回あたりのクエリ数 | 50 |

参照: https://developers.cloudflare.com/d1/platform/pricing/

**毎日のバッチ書き込み見積もり：**

| 処理 | 件数 |
|---|---|
| stock_prices UPSERT（全対象銘柄） | ~1,000件 |
| cross_target yield_rate UPDATE | ~数百件 |
| yuutai スクレイピング投入（R2、D1 書き込みなし） | 0件 |
| **合計** | **~1,500件/日** |

無料枠 100,000 行/日 の **約1.5%**。現在の規模では問題なし。

**将来的な注意点：**
- stock_prices は日付ごとに蓄積されるため、不要な過去データは定期的に削除が必要
- API リクエストによる読み取りも同じ枠を消費する（5,000,000 行/日 は余裕あり）
- 銘柄数・バッチ頻度が10倍規模になっても無料枠内に収まる見込み

---

## 未決事項

| 項目 | 内容 | 決定に必要な情報 |
|---|---|---|
| yuutai のストレージ | R2 vs D1（毎日20,000件書き込み vs 大容量JSON一覧問題）| プロトタイプ実測で判断 |
| 発注システムとのインターフェース | cross_target_history の自動取得範囲・フォーマット | 発注システム仕様確認 |
| 株価の取得元 | スクレイピング？証券 API？ | 取得方法の決定 |
| stock_prices の保持期間 | 何日分残すか（過去データ削除方針） | 運用要件の確認 |
| 変更検知バッチの実装場所 | Worker cron？外部バッチ？ | インフラ方針 |
| yuutai の年次管理 | 前年比・廃止履歴を残すか | 運用要件の確認 |
| broker_inventory | 各証券会社の貸株在庫（将来追加予定） | スクレイピング仕様確認 |
| フロントエンドの実装場所 | Cloudflare Pages？ | 別途検討 |

---

## データバックアップ・マイグレーション方針

### バックアップ

D1 のデータは `wrangler d1 export` でフルダンプ（SQL 形式）が取得できる。
cross_target は発注システムと連動する重要データのため、**スキーマ変更前・定期的に R2 へバックアップ**する。

```bash
# フルダンプ（SQL形式）
npx wrangler d1 export smbcnikko-db --remote --output=backup/cross_target_YYYYMMDD.sql

# テーブル単位でJSONとして取得
npx wrangler d1 execute smbcnikko-db --remote \
  --command="SELECT * FROM cross_target" \
  --json > backup/cross_target_YYYYMMDD.json
```

**バックアップ先：** R2（`backups/d1/YYYYMMDD/` 等）
**頻度：** スキーマ変更前は必須、定期バックアップは運用しながら決定

**コスト：**
- wrangler export は rows read を消費するが、数百〜数千件なら無料枠内
- R2 へのバックアップ保管コストは無料枠（10GB）内に収まる見込み

### スキーマ変更・マイグレーション

D1（SQLite）の制約：

| 操作 | 可否 |
|---|---|
| カラム追加（`ADD COLUMN`） | ✓ 可能 |
| カラム削除 | ✗ 不可 |
| カラムリネーム | ✗ 不可（SQLite制限） |
| 型変更 | ✗ 不可 |

**カラム削除・型変更が必要な場合の手順：**

```
1. wrangler d1 export でバックアップ取得
2. 新スキーマのテーブルを別名で作成
3. SELECT → INSERT で既存データをコピー・変換
4. 旧テーブル削除 → 新テーブルをリネーム
```

マイグレーションスクリプトは `schemas/migrations/` に連番で管理する。

```
schemas/migrations/
  001_add_benefit_summary_to_cross_target.sql
  002_rename_xxx.sql
```

### 現行 yuutai テーブルからの移行

- 現行 `yuutai` テーブル（D1）は仮設計のため**消失許容**
- `d1_schema.sh drop yuutai` で削除
- ストレージ方針（R2 vs D1）確定後に移行バッチを作成
- `stocks` テーブルを D1 に新規作成

## cross_target_history（クロス実績・優待受領管理）← D1

```sql
CREATE TABLE IF NOT EXISTS cross_target_history (

  -- [キー] record_date は cross_target と同フォーマット、record_year で年を区別
  user_id       TEXT    NOT NULL DEFAULT 'default',
  ticker_code   TEXT    NOT NULL,   -- → stocks.ticker_code
  record_date   TEXT    NOT NULL,   -- "03-XX", "03-20"（cross_target と統一）
  record_year   INTEGER NOT NULL,   -- 例: 2026
  shares        INTEGER NOT NULL,   -- 実際に取得した株数

  -- [発注システムから自動取得: クロス操作の日付]
  margin_sell_date   TEXT,  -- 信用売り建て日（金利発生開始）
  margin_buy_date    TEXT,  -- 信用買い建て日（通常は同日、金利発生開始）
  genbiki_date       TEXT,  -- 現引き日（信用買い→現物、買い金利終了・権利保有開始）
  kenri_kakutei_date TEXT,  -- 権利確定日（record_date から自動算出も可）
  genwatashi_date    TEXT,  -- 現渡し日（現物→信用売り充当、クロス解消）

  -- [発注システムから自動取得: 単価]
  margin_sell_price  INTEGER, -- 信用売り単価
  margin_buy_price   INTEGER, -- 信用買い単価

  -- [発注システムから自動取得: コスト内訳（確定後）]
  margin_interest_buy  INTEGER, -- 信用買い金利（売り建て〜現引き）
  margin_interest_sell INTEGER, -- 信用売り金利（売り建て〜現渡し）
  cost_fee           INTEGER, -- 手数料（信用買い＋信用売り＋現引き＋現渡し）
  cost_gyakuhifu     INTEGER, -- 逆日歩（制度信用のみ・権利日前後に確定）
  cost_meigishokan   INTEGER, -- 名義書換料
  cost_total         INTEGER, -- 上記合計

  -- [人間が記録: 優待受領のみ]
  benefit_received INTEGER, -- 実際に受け取った優待価値（円）
  received_date    TEXT,    -- 受領日
  benefit_note     TEXT,    -- メモ（商品名・数量等）

  -- [自動計算: 記録時に算出]
  actual_yield  REAL,  -- (benefit_received - cost_total) / (margin_buy_price × shares) × 100

  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),

  PRIMARY KEY (user_id, ticker_code, record_date, record_year)
);
```

**record_date フォーマットの統一：**
- `cross_target_plan` / `cross_target_market` / `cross_target_history` すべて `"03-XX"`, `"03-20"` で統一
- `cross_target_history` は `record_year` を別カラムで持つことで複数年の実績を区別
- JOIN は `record_date` で直接一致するため複雑な条件不要

**クロス操作のタイムライン：**

```
margin_sell_date / margin_buy_date（同日）
  ↓ 信用買い金利・信用売り金利 両方発生
genbiki_date（現引き）
  ↓ 信用買い金利終了、現物保有へ切り替え
  ↓ 信用売り金利は継続
kenri_kakutei_date（権利確定）
  ↓ 株主として記録
genwatashi_date（現渡し）
  ↓ 信用売り金利終了、クロス解消
```

**コスト計算：**
```
margin_interest_buy  = (genbiki_date - margin_buy_date)  × margin_buy_price  × shares × 買い金利率
margin_interest_sell = (genwatashi_date - margin_sell_date) × margin_sell_price × shares × 売り金利率
```

**cross_target との関係：**
- `cross_target` が完了したタイミングで `cross_target_history` に実績を記録
- `(ticker_code, record_date)` で JOIN して計画 vs 実績を比較できる

**実績フィードバックループ：**

```
cross_target_history の蓄積
  ↓
- 実コストが想定より高かった銘柄 → is_wanted=0 / unwanted_reason に記録
- 利回りが安定して高い銘柄    → 次期の shares_required・start_date を前倒し
- 優待品の満足度が低かった    → unwanted_reason に記録して除外
  ↓
cross_target 登録時の参考情報として活用
- 過去N期の平均実績利回り
- コスト実績の傾向（金利・手数料）
```

実績が蓄積されるほど計画精度が上がる設計。

---

---

## 設計サマリ

### 実現できること

**優待情報の管理・表示**
- スクレイピングで取得した優待情報を `(ticker_code, record_date, shares_required)` 単位で管理
- 銘柄マスタ（`stocks`）を分離し、銘柄名・市場情報を一元管理
- 月別・銘柄別での優待情報一覧をフロントエンドに提供

**利回り計算**
- 前日終値（`stock_prices`）と優待価値（`benefit_amount`）から利回りを自動計算
- 株価変化が閾値を超えたときのみ更新し、D1 書き込みコストを最小化
- `GET /cross-target/estimate` で `start_date` を変えながら実質利回りを試算できる

**クロス対象の計画管理**
- 1銘柄 × 権利日で複数の株数ティア（段階的取得）を管理
- 早期少量確保 → 権利日前に株数追加という段階的な確保計画を表現
- `is_wanted` で「利回りが出ても取得しない銘柄」を除外管理
- `status` で優待変更時の自動検知・レビューフローを実現

**発注システム連携**
- `start_date <= 今日` かつ `status='active'` かつ `is_wanted=1` の条件で発注対象を抽出
- 発注システムが保有株数を考慮して差分発注するため、cross_target は「目標株数と開始日」を持つだけでよい

**実績管理・フィードバックループ**
- クロス操作の全日付（売り建て・現引き・権利確定・現渡し）を記録
- コストを買い金利・売り金利・手数料・逆日歩・名義書換料に分解して記録
- 発注システムから自動取得、手動売買の場合は人間が入力（同じインターフェース）
- 実績利回りの蓄積により次期の計画精度が向上するフィードバックループを設計

**マルチユーザ対応**
- `cross_target_plan` / `cross_target_history` に `user_id` を持ち、将来のマルチユーザに備える
- 当面は `DEFAULT 'default'` でシングルユーザ運用
- システム自動更新データ（`cross_target_market`）はユーザ共有のため、バッチ更新コストがユーザ数に依存しない

### テーブル構成

| テーブル | ストレージ | 役割 |
|---|---|---|
| `stocks` | D1 | 銘柄マスタ |
| `yuutai` | R2 or D1（未決） | 優待情報（銘柄 × 権利日 × 株数ティア）|
| `stock_prices` | D1 | 前日終値（毎日 UPSERT）|
| `cross_target_plan` | D1 | ユーザの意思決定（計画・is_wanted）|
| `cross_target_market` | D1 | システム自動更新（利回り・優待情報・status）|
| `cross_target_history` | D1 | クロス実績・コスト・優待受領記録 |

### 未決事項

上記「未決事項」セクションを参照。

---

## タスク案（未登録）

1. **[feat] stocks テーブルを D1 に新規作成**
2. **[feat] yuutai データのストレージ方針確定**（R2 vs D1 をプロトタイプ実測で判断）
3. **[feat] yuutai API エンドポイントをストレージ方針に合わせて実装**
4. **[feat] cross_target テーブル設計・実装**（発注システム仕様確定後）
5. **[feat] yuutai 変更検知 → cross_target status 更新バッチ**
6. **[feat] stock_prices テーブル実装・毎日バッチ**
7. **[feat] cross_target_history テーブル実装**
8. **[feat] 優待情報フロントエンド**
