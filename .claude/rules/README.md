# Rules ディレクトリ

このディレクトリには、Claude Code のためのパススコープ付きプロジェクト指示が含まれています。各ルールファイルは、一致するファイルパスで作業する際に自動的にロードされます。

## Rules とは？

Rules は **パスフィルタリングされたプロジェクトメモリ** を提供するMarkdownファイルです。以下の特徴があります：
- ファイルパスに基づいてセッション開始時に自動ロード
- 高優先度のコンテキストを提供（CLAUDE.md と同様）
- フィルタリングのために YAML frontmatter の `paths` フィールドを使用
- 関連する指示のみをロードすることでコンテキストの肥大化を防止

## Rules vs Skills

プロジェクトには2種類のガイダンスシステムがあります：

### Rules（`.claude/rules/`）- このディレクトリ
- **目的**: 技術パターンとベストプラクティスの自動適用
- **ロード**: 該当パスのファイル作業時に自動ロード（パススコープフィルタリング）
- **用途**: 「この種類のファイルを編集する時は常にこのパターンに従う」
- **形式**: Markdownファイル（`.md`）、YAMLフロントマターで`paths`を定義
- **例**: `electron-patterns.md`（`src/main/**`で自動ロード）

### Skills（`.claude/skills/`）- 別ディレクトリ
- **目的**: タスク実行時の対話的ガイド
- **呼び出し**: `/adding-features`等のコマンドで明示的に呼び出し
- **用途**: 「特定のタスクを実行する時に参照するステップバイステップガイド」
- **形式**: ディレクトリ（`.skill/`）、内部に`SKILL.md`
- **例**: `adding-features.skill`（`/adding-features`で呼び出し）

### 判断基準

新しいガイダンスを作成する時：

| 条件 | 配置先 |
|------|--------|
| 特定のファイルタイプを編集する時に常に従うパターン | **Rules** |
| 技術スタック固有のベストプラクティス | **Rules** |
| パススコープで自動ロードさせたい | **Rules** |
| タスク実行時に参照するステップバイステップガイド | **Skills** |
| ユーザーが明示的に呼び出すワークフロー | **Skills** |
| 手順が複雑でチェックリスト形式が適切 | **Skills** |

### 利用可能なSkills

- `/adding-features`: 新機能追加のステップバイステップガイド
- `/adding-database-tables`: データベーステーブル追加ガイド
- `/common-tasks`: 開発タスクのクイックリファレンス
- `/debugging-ipc`: IPCデバッグガイド

詳細は`CLAUDE.md`の「Rules vs Skills」セクションを参照してください。

## ファイル構成

### アーキテクチャと構成
| ファイル | スコープ | 目的 |
|------|-------|---------|
| `code-organization.md` | `src/**/*.{ts,tsx,js,jsx}` | ファイル構造、import、命名規則（統合版） |

### 技術固有のパターン
| ファイル | スコープ | 目的 |
|------|-------|---------|
| `electron-patterns.md` | `src/main/**`, `src/preload/**` | IPC、プロセス分離、セキュリティ |
| `react-patterns.md` | `src/renderer/**/*.{ts,tsx}` | コンポーネント構成、フック、パフォーマンス |
| `tailwindcss-patterns.md` | `src/renderer/**/*.{ts,tsx}`, configs | ユーティリティファーストスタイリング、レスポンシブデザイン |
| `typescript-patterns.md` | `**/*.{ts,tsx}`, `tsconfig.json` | 型安全性、共有型 |
| `drizzle-patterns.md` | `src/main/db/**`, `drizzle.config.ts` | データベーススキーマ、クエリ、マイグレーション |

### 開発プラクティス
| ファイル | スコープ | 目的 |
|------|-------|---------|
| `database-operations.md` | `src/main/db/**`, repositories, IPC | リポジトリパターン、マイグレーション |
| `testing-requirements.md` | `**/*.test.{ts,tsx}`, test directories | テストカバレッジ、テスト戦略 |
| `error-handling.md` | `src/**/*.{ts,tsx}` | エラーメッセージ、伝播、境界 |
| `security.md` | **グローバル（全ファイル）** | 入力検証、シークレット管理、XSS、インジェクション防止 |

## Frontmatter 構文

### 基本構造
```yaml
---
paths:
  - "src/**/*.ts"
  - "**/*.config.js"
---

# Rule Title

Content goes here...
```

### 重要な構文ルール
1. **globパターンをクォートする** `*` または `{` で始まる場合:
   ```yaml
   # ✅ 正しい
   paths:
     - "**/*.ts"

   # ❌ 間違い（YAMLがエラーになる）
   paths:
     - **/*.ts
   ```

2. **グローバルルールではfrontmatterを省略** - frontmatterのないルールはすべての場所に適用される

3. **配列構文を使用**:
   ```yaml
   paths:
     - "pattern1"
     - "pattern2"
   ```

### よく使うGlobパターン
- `"**/*.ts"` - プロジェクト全体のすべてのTypeScriptファイル
- `"src/main/**/*.ts"` - src/mainとそのサブディレクトリ内のすべてのTypeScript
- `"**/*.test.ts"` - 任意のディレクトリ内のテストファイル
- `"src/{api,utils}/**/*.ts"` - 複数のディレクトリ

## 新しいルールの追加

1. **新しい `.md` ファイルを作成** このディレクトリ内に
2. **YAML frontmatter を追加** 適切なパスを指定して
3. **ルールを文書化** Markdownを使用して
4. **この README を更新** 新しいルールをリストに追加

### 例
```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API Patterns

## Rule Name

**Rule**: Description of the rule

```typescript
// ✅ Good example
code here

// ❌ Bad example
code here
```
```

## ベストプラクティス

### 新しいルールを作成する場合
- ドメイン固有のパターン（API、データベース、UI）
- 技術固有のガイダンス（React、TypeScript）
- コンテキスト依存の要件（テスト、セキュリティ）

### CLAUDE.md に残す場合
- 普遍的な運用ワークフロー
- グローバルなコーディング規約
- プロジェクト全体のアーキテクチャ原則

### ルールは焦点を絞る
- 1ファイルにつき1つの関心事
- 明確で実行可能な例
- 他のルールとの重複を避ける

## 既知の問題

**パススコープのバグ**: 2026年1月現在、パススコープ付きルールは、作業ディレクトリに関係なく、セッション開始時にグローバルにロードされる可能性があります。現在のバージョンでは、パスフィルタリングがルールのロードを完全に防げない可能性があることに注意してください。
