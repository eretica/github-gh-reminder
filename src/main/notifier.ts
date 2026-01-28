import { Notification, shell } from "electron";
import type { PullRequest, Settings } from "../shared/types";
import { getDatabase } from "./db";
import { SettingsRepository } from "./db/repositories";
import { playSound } from "./sound";
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
  getSettings: () => Promise<Settings>;
}

// Default production dependencies
const defaultDeps: NotifierDeps = {
  createNotification: (options) => new Notification(options),
  openExternal: (url) => shell.openExternal(url),
  getTray,
  setTrayBounds,
  createMainWindow,
  getSettings: async () => {
    const db = getDatabase();
    const settingsRepo = new SettingsRepository(db);
    return await settingsRepo.getAll();
  },
};

export async function notifyNewPR(
  pr: PullRequest,
  deps: NotifierDeps = defaultDeps,
): Promise<void> {
  const settings = await deps.getSettings();
  const notification = deps.createNotification({
    title: "New PR Review Request",
    body: `${pr.repositoryName}: #${pr.prNumber} ${pr.title}\nby @${pr.author}`,
    silent: true,
  });

  notification.on("click", () => {
    try {
      deps.openExternal(pr.url);
    } catch (error) {
      console.error(`Failed to open URL: ${pr.url}`, error);
    }
  });

  notification.show();

  // Play custom sound if enabled
  if (settings.notificationSound && settings.notificationSoundName) {
    playSound(settings.notificationSoundName);
  }
}

export async function notifyReminder(
  prs: PullRequest[],
  deps: NotifierDeps = defaultDeps,
): Promise<void> {
  if (prs.length === 0) return;

  const settings = await deps.getSettings();
  const count = prs.length;
  const body =
    count === 1
      ? `${prs[0].repositoryName}: #${prs[0].prNumber} ${prs[0].title}`
      : `You have ${count} PRs waiting for your review`;

  const notification = deps.createNotification({
    title: "PR Review Reminder",
    body,
    silent: true,
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

  // Play custom sound if enabled
  if (settings.notificationSound && settings.notificationSoundName) {
    playSound(settings.notificationSoundName);
  }
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
