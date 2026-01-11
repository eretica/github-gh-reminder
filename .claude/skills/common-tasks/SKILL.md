---
name: common-tasks
description: Quick reference for frequently performed development tasks like building, testing, and debugging
---

# 一般的な開発タスク

頻繁に実行するタスクのクイックリファレンスです。

## 開発の開始

```bash
# 依存関係のインストール
pnpm install

# 開発サーバーの起動（ホットリロード付き）
pnpm dev

# 型チェック
pnpm typecheck

# テスト実行
pnpm test

# ウォッチモードでテスト実行
pnpm test --watch
```

## データベース操作

```bash
# スキーマ変更後のマイグレーション生成
pnpm db:generate

# Drizzle Studioでデータベースを表示
pnpm db:studio

# データベースを手動で検査
sqlite3 ~/Library/Application\ Support/github-pr-reminder/github-pr-reminder.db

# データベースの削除（開発環境のみ - マイグレーションテスト用）
rm ~/Library/Application\ Support/github-pr-reminder/github-pr-reminder.db
```

## ビルドと配布

```bash
# 本番用ビルド
pnpm build

# アプリのパッケージング
pnpm dist

# 特定プラットフォーム用のパッケージング
pnpm dist:mac
pnpm dist:win
pnpm dist:linux
```

## コード品質

```bash
# コードのLint
pnpm lint

# コードのフォーマット
pnpm format

# 型チェック
pnpm typecheck

# すべてのチェックを実行
pnpm lint && pnpm typecheck && pnpm test
```

## クイックフィックス

### アプリ状態のリセット
```bash
# プラットフォーム固有のパス
rm -rf ~/Library/Application\ Support/github-pr-reminder/  # macOS
rm -rf ~/.config/github-pr-reminder/                         # Linux
rmdir /s %APPDATA%\github-pr-reminder                       # Windows
```

### 一般的な修正パターン
- **データベースの問題** → DBを削除して再起動：`rm ~/Library/Application\ Support/github-pr-reminder/github-pr-reminder.db && pnpm dev`
- **ビルドの問題** → アーティファクトをクリーン：`rm -rf out/ dist/ && pnpm build`
- **依存関係の問題** → 再インストール：`rm -rf node_modules/ pnpm-lock.yaml && pnpm install`
- **型エラー** → 型チェック：`pnpm typecheck`

## Gitワークフロー

```bash
# フィーチャーブランチの作成
git checkout -b feature/my-feature

# 変更のコミット
git add .
git commit -m "feat: add my feature"

# リモートへのプッシュ
git push origin feature/my-feature

# PRの作成（gh CLIを使用）
gh pr create --title "Add my feature" --body "Description..."
```

## デバッグ

### メインプロセス

```bash
# デバッグを有効にして実行
pnpm dev --inspect

# VS Codeでデバッガをアタッチ（.vscode/launch.json参照）
```

### レンダラープロセス

```typescript
// DevToolsを自動的に開く（main/window.tsに追加）
if (process.env.NODE_ENV === 'development') {
  window.webContents.openDevTools();
}
```

### データベースクエリ

```typescript
// Drizzleクエリログを有効化（db/index.ts）
import { drizzle } from 'drizzle-orm/better-sqlite3';

const db = drizzle(sqlite, {
  schema,
  logger: true,  // ✅ クエリログを有効化
});
```

## 便利なコマンド

### TODOコメントの検索

```bash
rg "TODO|FIXME|XXX" src/
```

### 大きなファイルの検索

```bash
find src/ -type f -size +100k
```

### コード行数のカウント

```bash
cloc src/
```

### 未使用のインポートの検索

```bash
npx ts-prune
```

## 環境セットアップ

**必須ツール**：Node.js 18+、pnpm、Git

```bash
# クイックセットアップ
nvm use 18
npm install -g pnpm
pnpm install
```

**推奨VS Code拡張機能**：ESLint、Prettier、TypeScript、Tailwind CSS IntelliSense、Vitest Runner
