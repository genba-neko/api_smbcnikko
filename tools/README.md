# Tools

このディレクトリには、DB管理やデータメンテナンスのための補助スクリプトを格納します。

## 株主優待データのインポート (`import_yuutai.js`)

`data/yuutai/yuutai_all.json` のデータを D1 データベースの `yuutai` テーブルに一括投入するための SQL を生成します。

### 使い方

1. **SQL ファイルの生成**
   ```bash
   node tools/import_yuutai.js
   ```
   実行すると `data/yuutai/import.sql` が生成されます。

2. **D1 への反映 (リモート)**
   ```bash
   npx wrangler d1 execute smbcnikko-db --remote --file=data/yuutai/import.sql
   ```

3. **D1 への反映 (ローカル開発環境)**
   ```bash
   npx wrangler d1 execute smbcnikko-db --local --file=data/yuutai/import.sql
   ```

### 注意事項
- スクリプト実行時に `DELETE FROM yuutai;` が発行されるため、テーブルの内容は毎回リフレッシュされます。
- `is_continuation` (boolean) は DB 上で `0/1` (integer) に変換して格納されます。
