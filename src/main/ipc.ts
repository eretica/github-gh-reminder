import { basename } from "node:path";
import { eq } from "drizzle-orm";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { v4 as uuidv4 } from "uuid";
import {
  DEFAULT_SETTINGS,
  IPC_CHANNELS,
  type PullRequest,
  type Repository,
  type RepositoryNotificationSettings,
  type Settings,
} from "../shared/types";
import { getDatabase } from "./db";
import * as schema from "./db/schema";
import { getRepoName, isGitRepository } from "./gh-cli";
import { scheduler } from "./scheduler";
import { updateTrayMenu } from "./tray";
import { createSettingsWindow } from "./windows";

export function setupIpcHandlers(): void {
  // Repository handlers
  ipcMain.handle(IPC_CHANNELS.REPO_LIST, async (): Promise<Repository[]> => {
    const db = getDatabase();
    const repos = await db
      .select()
      .from(schema.repositories)
      .orderBy(schema.repositories.order);
    return repos.map((r) => ({
      id: r.id,
      path: r.path,
      name: r.name,
      enabled: r.enabled === 1,
      order: r.order,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      notifyOnNew: r.notifyOnNew === 1,
      enableReminder: r.enableReminder === 1,
      reminderIntervalHours: r.reminderIntervalHours,
      notificationPriority: r.notificationPriority as "low" | "normal" | "high",
      silent: r.silent === 1,
    }));
  });

  ipcMain.handle(
    IPC_CHANNELS.REPO_ADD,
    async (event): Promise<Repository | null> => {
      const window = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showOpenDialog(window!, {
        properties: ["openDirectory"],
        title: "Select Git Repository",
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      const path = result.filePaths[0];

      // Verify it's a git repository
      if (!isGitRepository(path)) {
        throw new Error("Selected folder is not a Git repository");
      }

      const db = getDatabase();

      // Check if already registered
      const existing = await db
        .select()
        .from(schema.repositories)
        .where(eq(schema.repositories.path, path));

      if (existing.length > 0) {
        throw new Error("This repository is already registered");
      }

      // Get repo name from gh cli or use folder name
      const repoName = getRepoName(path) || basename(path);

      // Get max order
      const maxOrderResult = await db.select().from(schema.repositories);
      const maxOrder = maxOrderResult.reduce(
        (max, r) => Math.max(max, r.order),
        -1,
      );

      const now = new Date().toISOString();
      const newRepo: schema.NewRepository = {
        id: uuidv4(),
        path,
        name: repoName,
        enabled: 1,
        order: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(schema.repositories).values(newRepo);

      // Refresh PRs after adding repo
      const settings = await getSettingsFromDb();
      scheduler.checkAllRepositories(settings);

      return {
        id: newRepo.id!,
        path: newRepo.path,
        name: newRepo.name,
        enabled: true,
        order: newRepo.order!,
        createdAt: now,
        updatedAt: now,
        notifyOnNew: true,
        enableReminder: true,
        reminderIntervalHours: 1,
        notificationPriority: "normal",
        silent: false,
      };
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.REPO_REMOVE,
    async (_, id: string): Promise<void> => {
      const db = getDatabase();
      await db
        .delete(schema.repositories)
        .where(eq(schema.repositories.id, id));

      // Update tray after removing repo
      const prs = await scheduler.getAllPRs();
      updateTrayMenu(prs);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.REPO_TOGGLE,
    async (_, id: string, enabled: boolean): Promise<void> => {
      const db = getDatabase();
      const now = new Date().toISOString();
      await db
        .update(schema.repositories)
        .set({ enabled: enabled ? 1 : 0, updatedAt: now })
        .where(eq(schema.repositories.id, id));

      // Update tray after toggle
      const prs = await scheduler.getAllPRs();
      updateTrayMenu(prs);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.REPO_REORDER,
    async (_, ids: string[]): Promise<void> => {
      const db = getDatabase();
      const now = new Date().toISOString();

      for (let i = 0; i < ids.length; i++) {
        await db
          .update(schema.repositories)
          .set({ order: i, updatedAt: now })
          .where(eq(schema.repositories.id, ids[i]));
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.REPO_UPDATE_NOTIFICATION_SETTINGS,
    async (
      _,
      id: string,
      settings: Partial<RepositoryNotificationSettings>,
    ): Promise<void> => {
      const db = getDatabase();
      const now = new Date().toISOString();

      const updateData: Record<string, unknown> = { updatedAt: now };

      if (settings.notifyOnNew !== undefined) {
        updateData.notifyOnNew = settings.notifyOnNew ? 1 : 0;
      }
      if (settings.enableReminder !== undefined) {
        updateData.enableReminder = settings.enableReminder ? 1 : 0;
      }
      if (settings.reminderIntervalHours !== undefined) {
        updateData.reminderIntervalHours = settings.reminderIntervalHours;
      }
      if (settings.notificationPriority !== undefined) {
        updateData.notificationPriority = settings.notificationPriority;
      }
      if (settings.silent !== undefined) {
        updateData.silent = settings.silent ? 1 : 0;
      }

      await db
        .update(schema.repositories)
        .set(updateData)
        .where(eq(schema.repositories.id, id));
    },
  );

  // Settings handlers
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (): Promise<Settings> => {
    return getSettingsFromDb();
  });

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SET,
    async (_, newSettings: Settings): Promise<void> => {
      const db = getDatabase();

      for (const [key, value] of Object.entries(newSettings)) {
        await db
          .insert(schema.settings)
          .values({ key, value: JSON.stringify(value) })
          .onConflictDoUpdate({
            target: schema.settings.key,
            set: { value: JSON.stringify(value) },
          });
      }

      // Restart scheduler with new settings
      scheduler.restart(newSettings);
    },
  );

  // Pull Request handlers
  ipcMain.handle(IPC_CHANNELS.PR_LIST, async (): Promise<PullRequest[]> => {
    return scheduler.getAllPRs();
  });

  ipcMain.handle(IPC_CHANNELS.PR_REFRESH, async (): Promise<PullRequest[]> => {
    const settings = await getSettingsFromDb();
    const prs = await scheduler.checkAllRepositories(settings);
    updateTrayMenu(prs);
    return prs;
  });

  ipcMain.handle(
    IPC_CHANNELS.PR_OPEN,
    async (_, url: string): Promise<void> => {
      await shell.openExternal(url);
    },
  );

  // Window handlers
  ipcMain.handle(IPC_CHANNELS.OPEN_SETTINGS, async (): Promise<void> => {
    createSettingsWindow();
  });

  ipcMain.handle(IPC_CHANNELS.CLOSE_SETTINGS, async (event): Promise<void> => {
    const window = BrowserWindow.fromWebContents(event.sender);
    window?.close();
  });

  ipcMain.handle(IPC_CHANNELS.QUIT_APP, async (): Promise<void> => {
    app.quit();
  });
}

async function getSettingsFromDb(): Promise<Settings> {
  const db = getDatabase();
  const rows = await db.select().from(schema.settings);

  const result = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    const key = row.key as keyof Settings;
    if (key in result) {
      (result as Record<string, unknown>)[key] = JSON.parse(row.value);
    }
  }

  return result;
}

export function sendPRUpdate(prs: PullRequest[]): void {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(IPC_CHANNELS.PR_UPDATED, prs);
  });
}
