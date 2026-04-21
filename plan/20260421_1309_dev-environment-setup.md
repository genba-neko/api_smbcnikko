# 開発環境整備プラン

## 概要

Cloudflare Workers + Hono + D1 API プロジェクトの開発環境を整備する。
AI エージェント設定の適用を皮切りに、ローカル開発フローを確立する。

**関連 issue**: [#20 chore: 開発環境整備 (Cloudflare Workers API)](https://github.com/genba-neko/api_smbcnikko/issues/20)

---

## Issue 一覧

### issue #20-1: AI エージェント設定整備
- [完了 PR#20 2026-04-21] ← コミット 46e4956 で実施済み
- CLAUDE.md / AGENTS.md 最新化
- `.claude/settings.json` パーミッション設定追加
- `.gitignore` に `.work/` 追加

---

## ローカル開発環境 整理案

### 現状の問題

| 問題 | 詳細 |
|------|------|
| `wrangler.jsonc` が `"remote": true` 固定 | ローカル D1 (miniflare) で開発できない |
| セットアップ手順なし | 新規参入者・再セットアップ時に手順が不明確 |
| `package.json` に型チェック・lint スクリプトなし | `tsc --noEmit` / TypeScript 静的解析が走らない |
| ローカル D1 スキーマ初期化の手順が薄い | `tools/d1_schema.sh` は `TARGET=local` 対応しているが README に記載なし |
| `tsconfig.json` の有無不明 | 型チェック前提の設定が整備されているか不明 |

---

### 実装計画

#### Task 1: wrangler.jsonc 修正

`"remote": true` を外してデフォルトをローカル D1 (miniflare) に変更。

**変更前:**
```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "smbcnikko-db",
      "database_id": "51d19720-02b1-42d7-afcf-7126f7f7288f",
      "remote": true
    }
  ]
}
```

**変更後:**
```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "smbcnikko-db",
      "database_id": "51d19720-02b1-42d7-afcf-7126f7f7288f"
      // remote: true を外す → wrangler dev はローカル miniflare D1 を使用
      // リモートを使いたい場合は npm run dev:remote
    }
  ]
}
```

#### Task 2: package.json スクリプト追加

```json
"scripts": {
  "dev":        "wrangler dev",
  "dev:remote": "wrangler dev --remote",
  "deploy":     "wrangler deploy",
  "type-check": "tsc --noEmit",
  "lint":       "tsc --noEmit",
  "test":       "vitest run",
  "test:watch": "vitest"
}
```

#### Task 3: tsconfig.json 確認・追加

現在 tsconfig.json が存在するか確認。なければ Workers 向け設定で作成。

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### Task 4: セットアップスクリプト作成

workbench の `npm/setup-node.ps1` / `setup-node.sh` パターンを参考に、
`tools/setup/setup-cloudflare.ps1` / `tools/setup/setup-cloudflare.sh` を作成。

**スクリプトの処理内容:**

```
[1/3] Node.js / npm / wrangler 確認
[2/3] npm install
[3/3] ローカル D1 スキーマ初期化
      TARGET=local bash tools/d1_schema.sh recreate --all
```

**ファイル構成:**
```
tools/setup/
├── setup-cloudflare.ps1   # Windows (PowerShell)
├── setup-cloudflare.sh    # Linux / macOS / Git Bash
├── teardown-cloudflare.ps1
└── teardown-cloudflare.sh
```

teardown は `wrangler.sqlite` (ローカル D1 データ) を削除してクリーンな状態に戻す。

#### Task 5: README.md 更新

「Development」セクションを拡充。

```markdown
## Development

### セットアップ (初回 / 環境再構築)

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File tools/setup/setup-cloudflare.ps1
```

**Mac / Linux / Git Bash:**
```bash
bash tools/setup/setup-cloudflare.sh
```

### 開発サーバー起動

```bash
npm run dev          # ローカル D1 (miniflare) — 通常の開発
npm run dev:remote   # リモート D1 — 本番データ確認時
```

### テスト・型チェック

```bash
npm run test
npm run type-check
```
```

---

## 実装順序

```
Task 3 (tsconfig.json) → Task 1 (wrangler.jsonc) → Task 2 (package.json)
  → Task 4 (セットアップスクリプト) → Task 5 (README)
```

tsconfig.json が先行する理由: `type-check` スクリプト追加前に設定ファイルが必要。

---

## 参考

- workbench setup スクリプト: `C:\Users\g\OneDrive\devel\genba-neko@github\workbench\npm\`
- 既存 D1 スキーマツール: `tools/d1_schema.sh`
- wrangler ローカル D1 ドキュメント: https://developers.cloudflare.com/d1/local-development/
