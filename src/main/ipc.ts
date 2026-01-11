import { basename } from "node:path";
import { eq } from "drizzle-orm";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import log from "electron-log/main.js";
import pkg from "electron-updater";

const { autoUpdater } = pkg;

import { v4 as uuidv4 } from "uuid";
import {
  DEFAULT_SETTINGS,
  IPC_CHANNELS,
  type PullRequest,
  type Repository,
  type Settings,
} from "../shared/types";
import { getDatabase } from "./db";
import * as schema from "./db/schema";
import { getRepoName, isGitRepository } from "./gh-cli";
import { scheduler } from "./scheduler";
import { updateTrayMenu } from "./tray";

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
  ipcMain.handle(IPC_CHANNELS.OPEN_SETTINGS, async (event): Promise<void> => {
    // Navigate to settings page within the same window
    await event.sender.executeJavaScript('window.location.hash = "#/settings"');
  });

  ipcMain.handle(IPC_CHANNELS.CLOSE_SETTINGS, async (event): Promise<void> => {
    // Navigate back to main page within the same window
    await event.sender.executeJavaScript('window.location.hash = "#/"');
  });

  ipcMain.handle(IPC_CHANNELS.QUIT_APP, async (): Promise<void> => {
    app.quit();
  });

  // Update handlers
  ipcMain.handle(IPC_CHANNELS.UPDATE_CHECK, async (): Promise<void> => {
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      log.error("Failed to check for updates:", error);
      throw new Error("アップデートの確認に失敗しました");
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_INSTALL, async (): Promise<void> => {
    try {
      autoUpdater.quitAndInstall();
    } catch (error) {
      log.error("Failed to install update:", error);
      throw new Error("アップデートのインストールに失敗しました");
    }
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
