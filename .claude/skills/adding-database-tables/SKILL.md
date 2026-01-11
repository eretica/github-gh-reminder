---
name: adding-database-tables
description: Guide for creating database tables with Drizzle ORM migrations and repository pattern
---

# 新しいデータベーステーブルの追加

このガイドは、マイグレーションとリポジトリパターンを使用して新しいデータベーステーブルを追加するためのステップバイステップの手順を提供します。

## 前提条件

- Drizzle ORMの理解
- リポジトリパターンの理解（CLAUDE.md § 2と§ 12.3参照）

## ステップバイステップガイド

### 1. スキーマの定義

`src/main/db/schema.ts`にテーブル定義を追加します：

```typescript
// src/main/db/schema.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const features = sqliteTable('features', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  enabled: integer('enabled').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  // オプション：頻繁にクエリされるカラムにインデックスを追加
  enabledIdx: index('features_enabled_idx').on(table.enabled),
}));

// 型のエクスポート
export type FeatureRecord = typeof features.$inferSelect;
export type NewFeature = typeof features.$inferInsert;
```

### 2. マイグレーションの生成

```bash
pnpm db:generate
```

これにより、`src/main/db/migrations/`に新しいマイグレーションファイルが作成されます。

**生成されたSQLの検証**：
```bash
cat src/main/db/migrations/00XX_*.sql
```

### 3. リポジトリクラスの作成

`src/main/db/repositories/feature.ts`を作成します：

