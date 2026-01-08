import { Notification, shell } from "electron";
import type { PullRequest, Settings } from "../shared/types";
import { getTray } from "./tray";
import { createMainWindow, setTrayBounds } from "./windows";
import { getDatabase } from "./db";
import * as schema from "./db/schema";

// Notification-like interface for DI
interface NotificationLike {
  on(event: "click", handler: () => void): void;
  show(): void;
}

// Notification options with urgency
interface NotificationOptions {
  title: string;
  body: string;
  silent: boolean;
  urgency?: "normal" | "critical" | "low";
}

// Dependencies interface for DI
export interface NotifierDeps {
  createNotification: (options: NotificationOptions) => NotificationLike;
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

// Helper to get current settings from database
async function getCurrentSettings(): Promise<Settings> {
  const db = getDatabase();
  const rows = await db.select().from(schema.settings);

  const result: Settings = {
    notifyOnNew: true,
    enableReminder: true,
    reminderIntervalHours: 1,
    checkIntervalMinutes: 5,
    notificationSound: true,
    notificationUrgency: "normal",
  };

  for (const row of rows) {
    const key = row.key as keyof Settings;
    if (key in result) {
      (result as Record<string, unknown>)[key] = JSON.parse(row.value);
    }
  }

  return result;
}

export async function notifyNewPR(
  pr: PullRequest,
  deps: NotifierDeps = defaultDeps,
): Promise<void> {
  const settings = await getCurrentSettings();

  const notification = deps.createNotification({
    title: "New PR Review Request",
    body: `${pr.repositoryName}: #${pr.prNumber} ${pr.title}\nby @${pr.author}`,
    silent: !settings.notificationSound,
    urgency: settings.notificationUrgency,
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

export async function notifyReminder(
  prs: PullRequest[],
  deps: NotifierDeps = defaultDeps,
): Promise<void> {
  if (prs.length === 0) return;

  const settings = await getCurrentSettings();
  const count = prs.length;
  const body =
    count === 1
      ? `${prs[0].repositoryName}: #${prs[0].prNumber} ${prs[0].title}`
      : `You have ${count} PRs waiting for your review`;

  const notification = deps.createNotification({
    title: "PR Review Reminder",
    body,
    silent: !settings.notificationSound,
    urgency: settings.notificationUrgency,
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
