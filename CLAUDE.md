# GitHub PR Reminder - プロジェクトガイド

このドキュメントはプロジェクトのアーキテクチャと開発哲学の概要を提供します。詳細な技術パターンは`.claude/rules/`ディレクトリに整理されています。

## プロジェクト概要

GitHub Pull Requestsを監視するトレイアプリケーション。以下の技術で構築：
- **Electron**: クロスプラットフォームデスクトップアプリケーション
- **React + TypeScript**: 型安全なUI
- **TailwindCSS**: ユーティリティファーストスタイリング
- **Drizzle ORM**: 型安全なデータベースレイヤー
- **Better-SQLite3**: ローカルデータベースストレージ

## アーキテクチャ

### Feature-Based + Repository Pattern ハイブリッド

```
src/
├── main/                  # Electron メインプロセス
│   ├── db/
│   │   ├── schema.ts      # データベーススキーマ
│   │   ├── migrations/    # 自動生成マイグレーション
│   │   └── repositories/  # リポジトリパターン（データアクセス層）
│   └── ipc.ts             # IPCハンドラー
├── renderer/              # React UI（Feature-based）
│   ├── features/          # 機能モジュール（自己完結型）
│   │   ├── pull-requests/
│   │   ├── repositories/
│   │   └── settings/
│   ├── components/ui/     # 共有UIコンポーネント
│   └── pages/             # ページコンポーネント
├── preload/               # セキュアなIPCブリッジ
└── shared/                # 共有型定義
```

## ⚠️ 重要事項

**作業完了前に必ず以下のコマンドを実行し、全て成功することを確認してから作業完了とすること:**

```bash
pnpm lint
pnpm typecheck
pnpm test
```


### 主要原則

1. **Feature Colocation**: 各機能は独自のコンポーネント、フック、ユーティリティを含む
2. **Repository Pattern**: すべてのデータベース操作はリポジトリクラスを経由
3. **Type Safety**: 共有型定義による全体的な強い型付け
4. **Security**: コンテキスト分離、nodeIntegrationなし
5. **Migration-First**: Drizzleマイグレーションによるスキーマ変更追跡

## 開発ワークフロー

### 新機能の追加

1. 機能ディレクトリを作成: `src/renderer/features/<feature-name>/`
2. コンポーネント、フック、ユーティリティを実装
3. `index.ts`経由でパブリックAPIをエクスポート
4. 実装と一緒にテストを配置
5. ページから機能のパブリックAPIをインポート

### データベースの変更

1. スキーマを変更: `src/main/db/schema.ts`
2. マイグレーションを生成: `pnpm db:generate`
3. リポジトリクラスを作成: `src/main/db/repositories/<entity>.ts`
4. IPCハンドラーで使用: `src/main/ipc.ts`

### テスト

- リポジトリテスト: インメモリデータベース
- ユーティリティテスト: 実装と一緒に配置
- コンポーネントテスト: `@testing-library/react`（インフラ準備後）

## Rules構成

技術パターンと規約は`.claude/rules/`に整理されています：

### アーキテクチャ＆構成
- `code-organization.md`: ファイル構造、インポート、命名規則（統合版）

### 技術固有パターン
- `electron-patterns.md`: IPC、プロセス分離、セキュリティ
- `react-patterns.md`: コンポーネント構成、カスタムフック、パフォーマンス
- `tailwindcss-patterns.md`: ユーティリティファーストスタイリング、レスポンシブデザイン
- `typescript-patterns.md`: 型安全性、共有型
- `drizzle-patterns.md`: データベーススキーマ、クエリ、マイグレーション

### 開発プラクティス
- `database-operations.md`: リポジトリパターン、マイグレーション
- `testing-requirements.md`: テストカバレッジ、テスト戦略
- `error-handling.md`: エラーメッセージ、伝播、非同期エラー
- `security.md`: 入力検証、秘密情報、XSS、インジェクション防止（グローバル）

## Rules vs Skills

プロジェクトには2種類のガイダンスシステムがあります：

### Rules（`.claude/rules/`）
- **目的**: 技術パターンとベストプラクティスの自動適用
- **ロード**: 該当パスのファイル作業時に自動ロード
- **用途**: 「この種類のファイルを編集する時は常にこのパターンに従う」
- **例**: `electron-patterns.md`, `react-patterns.md`, `security.md`
- **形式**: Markdownファイル（`.md`）、YAMLフロントマターで`paths`を定義

### Skills（`.claude/skills/`）
- **目的**: タスク実行時の対話的ガイド
- **呼び出し**: `/adding-features`等のコマンドで明示的に呼び出し
- **用途**: 「特定のタスクを実行する時に参照するステップバイステップガイド」
- **例**: `adding-features`, `common-tasks`, `debugging-ipc`
- **形式**: ディレクトリ（`/`）、内部に`SKILL.md`

### 利用可能なSkills

- `/adding-features`: 新機能追加のステップバイステップガイド
- `/adding-database-tables`: データベーステーブル追加ガイド
- `/common-tasks`: 開発タスクのクイックリファレンス
- `/debugging-ipc`: IPCデバッグガイド

## クイックリファレンス

一般的な開発タスクとコマンドについては以下を使用：
```
/common-tasks
```

### 主要ファイル
- `src/shared/types.ts`: 共有型定義
- `src/main/db/schema.ts`: データベーススキーマ
- `src/main/ipc.ts`: IPCハンドラー登録
- `src/preload/index.ts`: セキュアなIPCブリッジ

## コントリビューション

大きな変更を行う場合：
1. `.claude/rules/`に文書化されたパターンに従う
2. 新機能にテストを追加
3. パターンが変更された場合は関連するルールを更新
4. コミットメッセージに学んだ教訓を文書化

