import { and, eq, isNull, lt, or } from "drizzle-orm";
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
    _settings: Settings,
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

    // Use repository-specific notification settings
    const shouldNotifyOnNew = repo.notifyOnNew === 1 && repo.silent === 0;

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
          notifiedAt: shouldNotifyOnNew ? now : null,
          lastRemindedAt: null,
        };

        await db.insert(schema.pullRequests).values(newPR);

        const pr = this.toFrontendPR(
          newPR as schema.PullRequestRecord,
          repo.name,
        );

        // Send notification for new PR based on repository settings
        if (shouldNotifyOnNew) {
          notifyNewPR(
            pr,
            repo.notificationPriority as "low" | "normal" | "high",
          );
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

    // Get all repositories with their settings
    const allRepos = await db
      .select()
      .from(schema.repositories)
      .where(eq(schema.repositories.enabled, 1));

    // Group PRs by repository for per-repository reminder logic
    const prsToRemindByRepo: Map<
      string,
      Array<{ pr: schema.PullRequestRecord; repo: schema.RepositoryRecord }>
    > = new Map();

    for (const repo of allRepos) {
      // Skip if repository has reminders disabled or is in silent mode
      if (repo.enableReminder === 0 || repo.silent === 1) continue;

      const reminderThreshold = new Date(
        now.getTime() - repo.reminderIntervalHours * 60 * 60 * 1000,
      );

      // Get all PRs for this repo that need reminders (filter at database level)
      const prsToRemind = await db
        .select({
          pr: schema.pullRequests,
        })
        .from(schema.pullRequests)
        .where(
          and(
            eq(schema.pullRequests.repositoryId, repo.id),
            or(
              isNull(schema.pullRequests.lastRemindedAt),
              lt(
                schema.pullRequests.lastRemindedAt,
                reminderThreshold.toISOString(),
              ),
            ),
          ),
        );

      const uniquePRsForRepo = prsToRemind.map((item) => ({
        pr: item.pr,
        repo,
      }));

      if (uniquePRsForRepo.length > 0) {
        prsToRemindByRepo.set(repo.id, uniquePRsForRepo);
      }
    }

    // Send reminders grouped by notification priority
    const allPRsToRemind: Array<{
      pr: schema.PullRequestRecord;
      repo: schema.RepositoryRecord;
    }> = [];
    for (const prs of prsToRemindByRepo.values()) {
      allPRsToRemind.push(...prs);
    }

    if (allPRsToRemind.length === 0) return;

    const frontendPRs = allPRsToRemind.map((item) =>
      this.toFrontendPR(item.pr, item.repo.name),
    );

    // Determine highest priority from all repos being reminded
    const priorityRank = { low: 0, normal: 1, high: 2 };
    const highestPriority = allPRsToRemind.reduce((maxPriority, item) => {
      const repoPriority = item.repo
        .notificationPriority as keyof typeof priorityRank;
      return priorityRank[repoPriority] > priorityRank[maxPriority]
        ? repoPriority
        : maxPriority;
    }, "low" as "low" | "normal" | "high");

    // Send reminder notification with highest priority
    notifyReminder(frontendPRs, highestPriority);

    // Update last reminded time
    const nowStr = now.toISOString();
    for (const item of allPRsToRemind) {
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

    return results.map((item) => this.toFrontendPR(item.pr, item.repo.name));
  }
}

export const scheduler = new PRScheduler();
