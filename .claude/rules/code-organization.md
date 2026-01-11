---
paths:
  - "src/**/*.{ts,tsx,js,jsx}"
---

# コード構成パターン

このルールは、一貫したコード構造のためのファイル構成、インポートパターン、命名規則を統合します。

## ファイル構成

### 機能モジュール構造

**ルール**: 各機能は独自のディレクトリ内で自己完結していなければなりません。

```
features/<feature-name>/
├── components/        # 必須: 機能固有のコンポーネント
├── hooks/             # オプション: 機能固有のフック
├── utils/             # オプション: 機能固有のユーティリティ
└── index.ts           # 必須: パブリックAPI
```

**根拠**: 完全なコロケーションにより、機能が独立してテスト可能になります。

### コンポーネントファイル

**ルール**: 各コンポーネントは独自のファイルを持ちます。

```
✅ 良い例:
components/
├── PullRequestItem.tsx
├── PullRequestList.tsx
└── PullRequestList.test.tsx

❌ 悪い例:
components/
└── PullRequests.tsx  # 1つのファイルに複数のコンポーネント
```

### テストファイル

**ルール**: テストは実装と一緒に配置しなければなりません。

```
✅ 良い例:
utils/
├── formatting.ts
├── formatting.test.ts
├── status.tsx
└── status.test.ts

❌ 悪い例:
utils/
├── formatting.ts
└── status.tsx
__tests__/
├── formatting.test.ts
└── status.test.ts
```

### インデックスファイル

**ルール**: 機能ディレクトリは`index.ts`経由でパブリックAPIをエクスポートしなければなりません。

```typescript
// features/pull-requests/index.ts
export { PullRequestList } from './components/PullRequestList';
export { PullRequestItem } from './components/PullRequestItem';
export { usePullRequests } from './hooks/usePullRequests';
export * from './utils/constants';
```

**根拠**: 明確なパブリックAPIにより、内部実装の漏洩を防ぎます。

### データベースリポジトリ

**ルール**: エンティティ/テーブルごとに1つのリポジトリクラス。

```
✅ 良い例:
db/repositories/
├── repository.ts      # RepositoryRepository
├── pullRequest.ts     # PullRequestRepository
├── settings.ts        # SettingsRepository
└── index.ts           # すべてをエクスポート

❌ 悪い例:
db/
└── repositories.ts    # すべてのリポジトリが1つのファイル
```

## インポートパターン

### 機能のインポート

**ルール**: 常に機能のパブリックAPI（`index.ts`）からインポートし、内部ファイルから直接インポートしない。

```typescript
// ✅ 良い例: パブリックAPIからインポート
import { PullRequestList, usePullRequests } from '../features/pull-requests';

// ❌ 悪い例: 内部実装をインポート
import { PullRequestList } from '../features/pull-requests/components/PullRequestList';
import { usePullRequests } from '../features/pull-requests/hooks/usePullRequests';
```

### 共有UIのインポート

**ルール**: 共有UIコンポーネントは`components/ui/`からインポート。

```typescript
// ✅ 良い例: uiディレクトリからインポート
import { Tabs, Toast } from '../components/ui';

// ❌ 悪い例: 直接ファイルをインポート
import { Tabs } from '../components/ui/Tabs';
```

### リポジトリのインポート

**ルール**: IPCハンドラーはリポジトリクラスを使用しなければならず、直接データベースクエリを使用してはいけません。

```typescript
// ✅ 良い例: リポジトリを使用
import { RepositoryRepository } from './db/repositories/repository';

ipcMain.handle('repo:list', async () => {
  const repo = new RepositoryRepository(getDatabase());
  return await repo.findAll();
});

// ❌ 悪い例: 直接クエリ
import * as schema from './db/schema';

ipcMain.handle('repo:list', async () => {
  return await db.select().from(schema.repositories);
});
```

### 型のインポート

**ルール**: プロセス間通信には`src/shared/types.ts`の共有型を使用。

```typescript
// ✅ 良い例: 共有型
import type { Repository, PullRequest } from '../../shared/types';

// ❌ 悪い例: 型定義を重複
interface Repository { ... }  // 再定義しない
```

### インポート順序

**慣例**（強制ではないが推奨）:

```typescript
// 1. Nodeビルトイン
import { join } from 'node:path';

// 2. 外部依存関係
import { app, ipcMain } from 'electron';
import { eq } from 'drizzle-orm';

// 3. 内部モジュール
import { RepositoryRepository } from './db/repositories/repository';
import type { Repository } from '../shared/types';

// 4. 相対インポート
import { getDatabase } from './db';
```

## 命名規則

### ファイル名

#### コンポーネント
- **Reactコンポーネント**: PascalCaseで`.tsx`拡張子
  - ✅ `PullRequestItem.tsx`, `RepositoryList.tsx`
  - ❌ `pullRequestItem.tsx`, `repository-list.tsx`

#### フック
- **カスタムフック**: `use`で始まるcamelCase
  - ✅ `useRepositories.ts`, `usePullRequests.ts`
  - ❌ `UseRepositories.ts`, `repositories-hook.ts`

#### ユーティリティ
- **ユーティリティファイル**: camelCaseまたは説明的な名前
  - ✅ `formatting.ts`, `status.tsx`, `constants.ts`
  - ❌ `Formatting.ts`, `STATUS.ts`

#### テスト
- **テストファイル**: 実装と同じ名前 + `.test.ts(x)`
  - ✅ `formatting.test.ts`, `useRepositories.test.tsx`
  - ❌ `formatting.spec.ts`, `test-formatting.ts`

### 変数名

#### Reactコンポーネント
```typescript
// ✅ コンポーネント名: PascalCase
export function PullRequestItem({ pullRequest }: Props) { ... }

// ✅ Props interface: ComponentName + "Props"
interface PullRequestItemProps { ... }
```

#### リポジトリクラス
```typescript
// ✅ クラス名: Entity + "Repository"
export class RepositoryRepository { ... }
export class PullRequestRepository { ... }

// ✅ インスタンス変数: entityRepo
const repositoryRepo = new RepositoryRepository(db);
const prRepo = new PullRequestRepository(db);
```

#### データベーススキーマ
```typescript
// ✅ テーブル名: 複数形のsnake_case
export const repositories = sqliteTable('repositories', { ... });
export const pull_requests = sqliteTable('pull_requests', { ... });

// ✅ カラム名: snake_case
id: text('id').primaryKey(),
created_at: text('created_at').notNull(),
```

#### 定数
```typescript
// ✅ 定数: UPPER_SNAKE_CASE
export const CHECK_INTERVAL_OPTIONS = [5, 10, 15, 30, 60];
export const CI_STATUS = { ... };

// ✅ Enum風オブジェクト: PascalCaseキー
export const REVIEW_DECISION = {
  Approved: 'APPROVED',
  ChangesRequested: 'CHANGES_REQUESTED',
  // ...
};
```

### ディレクトリ名

- **機能ディレクトリ**: kebab-case
  - ✅ `pull-requests/`, `repositories/`, `settings/`
  - ❌ `pullRequests/`, `Repositories/`

- **サブディレクトリ**: 小文字
  - ✅ `components/`, `hooks/`, `utils/`
  - ❌ `Components/`, `Hooks/`
