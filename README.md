# API SMBCC Nikko (Cloudflare Workers + Hono + D1)

Cloudflare Workers, Hono, および Cloudflare D1 を使用した API プロジェクトです。

## フォルダ構成と設計思想

本プロジェクトでは、将来的な拡張性とメンテナンス性を考慮し、責務ごとにディレクトリを分けたアーキテクチャを採用しています。

```text
src/
├── index.ts           # エントリーポイント。Honoの初期化とルートの集約
├── routes/            # APIエンドポイント定義（コントローラー層）
│   └── sign-count.ts  # 各リソースごとのルーティング
├── services/          # ビジネスロジック層
│   └── signCount.ts   # バリデーションや複雑なロジックを記述
├── repository/        # データアクセス層
│   └── signCount.ts   # D1(SQL)への直接アクセスをカプセル化
├── middleware/        # ミドルウェア
│   └── auth.ts        # 認証などの共通処理
└── types/             # 型定義
    └── env.ts         # Bindings (c.env) の型定義
```

### 各レイヤーの役割

1.  **Routes (コントローラー層)**:
    *   HTTPリクエストを受け取り、適切なサービスを呼び出し、HTTPレスポンスを返します。
    *   `app.route()` を使用することで、機能ごとにパスを分離して管理します。

2.  **Services (ビジネスロジック層)**:
    *   アプリケーションの「核」となるロジックを記述します。
    *   例えば、「新しい値が既存の値より大きいか確認する」といった判断はここで行います。
    *   Repository を呼び出してデータの保存・取得を行います。

3.  **Repository (データアクセス層)**:
    *   データベース（Cloudflare D1）へのアクセスのみを担当します。
    *   SQL文はこの層に集約され、他の層はSQLを意識せずにデータを操作できます。

4.  **Middleware**:
    *   認証（Bearer Auth）やロギングなど、複数のエンドポイントで共通して実行したい処理を記述します。

5.  **Types**:
    *   TypeScript の型定義を管理します。特に Workers の `Bindings`（環境変数やD1のバインディング）を一箇所で定義することで、プロジェクト全体で型安全を保ちます。

## 開発ガイドライン

### 新しいAPIを追加する場合
1.  `src/routes/` に新しいファイル（例：`users.ts`）を作成する。
2.  必要に応じて `src/services/` と `src/repository/` にロジックとDB操作を追加する。
3.  `src/index.ts` で `app.route('/users', users)` のように登録する。

### データベースの変更
1.  新しいテーブルを追加する場合は、`schema.sql` に定義を追記するか、D1のマイグレーション機能（`migrations/` フォルダ）を利用してください。

## テスト

本プロジェクトでは **Vitest** を使用してテストを実装しています。
レイヤーを分離しているため、データベース（D1）をモック化してビジネスロジックのみを高速にテストすることが可能です。

### テストの実行方法
```bash
npm run test
```

### テスト方針
- **Service 層のユニットテスト**: `src/services/*.test.ts`
  - データの整合性チェックやバリデーションロジックを検証します。
  - Repository をモック化することで、DBの状態に依存せず実行できます。
- **統合テスト (将来予定)**: `src/index.test.ts`
  - Hono の `app.request()` を使用し、認証からレスポンス返却までの一連の流れを検証します。

## セットアップとデプロイ

### ローカル開発
```bash
npm install
npm run dev
```

### デプロイ
```bash
npm run deploy
```
