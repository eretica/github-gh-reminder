import { Notification, shell } from "electron";
import type { PullRequest } from "../shared/types";

export function notifyNewPR(
  pr: PullRequest,
  priority: "low" | "normal" | "high" = "normal",
): void {
  // Determine urgency based on priority
  const urgencyMap = {
    low: "low" as const,
    normal: "normal" as const,
    high: "critical" as const,
  };

  const notification = new Notification({
    title: "New PR Review Request",
    body: `${pr.repositoryName}: #${pr.prNumber} ${pr.title}\nby @${pr.author}`,
    silent: false,
    urgency: urgencyMap[priority],
  });

  notification.on("click", () => {
    shell.openExternal(pr.url);
  });

  notification.show();
}

export function notifyReminder(prs: PullRequest[]): void {
  if (prs.length === 0) return;

  const count = prs.length;
  const body =
    count === 1
      ? `${prs[0].repositoryName}: #${prs[0].prNumber} ${prs[0].title}`
      : `You have ${count} PRs waiting for your review`;

  const notification = new Notification({
    title: "PR Review Reminder",
    body,
    silent: false,
  });

  notification.on("click", () => {
    if (count === 1) {
      shell.openExternal(prs[0].url);
    }
    // For multiple PRs, just show the app (handled by tray click)
  });

  notification.show();
}

export function notifyError(title: string, message: string): void {
  const notification = new Notification({
    title,
    body: message,
    silent: true,
  });

  notification.show();
}
