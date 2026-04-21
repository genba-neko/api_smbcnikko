# Environment Rules (Codex-specific)

- OS: Windows / Shell: PowerShell
- コミットメッセージ・`.work` ドキュメント・説明文: 日本語

## Encoding (CRITICAL)

- 全ファイル UTF-8 (No BOM)。Shift-JIS/UTF-16LE 禁止
- PowerShell I/O コマンドは必ず `-Encoding UTF8` を付加
  - Good: `Set-Content -Path ./file.txt -Value $data -Encoding UTF8`
  - Bad: `Set-Content -Path ./file.txt -Value $data`
- スクリプト実行前にコンソールエンコーディング初期化:
  ```powershell
  [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
  [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
  $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
  chcp 65001 > $null
  ```

## Python 環境

- 仮想環境の Python を直接使用。グローバル `python` 禁止
  - Good: `.\.venv-win\Scripts\python.exe script.py`
  - Bad: `python script.py`

## Git / Hook

- Codex サンドボックスでは Git for Windows `sh.exe` が `Win32 error 5` で失敗することがある
- `git commit` / `.git/hooks/*` を伴う操作はエスカレーション要求を優先

---

## コマンド

Windows 仮想環境 `.venv-win`。pytest はプロジェクトルートから実行（`pyproject.toml` で `pythonpath=["src"]` 設定済）。

```bash
# format check / fix
.venv-win/Scripts/python.exe -m ruff format --check .
.venv-win/Scripts/python.exe -m ruff format .
# lint
.venv-win/Scripts/python.exe -m ruff check .
# type check
.venv-win/Scripts/python.exe -m pyright
# ユニットテスト + カバレッジ
.venv-win/Scripts/python.exe -m pytest -k "unit" --cov --cov-report=term-missing
# 単一ファイル
.venv-win/Scripts/python.exe -m pytest tests/test_list_margin_trade_unit.py
# 統合テスト（実サイト・WebAuthn セッション必須）
.venv-win/Scripts/python.exe -m pytest tests/test_list_spot_stock_integration.py -s
# spider 実行（scrapy.cfg が src/ にあるため cd 必要）
cd src && ../.venv-win/Scripts/python.exe -m scrapy crawl order_margin_trade
```

アーキテクチャ詳細: [ARCHITECTURE.md](ARCHITECTURE.md)

## プロジェクトルール

### プラン作成

- 保存先: `plan/YYYYMMDD_HHMM_概要.md`（時刻: `date +%Y%m%d_%H%M`）
- 開始時: 【プラン作成モード開始】を応答

### issue 登録

- ユーザー価値・機能単位で分割。細かい準備/docs 追従は本体 issue に吸収
- issue 本文に「関連資料」セクションで `plan/` ファイルへリンク
- ラベル: `feat` / `fix` / `refactor` / `test` / `chore` / `docs`

### 実装フロー

1. ブランチ名提案 → 決定: 人間
2. 設計・実装・レビュー・テスト
3. **プラン完了マーク**: コミット前に `plan/` 該当 issue へ `[完了 PR#XX YYYY-MM-DD]` 追記
4. コミット・マージ: 人間判断

- プラン議論中は実装着手しない（コード diff・新規ファイル生成禁止）
- 実装フェーズはユーザー明示指示後のみ開始
- `commit` / `push` / `merge` / `rebase` / PR 作成はユーザー明示指示まで実行しない
- 実装完了後: push → PR → master マージ → `git pull`
- **プランと実態が乖離したら即時 `plan/` 更新（確認不要）**
- PR 未作成のまま merge 禁止
- squash merge 禁止（merge commit を使う）
- **他エージェントへの依頼は人間の明示指示時のみ**

### ブランチ命名

`feature/[issue番号]_[概要]` / `fix/[issue番号]_[概要]`

### コミット規則

Conventional Commits: `feat:` / `fix:` / `chore:` など。

### 破壊的操作の鉄則

削除・上書き・切り捨てを含む設計はコード前に人間へ危険性を説明し、安全側を提案。

1. **事前説明**: 消失リスクに気づいたらコード前に伝える
2. **安全側に倒す**: 削除より移動・アーカイブ。上書き前にバックアップ。`-Force` より `-WhatIf`
3. **2ステップ順序保証**: 保存成功しない限り削除しない設計
