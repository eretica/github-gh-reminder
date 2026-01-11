---
paths:
  - "src/main/db/**/*.ts"
  - "drizzle.config.ts"
---

# Drizzle ORM パターン

## スキーマ設計

**ルール**: 適切な型と制約を使用する

```typescript
// ✅ Good: Use proper types and constraints
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ❌ Bad: Missing constraints and types
export const users = sqliteTable('users', {
  id: text('id'),
  name: text('name'),
  email: text('email'),
});
```

## データベース初期化

**ルール**: Mainプロセスでエラーハンドリングとマイグレーションを含めてDBを初期化する

```typescript
// ✅ Good: Initialize with error handling
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

export function initDatabase(dbPath: string) {
  try {
    const sqlite = new Database(dbPath);
    const db = drizzle(sqlite);
    return db;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// 本番アプリでスキーマ変更がある場合はマイグレーションを使用:
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

export function initDatabaseWithMigrations(dbPath: string) {
  try {
    const sqlite = new Database(dbPath);
    const db = drizzle(sqlite);

    // スキーマバージョニングのためにマイグレーションを実行
    migrate(db, { migrationsFolder: './drizzle' });

    return db;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// ❌ Bad: No error handling
const sqlite = new Database('db.sqlite');
const db = drizzle(sqlite);
```

## クエリパターン

**ルール**: 適切なフィルタリングを含む型付きクエリを使用する

```typescript
// ✅ Good: Use typed queries with proper error handling
async function getActiveRepositories() {
  try {
    return await db
      .select()
      .from(repositories)
      .where(eq(repositories.enabled, 1))
      .orderBy(repositories.order);
  } catch (error) {
    console.error('Failed to fetch repositories:', error);
    return [];
  }
}

// ❌ Bad: Raw SQL strings without types
async function getActiveRepositories() {
  return db.all('SELECT * FROM repositories WHERE enabled = 1');
}
```

## クエリ最適化

**ルール**: メモリ内フィルタリングではなくデータベースレベルのフィルタリングを使用する

```typescript
// ✅ Good: Use typed queries with proper filtering
const activeRepos = await db
  .select()
  .from(repositories)
  .where(eq(repositories.enabled, 1))
  .orderBy(repositories.order)
  .limit(100);

// ❌ Bad: Fetch all data then filter in memory
const allRepos = await db.select().from(repositories);
const activeRepos = allRepos.filter(r => r.enabled === 1);
```

**注意**: 頻繁にクエリされるカラムには、インデックスの追加を検討してください:
```typescript
export const repositories = sqliteTable('repositories', {
  id: text('id').primaryKey(),
  enabled: integer('enabled').notNull(),
  order: integer('order').notNull(),
}, (table) => ({
  enabledIdx: index('enabled_idx').on(table.enabled),
  orderIdx: index('order_idx').on(table.order),
}));
```

## マイグレーションワークフロー

**ルール**: スキーマ変更は必ずマイグレーション経由で行う

```bash
# 1. スキーマを修正 (src/main/db/schema.ts)
export const newTable = sqliteTable('new_table', { ... });

# 2. マイグレーションを生成
pnpm db:generate

# 3. マイグレーションはアプリ起動時に自動実行される (db/index.ts経由)
migrate(db, { migrationsFolder });
```

**絶対にしない**: マイグレーションファイルの手動編集や、直接SQLの`CREATE TABLE`を使用すること。
