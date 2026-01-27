import { and, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { PullRequest } from "../../../shared/types";
import * as schema from "../schema";

export class PullRequestRepository {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  async findAll(): Promise<PullRequest[]> {
    const prs = await this.db.select().from(schema.pullRequests);
    return prs.map(this.toModel);
  }

  async findById(id: string): Promise<PullRequest | null> {
    const prs = await this.db
      .select()
      .from(schema.pullRequests)
      .where(eq(schema.pullRequests.id, id));

    return prs.length > 0 ? this.toModel(prs[0]) : null;
  }

  async findByRepositoryId(repositoryId: string): Promise<PullRequest[]> {
    const prs = await this.db
      .select()
      .from(schema.pullRequests)
      .where(eq(schema.pullRequests.repositoryId, repositoryId));

    return prs.map(this.toModel);
  }

  async findByRepositoryIdAndPrNumber(
    repositoryId: string,
    prNumber: number,
  ): Promise<PullRequest | null> {
    const prs = await this.db
      .select()
      .from(schema.pullRequests)
      .where(
        and(
          eq(schema.pullRequests.repositoryId, repositoryId),
          eq(schema.pullRequests.prNumber, prNumber),
        ),
      );

    return prs.length > 0 ? this.toModel(prs[0]) : null;
  }

  async create(
    data: Omit<PullRequest, "id" | "firstSeenAt">,
  ): Promise<PullRequest> {
    const now = new Date().toISOString();
    const id = uuidv4();
    const newPR: schema.NewPullRequest = {
      id,
      repositoryId: data.repositoryId,
      prNumber: data.prNumber,
      title: data.title,
      url: data.url,
      author: data.author,
      createdAt: data.createdAt,
      firstSeenAt: now,
      notifiedAt: data.notifiedAt ?? null,
      lastRemindedAt: data.lastRemindedAt ?? null,
    };

    await this.db.insert(schema.pullRequests).values(newPR);

    const created = await this.findById(id);
    if (!created) {
      throw new Error(`Pull request ${id} not found after creation`);
    }
    return created;
  }

  async update(
    id: string,
    data: Partial<
      Omit<PullRequest, "id" | "repositoryId" | "prNumber" | "firstSeenAt">
    >,
  ): Promise<PullRequest> {
    const updateData: Partial<schema.NewPullRequest> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.url !== undefined) updateData.url = data.url;
    if (data.author !== undefined) updateData.author = data.author;
    if (data.createdAt !== undefined) updateData.createdAt = data.createdAt;
    if (data.notifiedAt !== undefined) updateData.notifiedAt = data.notifiedAt;
    if (data.lastRemindedAt !== undefined)
      updateData.lastRemindedAt = data.lastRemindedAt;
    if (data.reminderEnabled !== undefined)
      updateData.reminderEnabled = data.reminderEnabled ? 1 : 0;

    await this.db
      .update(schema.pullRequests)
      .set(updateData)
      .where(eq(schema.pullRequests.id, id));

    const updated = await this.findById(id);
    if (!updated) throw new Error(`Pull request ${id} not found after update`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(schema.pullRequests)
      .where(eq(schema.pullRequests.id, id));
  }

  async deleteByRepositoryId(repositoryId: string): Promise<void> {
    await this.db
      .delete(schema.pullRequests)
      .where(eq(schema.pullRequests.repositoryId, repositoryId));
  }

  private toModel(record: schema.PullRequestRecord): PullRequest {
    return {
      id: record.id,
      repositoryId: record.repositoryId,
      repositoryName: "", // Will be populated by joining with repositories
      prNumber: record.prNumber,
      title: record.title,
      url: record.url,
      author: record.author,
      createdAt: record.createdAt,
      firstSeenAt: record.firstSeenAt,
      notifiedAt: record.notifiedAt,
      lastRemindedAt: record.lastRemindedAt,
      reminderEnabled: record.reminderEnabled === 1,
    };
  }
}
