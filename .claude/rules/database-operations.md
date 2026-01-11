---
paths:
  - "src/main/db/**/*.ts"
  - "**/*.repository.ts"
  - "src/main/ipc.ts"
---

# データベース操作ルール

## リポジトリパターン

**ルール**: すべてのデータベース操作はリポジトリクラスを経由する必要があります。

```typescript
// ✅ 良い例: リポジトリを使用
const repo = new RepositoryRepository(db);
const repositories = await repo.findAll();

// ❌ 悪い例: 直接クエリ
const repositories = await db.select().from(schema.repositories);
```

**根拠**: 集約されたデータアクセスはテスト、一貫性、保守性を可能にします。

## マイグレーションワークフロー

**ルール**: スキーマ変更はマイグレーション経由で行う必要があります。

```bash
# 1. スキーマを変更
# src/main/db/schema.ts

# 2. マイグレーションを生成
pnpm db:generate

# 3. マイグレーションファイルをコミット
git add src/main/db/migrations/
```

**禁止事項**: マイグレーションファイルの手動編集や直接SQLでの`CREATE TABLE`使用。

## リポジトリメソッド命名

**慣例**: 一貫したCRUD命名に従う：

```typescript
class EntityRepository {
  async findAll(): Promise<Entity[]> { ... }
  async findById(id: string): Promise<Entity | null> { ... }
  async findByXxx(xxx: string): Promise<Entity | null> { ... }
  async create(data: NewEntity): Promise<Entity> { ... }
  async update(id: string, data: Partial<Entity>): Promise<Entity> { ... }
  async delete(id: string): Promise<void> { ... }
}
```

## エラーハンドリング

**ルール**: リポジトリメソッドは失敗時にnullを返すのではなく、エラーをスローする必要があります。

```typescript
// ✅ 良い例: エラーをスロー
async update(id: string, data: Partial<Entity>): Promise<Entity> {
  await this.db.update(schema.entities).set(data).where(eq(schema.entities.id, id));

  const updated = await this.findById(id);
  if (!updated) {
    throw new Error(`Entity ${id} not found after update`);
  }
  return updated;
}

// ❌ 悪い例: 黙って失敗
async update(id: string, data: Partial<Entity>): Promise<Entity | null> {
  await this.db.update(schema.entities).set(data).where(eq(schema.entities.id, id));
  return await this.findById(id);  // 失敗時にnullを返す
}
```

## 型変換

**ルール**: リポジトリクラスはデータベースレコードとアプリケーションモデル間の変換を行う必要があります。

```typescript
class RepositoryRepository {
  // データベースレコード型（Drizzleから）
  private toModel(record: RepositoryRecord): Repository {
    return {
      id: record.id,
      path: record.path,
      name: record.name,
      enabled: record.enabled === 1,  // 整数をbooleanに変換
      order: record.order,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async findAll(): Promise<Repository[]> {
    const records = await this.db.select().from(schema.repositories);
    return records.map(this.toModel);  // モデルに変換
  }
}
```
