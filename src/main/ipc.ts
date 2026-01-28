import { basename } from "node:path";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import log from "electron-log/main.js";
import pkg from "electron-updater";

const { autoUpdater } = pkg;

import {
  IPC_CHANNELS,
  type PullRequest,
  type Repository,
  type Settings,
} from "../shared/types";
import { getDatabase } from "./db";
import {
  PullRequestRepository,
  RepositoryRepository,
  SettingsRepository,
} from "./db/repositories";
import { getRepoName, isGitRepository } from "./gh-cli";
import { scheduler } from "./scheduler";
import { updateTrayMenu } from "./tray";

export function setupIpcHandlers(): void {
  // Repository handlers
  ipcMain.handle(IPC_CHANNELS.REPO_LIST, async (): Promise<Repository[]> => {
    const db = getDatabase();
    const repositoryRepo = new RepositoryRepository(db);
    return await repositoryRepo.findAll();
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
      const isGitRepo = await isGitRepository(path);
      if (!isGitRepo) {
        throw new Error("Selected folder is not a Git repository");
      }

      const db = getDatabase();
      const repositoryRepo = new RepositoryRepository(db);

      // Check if already registered
      const existing = await repositoryRepo.findByPath(path);
      if (existing) {
        throw new Error("This repository is already registered");
      }

      // Get repo name from gh cli or use folder name
      const repoName = (await getRepoName(path)) || basename(path);

      // Get max order
      const maxOrder = await repositoryRepo.getMaxOrder();

      const newRepo = await repositoryRepo.create({
        path,
        name: repoName,
        enabled: true,
        order: maxOrder + 1,
      });

      // Refresh PRs after adding repo
      const settingsRepo = new SettingsRepository(db);
      const settings = await settingsRepo.getAll();
      scheduler.checkAllRepositories(settings);

      return newRepo;
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.REPO_REMOVE,
    async (_, id: string): Promise<void> => {
      const db = getDatabase();
      const repositoryRepo = new RepositoryRepository(db);
      await repositoryRepo.delete(id);

      // Update tray after removing repo
      const prs = await scheduler.getAllPRs();
      updateTrayMenu(prs);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.REPO_TOGGLE,
    async (_, id: string, enabled: boolean): Promise<void> => {
      const db = getDatabase();
      const repositoryRepo = new RepositoryRepository(db);
      await repositoryRepo.update(id, { enabled });

      // Update tray after toggle
      const prs = await scheduler.getAllPRs();
      updateTrayMenu(prs);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.REPO_REORDER,
    async (_, ids: string[]): Promise<void> => {
      const db = getDatabase();
      const repositoryRepo = new RepositoryRepository(db);

      for (let i = 0; i < ids.length; i++) {
        await repositoryRepo.update(ids[i], { order: i });
      }
    },
  );

  // Settings handlers
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (): Promise<Settings> => {
    const db = getDatabase();
    const settingsRepo = new SettingsRepository(db);
    return await settingsRepo.getAll();
  });

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SET,
    async (_, newSettings: Settings): Promise<void> => {
      const db = getDatabase();
      const settingsRepo = new SettingsRepository(db);
      await settingsRepo.setAll(newSettings);

      // Restart scheduler with new settings
      scheduler.restart(newSettings);
    },
  );

  // Pull Request handlers
  ipcMain.handle(IPC_CHANNELS.PR_LIST, async (): Promise<PullRequest[]> => {
    return scheduler.getAllPRs();
  });

  ipcMain.handle(IPC_CHANNELS.PR_REFRESH, async (): Promise<PullRequest[]> => {
    const db = getDatabase();
    const settingsRepo = new SettingsRepository(db);
    const settings = await settingsRepo.getAll();
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

  ipcMain.handle(
    IPC_CHANNELS.PR_TOGGLE_REMINDER,
    async (_, prId: string, enabled: boolean): Promise<void> => {
      const db = getDatabase();
      const prRepo = new PullRequestRepository(db);
      await prRepo.update(prId, { reminderEnabled: enabled });

      // Notify renderer of the update
      const prs = await scheduler.getAllPRs();
      sendPRUpdate(prs);
    },
  );

  // Window handlers
  ipcMain.handle(IPC_CHANNELS.OPEN_SETTINGS, async (event): Promise<void> => {
    // Send navigation event to renderer (secure alternative to executeJavaScript)
    event.sender.send(IPC_CHANNELS.NAVIGATE_TO_SETTINGS);
  });

  ipcMain.handle(IPC_CHANNELS.CLOSE_SETTINGS, async (event): Promise<void> => {
    // Send navigation event to renderer (secure alternative to executeJavaScript)
    event.sender.send(IPC_CHANNELS.NAVIGATE_TO_MAIN);
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

export function sendPRUpdate(prs: PullRequest[]): void {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(IPC_CHANNELS.PR_UPDATED, prs);
  });
}
