---
paths:
  - "**/*.test.{ts,tsx}"
  - "**/*.spec.{ts,tsx}"
  - "**/test/**/*.{ts,tsx}"
---

# テスト要件

## リポジトリテスト

**ルール**: すべてのリポジトリクラスはインメモリデータベースを使用したユニットテストを持つ必要があります。

```typescript
// db/repositories/repository.test.ts
describe('RepositoryRepository', () => {
  let db: BetterSQLite3Database;
  let repo: RepositoryRepository;

  beforeEach(() => {
    const sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema });

    // テスト用にテーブルを手動作成
    sqlite.exec(`
      CREATE TABLE repositories (
        id TEXT PRIMARY KEY,
        ...
      );
    `);

    repo = new RepositoryRepository(db);
  });

  afterEach(() => {
    sqlite.close();
  });

  it('should create and find repository', async () => {
    const created = await repo.create({ ... });
    const found = await repo.findById(created.id);
    expect(found).toEqual(created);
  });
});
```

## ユーティリティ関数テスト

**ルール**: 純粋なユーティリティ関数は実装と一緒にテストを配置する必要があります。

```
utils/
├── formatting.ts
├── formatting.test.ts      # 必須
├── status.tsx
└── status.test.ts          # 必須
```

## コンポーネントテスト

**推奨**（まだ必須ではありません）: 複雑なコンポーネントは`@testing-library/react`でテストします。

```typescript
// features/repositories/hooks/useRepositories.test.tsx
import { renderHook } from '@testing-library/react';

test('should fetch repositories on mount', async () => {
  const { result } = renderHook(() => useRepositories());
  expect(result.current.loading).toBe(true);
  // ...
});
```

## テストカバレッジ目標

**目標**（理想）:
- リポジトリクラス: 90%以上のカバレッジ
- ユーティリティ関数: 100%のカバレッジ
- フック: 80%以上のカバレッジ
- コンポーネント: 70%以上のカバレッジ

**現状**: 部分的なカバレッジ（リポジトリとユーティリティに一部テストあり）