```typescript
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { Feature } from '../../../shared/types';
import * as schema from '../schema';

export class FeatureRepository {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  async findAll(): Promise<Feature[]> {
    const records = await this.db
      .select()
      .from(schema.features);

    return records.map(this.toModel);
  }

  async findById(id: string): Promise<Feature | null> {
    const records = await this.db
      .select()
      .from(schema.features)
      .where(eq(schema.features.id, id));

    return records.length > 0 ? this.toModel(records[0]) : null;
  }

  async create(data: Omit<Feature, 'id' | 'createdAt' | 'updatedAt'>): Promise<Feature> {
    const now = new Date().toISOString();
    const newRecord: schema.NewFeature = {
      id: uuidv4(),
      name: data.name,
      enabled: data.enabled ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(schema.features).values(newRecord);
    return this.toModel({ ...newRecord, enabled: newRecord.enabled });
  }

  async update(id: string, data: Partial<Feature>): Promise<Feature> {
    const now = new Date().toISOString();
    const updateData: Partial<schema.NewFeature> = {
      ...data,
      enabled: data.enabled !== undefined ? (data.enabled ? 1 : 0) : undefined,
      updatedAt: now,
    };

    await this.db
      .update(schema.features)
      .set(updateData)
      .where(eq(schema.features.id, id));

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Feature ${id} not found after update`);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(schema.features)
      .where(eq(schema.features.id, id));
  }

  // データベースレコードをアプリケーションモデルに変換
  private toModel(record: schema.FeatureRecord): Feature {
    return {
      id: record.id,
      name: record.name,
      enabled: record.enabled === 1,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
```

### 4. リポジトリのエクスポート

`src/main/db/repositories/index.ts`に追加します：

```typescript
export { FeatureRepository } from './feature';
```

### 5. リポジトリテストの作成

`src/main/db/repositories/feature.test.ts`を作成します：

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { FeatureRepository } from './feature';
import * as schema from '../schema';

describe('FeatureRepository', () => {
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let sqlite: Database.Database;
  let repo: FeatureRepository;

  beforeEach(() => {
    sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema });

    // テスト用にテーブルを手動作成
    sqlite.exec(`
      CREATE TABLE features (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    repo = new FeatureRepository(db);
  });

  afterEach(() => {
    sqlite.close();
  });

  it('should create and find feature', async () => {
    const created = await repo.create({
      name: 'test-feature',
      enabled: true,
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('test-feature');
    expect(created.enabled).toBe(true);

    const found = await repo.findById(created.id);
    expect(found).toEqual(created);
  });

  it('should update feature', async () => {
    const created = await repo.create({
      name: 'test-feature',
      enabled: true,
    });

    const updated = await repo.update(created.id, { enabled: false });
    expect(updated.enabled).toBe(false);
    expect(updated.name).toBe('test-feature');
  });

  it('should delete feature', async () => {
    const created = await repo.create({
      name: 'test-feature',
      enabled: true,
    });

    await repo.delete(created.id);

    const found = await repo.findById(created.id);
    expect(found).toBeNull();
  });

  it('should find all features', async () => {
    await repo.create({ name: 'feature-1', enabled: true });
    await repo.create({ name: 'feature-2', enabled: false });

    const all = await repo.findAll();
    expect(all).toHaveLength(2);
  });
});
```

### 6. IPCハンドラの追加

`src/main/ipc.ts`を更新してリポジトリを使用します：

```typescript
import { FeatureRepository } from './db/repositories/feature';

export function setupIpcHandlers(): void {
  const db = getDatabase();

  // フィーチャーハンドラ
  ipcMain.handle(IPC_CHANNELS.FEATURE_LIST, async (): Promise<Feature[]> => {
    const repo = new FeatureRepository(db);
    return await repo.findAll();
  });

  ipcMain.handle(
    IPC_CHANNELS.FEATURE_ADD,
    async (_event, data: Partial<Feature>): Promise<Feature> => {
      const repo = new FeatureRepository(db);
      return await repo.create(data);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.FEATURE_UPDATE,
    async (_event, id: string, data: Partial<Feature>): Promise<Feature> => {
      const repo = new FeatureRepository(db);
      return await repo.update(id, data);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.FEATURE_DELETE,
    async (_event, id: string): Promise<void> => {
      const repo = new FeatureRepository(db);
      await repo.delete(id);
    }
  );
}
```

### 7. 検証

```bash
# テスト実行
pnpm test src/main/db/repositories/feature.test.ts

# マイグレーションチェック
pnpm db:generate  # "No schema changes"と表示されるはず

# アプリ実行（マイグレーションは自動実行される）
pnpm dev

# オプション：Drizzle Studioでデータベースを表示
pnpm db:studio
```

## 一般的なパターン

### 外部キー

```typescript
export const childTable = sqliteTable('child_table', {
  id: text('id').primaryKey(),
  parentId: text('parent_id').notNull().references(() => parentTable.id),
  // ...
});
```

### JSONカラム

```typescript
export const tableWithJson = sqliteTable('table_with_json', {
  id: text('id').primaryKey(),
  metadata: text('metadata').notNull(),  // JSONをテキストとして保存
});

// リポジトリ内：
async create(data: Entity): Promise<Entity> {
  await this.db.insert(schema.tableWithJson).values({
    metadata: JSON.stringify(data.metadata),
  });
}

private toModel(record: Record): Entity {
  return {
    ...record,
    metadata: JSON.parse(record.metadata),
  };
}
```

### タイムスタンプ

常に`created_at`と`updated_at`を含めます：

```typescript
export const entities = sqliteTable('entities', {
  id: text('id').primaryKey(),
  // ... その他のフィールド
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
```

## チェックリスト

- [ ] `db/schema.ts`でスキーマを定義し、型をエクスポートした
- [ ] マイグレーションを生成した（`pnpm db:generate`）
- [ ] マイグレーションSQLを検証した
- [ ] CRUDメソッドを持つリポジトリクラスを作成した
- [ ] `repositories/index.ts`からリポジトリをエクスポートした
- [ ] リポジトリテストを作成し、合格した
- [ ] リポジトリを使用するようIPCハンドラを更新した
- [ ] 新しいテーブルでアプリが正常に実行される
- [ ] Drizzle Studioでデータベースを検証した（オプション）
