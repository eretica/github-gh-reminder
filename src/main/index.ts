import { electronApp, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow, dialog, Notification } from "electron";
import log from "electron-log/main.js";
import pkg from "electron-updater";

const { autoUpdater } = pkg;

import { DEFAULT_SETTINGS, type Settings } from "../shared/types";
import { closeDatabase, getDatabase, initDatabase } from "./db";
import * as schema from "./db/schema";
import { sendPRUpdate, setupIpcHandlers } from "./ipc";
import { scheduler } from "./scheduler";
import { createTray, destroyTray, updateTrayMenu } from "./tray";

// Initialize logging
log.initialize();
log.info("App starting...");

// Configure auto-updater
autoUpdater.logger = log;
autoUpdater.autoDownload = false; // Manually trigger download after user notification

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    // Focus existing window if user tries to open another instance
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      if (windows[0].isMinimized()) windows[0].restore();
      windows[0].focus();
    }
  });

  // Don't quit when all windows are closed (tray app)
  app.on("window-all-closed", () => {
    // Do nothing - keep the app running in the tray
  });

  app.whenReady().then(async () => {
    // Set app user model id for windows
    electronApp.setAppUserModelId("com.pr-reminder.app");

    // Hide dock icon on macOS (tray-only app)
    if (process.platform === "darwin") {
      app.dock.hide();
    }

    // Default open or close DevTools by F12 in development
    app.on("browser-window-created", (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    // Initialize database
    initDatabase();

    // Setup IPC handlers
    setupIpcHandlers();

    // Create system tray
    createTray();

    // Get settings and start scheduler
    const settings = await getSettings();
    scheduler.start(settings);

    // Listen for PR updates to update tray
    scheduler.onUpdate((prs) => {
      updateTrayMenu(prs);
      sendPRUpdate(prs);
    });

    // Check for updates on startup
    autoUpdater.checkForUpdatesAndNotify();

    // On macOS, keep app running even when dock icon is clicked with no windows
    app.on("activate", () => {
      // App is activated, tray is always visible
    });
  });

  app.on("before-quit", () => {
    scheduler.stop();
    destroyTray();
    closeDatabase();
  });
}

async function getSettings(): Promise<Settings> {
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

// Auto-updater event handlers
autoUpdater.on("update-available", (info) => {
  log.info("Update available.", info);
  new Notification({
    title: "New version available",
    body: `Version ${info.version} is ready to be downloaded.`,
  }).show();
  autoUpdater.downloadUpdate();
});

autoUpdater.on("update-not-available", () => {
  log.info("Update not available.");
});

autoUpdater.on("error", (err) => {
  log.error("Error in auto-updater.", err);
});

autoUpdater.on("download-progress", (progressObj) => {
  let logMessage = `Download speed: ${progressObj.bytesPerSecond}`;
  logMessage += ` - Downloaded ${progressObj.percent}%`;
  logMessage += ` (${progressObj.transferred}/${progressObj.total})`;
  log.info(logMessage);
});

autoUpdater.on("update-downloaded", (info) => {
  log.info("Update downloaded.", info);
  const dialogOpts = {
    type: "info" as const,
    buttons: ["Restart", "Later"],
    title: "Application Update",
    message:
      process.platform === "win32"
        ? (info.releaseNotes as string)
        : (info.releaseName as string),
    detail: `A new version (${info.version}) has been downloaded. Restart the application to apply the updates.`,
  };

  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});
