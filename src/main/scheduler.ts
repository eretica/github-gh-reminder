import { and, eq, lt } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { PullRequest, Settings } from "../shared/types";
import { getDatabase } from "./db";
import * as schema from "./db/schema";
import { fetchReviewRequestedPRs, type GHPullRequest } from "./gh-cli";
import { notifyNewPR, notifyReminder } from "./notifier";

type PRUpdateCallback = (prs: PullRequest[]) => void;

class PRScheduler {
  private checkIntervalId: NodeJS.Timeout | null = null;
  private reminderIntervalId: NodeJS.Timeout | null = null;
  private updateCallbacks: PRUpdateCallback[] = [];

  start(settings: Settings): void {
    this.stop();

    // Check interval (fetch new PRs)
    const checkMs = settings.checkIntervalMinutes * 60 * 1000;
    this.checkIntervalId = setInterval(() => {
      this.checkAllRepositories(settings);
    }, checkMs);

    // Reminder interval (notify about existing PRs)
    if (settings.enableReminder) {
      const reminderMs = settings.reminderIntervalHours * 60 * 60 * 1000;
      this.reminderIntervalId = setInterval(() => {
        this.sendReminders(settings);
      }, reminderMs);
    }

    // Run immediately on start
    this.checkAllRepositories(settings);
  }

  stop(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
    if (this.reminderIntervalId) {
      clearInterval(this.reminderIntervalId);
      this.reminderIntervalId = null;
    }
  }

  restart(settings: Settings): void {
    this.start(settings);
  }

