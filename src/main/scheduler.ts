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

    // Check if Do Not Disturb is enabled for this repo
    const dnd = repo.doNotDisturb === 1;

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
        const shouldNotify = repo.notifyOnNewPR === 1 && !dnd;
        const newPR: schema.NewPullRequest = {
          id: uuidv4(),
          repositoryId: repo.id,
          prNumber: ghPR.number,
          title: ghPR.title,
          url: ghPR.url,
          author: ghPR.author.login,
          createdAt: ghPR.createdAt,
          firstSeenAt: now,
          notifiedAt: shouldNotify ? now : null,
          lastRemindedAt: null,
        };

        await db.insert(schema.pullRequests).values(newPR);

        const pr = this.toFrontendPR(
          newPR as schema.PullRequestRecord,
          repo.name,
        );

        // Send notification for new PR if enabled for this repo and not in DND mode
        if (shouldNotify) {
          notifyNewPR(pr, repo.notificationPriority as "low" | "normal" | "high");
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

    // Get all enabled repositories with their notification settings
    const repos = await db
      .select()
      .from(schema.repositories)
      .where(eq(schema.repositories.enabled, 1));

    const allPRsToRemind: Array<{
      pr: schema.PullRequestRecord;
      repo: schema.RepositoryRecord;
    }> = [];

    // Process each repository with its own reminder interval
    for (const repo of repos) {
      // Skip if reminders are disabled for this repo or it's in DND mode
      if (repo.enableReminders === 0 || repo.doNotDisturb === 1) {
        continue;
      }

      const reminderThreshold = new Date(
        now.getTime() - repo.reminderIntervalHours * 60 * 60 * 1000,
      );

      // Get PRs that haven't been reminded recently
      const prsToRemind = await db
        .select()
        .from(schema.pullRequests)
        .where(
          and(
            eq(schema.pullRequests.repositoryId, repo.id),
            lt(
              schema.pullRequests.lastRemindedAt,
              reminderThreshold.toISOString(),
            ),
          ),
        );

      // Also get PRs that have never been reminded
      const neverRemindedPRs = await db
        .select()
        .from(schema.pullRequests)
        .where(
          and(
            eq(schema.pullRequests.repositoryId, repo.id),
            eq(schema.pullRequests.lastRemindedAt, null),
          ),
        );

      const repoPRs = [...prsToRemind, ...neverRemindedPRs];

      // Remove duplicates
      const uniqueRepoPRs = Array.from(
        new Map(repoPRs.map((pr) => [pr.id, pr])).values(),
      );

      // Add to the list with repo info
      for (const pr of uniqueRepoPRs) {
        allPRsToRemind.push({ pr, repo });
      }
    }

    if (allPRsToRemind.length === 0) return;

    // Group PRs by priority
    const prsByPriority = new Map<
      "low" | "normal" | "high",
      Array<{ pr: schema.PullRequestRecord; repo: schema.RepositoryRecord }>
    >();

    for (const item of allPRsToRemind) {
      const priority = item.repo
        .notificationPriority as "low" | "normal" | "high";
      if (!prsByPriority.has(priority)) {
        prsByPriority.set(priority, []);
      }
      prsByPriority.get(priority)!.push(item);
    }

    // Send reminders for each priority group
    for (const [priority, items] of prsByPriority) {
      const frontendPRs = items.map((item) =>
        this.toFrontendPR(item.pr, item.repo.name),
      );
      notifyReminder(frontendPRs, priority);
    }

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
    // Group PRs by repository to avoid N+1 query problem
    const prsByRepo = new Map<string, typeof results>();
    for (const item of results) {
      if (!prsByRepo.has(item.repo.id)) {
        prsByRepo.set(item.repo.id, []);
      }
      prsByRepo.get(item.repo.id)!.push(item);
    }

    // Fetch GitHub data once per repository (not once per PR)
    const prsWithGHData: PullRequest[] = [];
    for (const [, items] of prsByRepo) {
      const repo = items[0].repo;
      try {
        const ghPRs = fetchReviewRequestedPRs(repo.path);
        const ghPRMap = new Map(ghPRs.map((pr) => [pr.number, pr]));

        for (const item of items) {
          const ghPR = ghPRMap.get(item.pr.prNumber);
          prsWithGHData.push(this.toFrontendPR(item.pr, repo.name, ghPR));
        }
      } catch (error) {
        console.error(`Failed to fetch GitHub data for ${repo.name}:`, error);
        // Fall back to DB data without extended fields
        for (const item of items) {
          prsWithGHData.push(this.toFrontendPR(item.pr, repo.name));
        }
      }
    }

    return prsWithGHData;
  }
}

export const scheduler = new PRScheduler();
