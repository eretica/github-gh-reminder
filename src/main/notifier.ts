import { Notification, shell } from "electron";
import type { PullRequest } from "../shared/types";
import { getTray } from "./tray";
import { createMainWindow, setTrayBounds } from "./windows";

// Notification-like interface for DI
interface NotificationLike {
  on(event: "click", handler: () => void): void;
  show(): void;
}

// Dependencies interface for DI
export interface NotifierDeps {
  createNotification: (options: {
    title: string;
    body: string;
    silent: boolean;
    urgency?: "low" | "normal" | "critical";
  }) => NotificationLike;
  openExternal: (url: string) => void;
  getTray: () => { getBounds: () => Electron.Rectangle } | null;
  setTrayBounds: (bounds: Electron.Rectangle) => void;
  createMainWindow: () => void;
}

// Default production dependencies
const defaultDeps: NotifierDeps = {
  createNotification: (options) => new Notification(options),
  openExternal: (url) => shell.openExternal(url),
  getTray,
  setTrayBounds,
  createMainWindow,
};

export function notifyNewPR(
  pr: PullRequest,
  priority: "low" | "normal" | "high" = "normal",
  deps: NotifierDeps = defaultDeps,
): void {
  const urgencyMap = {
    low: "low" as const,
    normal: "normal" as const,
    high: "critical" as const,
  };

  const notification = deps.createNotification({
    title: "New PR Review Request",
    body: `${pr.repositoryName}: #${pr.prNumber} ${pr.title}\nby @${pr.author}`,
    silent: priority === "low",
    urgency: urgencyMap[priority],
  });

  notification.on("click", () => {
    try {
      deps.openExternal(pr.url);
    } catch (error) {
      console.error(`Failed to open URL: ${pr.url}`, error);
    }
  });

  notification.show();
}

export function notifyReminder(
  prs: PullRequest[],
  priority: "low" | "normal" | "high" = "normal",
  deps: NotifierDeps = defaultDeps,
): void {
  if (prs.length === 0) return;

  const urgencyMap = {
    low: "low" as const,
    normal: "normal" as const,
    high: "critical" as const,
  };

  const count = prs.length;
  const body =
    count === 1
      ? `${prs[0].repositoryName}: #${prs[0].prNumber} ${prs[0].title}`
      : `You have ${count} PRs waiting for your review`;

  const notification = deps.createNotification({
    title: "PR Review Reminder",
    body,
    silent: priority === "low",
    urgency: urgencyMap[priority],
  });

  notification.on("click", () => {
    if (count === 1) {
      // Single PR: navigate directly to GitHub
      try {
        deps.openExternal(prs[0].url);
      } catch (error) {
        console.error(`Failed to open URL: ${prs[0].url}`, error);
      }
    } else {
      // Multiple PRs: open the menu window
      const tray = deps.getTray();
      if (tray) {
        deps.setTrayBounds(tray.getBounds());
      }
      deps.createMainWindow();
    }
  });

  notification.show();
}

export function notifyError(
  title: string,
  message: string,
  deps: NotifierDeps = defaultDeps,
): void {
  const notification = deps.createNotification({
    title,
    body: message,
    silent: true,
  });

  notification.show();
}
