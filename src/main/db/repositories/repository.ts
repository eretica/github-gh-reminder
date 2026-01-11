import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { Repository } from "../../../shared/types";
import * as schema from "../schema";

export class RepositoryRepository {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  async findAll(): Promise<Repository[]> {
    const repos = await this.db
      .select()
      .from(schema.repositories)
      .orderBy(schema.repositories.order);

    return repos.map(this.toModel);
  }

  async findById(id: string): Promise<Repository | null> {
    const repos = await this.db
      .select()
      .from(schema.repositories)
      .where(eq(schema.repositories.id, id));

    return repos.length > 0 ? this.toModel(repos[0]) : null;
  }

  async findByPath(path: string): Promise<Repository | null> {
    const repos = await this.db
      .select()
      .from(schema.repositories)
      .where(eq(schema.repositories.path, path));

    return repos.length > 0 ? this.toModel(repos[0]) : null;
  }

  async create(
    data: Omit<Repository, "id" | "createdAt" | "updatedAt">,
  ): Promise<Repository> {
    const now = new Date().toISOString();
    const id = uuidv4();
    const newRepo: schema.NewRepository = {
      id,
      path: data.path,
      name: data.name,
      enabled: data.enabled ? 1 : 0,
      order: data.order,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(schema.repositories).values(newRepo);

    const created = await this.findById(id);
    if (!created) {
      throw new Error(`Repository ${id} not found after creation`);
    }
    return created;
  }

  async update(
    id: string,
    data: Partial<Omit<Repository, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Repository> {
    const now = new Date().toISOString();
    const updateData: Partial<schema.NewRepository> = {
      updatedAt: now,
    };

    if (data.path !== undefined) updateData.path = data.path;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.enabled !== undefined) updateData.enabled = data.enabled ? 1 : 0;
    if (data.order !== undefined) updateData.order = data.order;

    await this.db
      .update(schema.repositories)
      .set(updateData)
      .where(eq(schema.repositories.id, id));

    const updated = await this.findById(id);
    if (!updated) throw new Error(`Repository ${id} not found after update`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(schema.repositories)
      .where(eq(schema.repositories.id, id));
  }

  async getMaxOrder(): Promise<number> {
    const repos = await this.db.select().from(schema.repositories);
    return repos.reduce((max, r) => Math.max(max, r.order), -1);
  }

  private toModel(record: schema.RepositoryRecord): Repository {
    return {
      id: record.id,
      path: record.path,
      name: record.name,
      enabled: record.enabled === 1,
      order: record.order,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
