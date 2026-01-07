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
  deps: NotifierDeps = defaultDeps,
): void {
  const notification = deps.createNotification({
    title: "New PR Review Request",
    body: `${pr.repositoryName}: #${pr.prNumber} ${pr.title}\nby @${pr.author}`,
    silent: false,
  });

  notification.on("click", () => {
    deps.openExternal(pr.url);
  });

  notification.show();
}

export function notifyReminder(
  prs: PullRequest[],
  deps: NotifierDeps = defaultDeps,
): void {
  if (prs.length === 0) return;

  const count = prs.length;
  const body =
    count === 1
      ? `${prs[0].repositoryName}: #${prs[0].prNumber} ${prs[0].title}`
      : `You have ${count} PRs waiting for your review`;

  const notification = deps.createNotification({
    title: "PR Review Reminder",
    body,
    silent: false,
  });

  notification.on("click", () => {
    if (count === 1) {
      // Single PR: navigate directly to GitHub
      deps.openExternal(prs[0].url);
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
