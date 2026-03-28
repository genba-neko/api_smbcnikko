# プラン: SQL スキーマ整理

## 目的

ルート直下に散在していた SQL を `schemas/` 配下へ集約し、現行スキーマだけを明確に管理できる状態にする。

## 関連資料

- `README.md`
- `tools/setup/cloudflare/setup_d1_worker.md`

## タスク案

1. **[chore] `schemas/` ディレクトリへ現行 SQL を移動**
   - `webauthn-sign-count.sql` を `schemas/webauthn-sign-count.sql` へ移動
   - `yuutai.sql` を `schemas/yuutai.sql` へ移動

2. **[chore] 不要な旧 SQL を削除**
   - ルート直下の `schema.sql` を削除
   - `legacy_schema.sql` を削除（存在しなかったため不要）

3. **[docs] 構成ドキュメント更新**
   - `README.md` のフォルダ構成を実態に合わせる
   - セットアップ資料の SQL 配置説明を `schemas/` 基準へ更新する
   - `schemas/README.md` を追加し、現行 SQL の置き場を明記する

[完了 PR#(後で追記) 2026-03-29]

## 方針メモ

- D1 実行対象は `schemas/` 直下の SQL のみとする
- 実装とプランがずれた場合は、このファイルを先に更新する