  onUpdate(callback: PRUpdateCallback): () => void {
    this.updateCallbacks.push(callback);
    return () => {
      this.updateCallbacks = this.updateCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  private notifyUpdate(prs: PullRequest[]): void {
    for (const callback of this.updateCallbacks) {
      callback(prs);
    }
  }

  async checkAllRepositories(settings: Settings): Promise<PullRequest[]> {
    const db = getDatabase();
    const repos = await db
      .select()
      .from(schema.repositories)
      .where(eq(schema.repositories.enabled, 1));

    const allPRs: PullRequest[] = [];

    for (const repo of repos) {
      const prs = await this.checkRepository(repo, settings);
      allPRs.push(...prs);
    }

    this.notifyUpdate(allPRs);
    return allPRs;
  }

  private async checkRepository(
    repo: schema.RepositoryRecord,
    settings: Settings,
  ): Promise<PullRequest[]> {
    const db = getDatabase();
    const ghPRs = fetchReviewRequestedPRs(repo.path);

    const now = new Date().toISOString();
    const resultPRs: PullRequest[] = [];

    // Get current PRs from this repo
    const existingPRs = await db
      .select()
      .from(schema.pullRequests)
      .where(eq(schema.pullRequests.repositoryId, repo.id));

    const existingPRMap = new Map(existingPRs.map((pr) => [pr.prNumber, pr]));

    // Process fetched PRs
    for (const ghPR of ghPRs) {
      const existing = existingPRMap.get(ghPR.number);

      if (existing) {
        // Update existing PR
        await db
          .update(schema.pullRequests)
          .set({
            title: ghPR.title,
            url: ghPR.url,
            author: ghPR.author.login,
          })
          .where(eq(schema.pullRequests.id, existing.id));

        resultPRs.push(this.toFrontendPR(existing, repo.name, ghPR));
        existingPRMap.delete(ghPR.number);
      } else {
        // New PR
        const newPR: schema.NewPullRequest = {
          id: uuidv4(),
          repositoryId: repo.id,
          prNumber: ghPR.number,
          title: ghPR.title,
          url: ghPR.url,
          author: ghPR.author.login,
          createdAt: ghPR.createdAt,
          firstSeenAt: now,
          notifiedAt: settings.notifyOnNew ? now : null,
          lastRemindedAt: null,
        };

        await db.insert(schema.pullRequests).values(newPR);

        const pr = this.toFrontendPR(
          newPR as schema.PullRequestRecord,
          repo.name,
        );

        // Send notification for new PR
        if (settings.notifyOnNew) {
          notifyNewPR(pr);
        }

        resultPRs.push(pr);
      }
    }

    // Remove PRs that no longer exist (already reviewed/merged/closed)
    for (const [, pr] of existingPRMap) {
      await db
        .delete(schema.pullRequests)
        .where(eq(schema.pullRequests.id, pr.id));
    }

    return resultPRs;
  }

  private async sendReminders(settings: Settings): Promise<void> {
    if (!settings.enableReminder) return;

    const db = getDatabase();
    const now = new Date();
    const reminderThreshold = new Date(
      now.getTime() - settings.reminderIntervalHours * 60 * 60 * 1000,
    );

    // Get all PRs that haven't been reminded recently
    const prsToRemind = await db
      .select({
        pr: schema.pullRequests,
        repo: schema.repositories,
      })
      .from(schema.pullRequests)
      .innerJoin(
        schema.repositories,
        eq(schema.pullRequests.repositoryId, schema.repositories.id),
      )
      .where(
        and(
          eq(schema.repositories.enabled, 1),
          lt(
            schema.pullRequests.lastRemindedAt,
            reminderThreshold.toISOString(),
          ),
        ),
      );

    // Also get PRs that have never been reminded
    const neverRemindedPRs = await db
      .select({
        pr: schema.pullRequests,
        repo: schema.repositories,
      })
      .from(schema.pullRequests)
      .innerJoin(
        schema.repositories,
        eq(schema.pullRequests.repositoryId, schema.repositories.id),
      )
      .where(and(eq(schema.repositories.enabled, 1)));

    const allPRsToRemind = [
      ...prsToRemind,
      ...neverRemindedPRs.filter((item) => item.pr.lastRemindedAt === null),
    ];

    // Remove duplicates
    const uniquePRs = Array.from(
      new Map(allPRsToRemind.map((item) => [item.pr.id, item])).values(),
    );

    if (uniquePRs.length === 0) return;

    const frontendPRs = uniquePRs.map((item) =>
      this.toFrontendPR(item.pr, item.repo.name),
    );

    // Send reminder notification
    notifyReminder(frontendPRs);

    // Update last reminded time
    const nowStr = now.toISOString();
    for (const item of uniquePRs) {
      await db
        .update(schema.pullRequests)
        .set({ lastRemindedAt: nowStr })
        .where(eq(schema.pullRequests.id, item.pr.id));
    }
  }

  private toFrontendPR(
    pr: schema.PullRequestRecord,
    repoName: string,
    ghPR?: GHPullRequest,
  ): PullRequest {
    return {
      id: pr.id,
      repositoryId: pr.repositoryId,
      repositoryName: repoName,
      prNumber: pr.prNumber,
      title: ghPR?.title ?? pr.title,
      url: ghPR?.url ?? pr.url,
      author: ghPR?.author.login ?? pr.author,
      createdAt: pr.createdAt,
      firstSeenAt: pr.firstSeenAt,
      notifiedAt: pr.notifiedAt,
      lastRemindedAt: pr.lastRemindedAt,
      // Extended PR details from GitHub
      isDraft: ghPR?.isDraft,
      state: ghPR?.state,
      reviewDecision: ghPR?.reviewDecision,
      reviewRequestsCount: ghPR?.reviewRequests?.length,
      commentsCount: ghPR?.comments?.length,
      changedFiles: ghPR?.changedFiles,
      mergeable: ghPR?.mergeable,
      statusCheckRollup: ghPR?.statusCheckRollup,
    };
  }

  async getAllPRs(): Promise<PullRequest[]> {
    const db = getDatabase();

    const results = await db
      .select({
        pr: schema.pullRequests,
        repo: schema.repositories,
      })
      .from(schema.pullRequests)
      .innerJoin(
        schema.repositories,
        eq(schema.pullRequests.repositoryId, schema.repositories.id),
      )
      .where(eq(schema.repositories.enabled, 1));

    // Fetch fresh GitHub data to populate extended fields
    const prsWithGHData: PullRequest[] = [];

    for (const item of results) {
      const ghPRs = fetchReviewRequestedPRs(item.repo.path);
      const ghPR = ghPRs.find((pr) => pr.number === item.pr.prNumber);
      prsWithGHData.push(this.toFrontendPR(item.pr, item.repo.name, ghPR));
    }

    return prsWithGHData;
  }
}

export const scheduler = new PRScheduler();
