import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock electron-updater
vi.mock("electron-updater", () => {
  const mockAutoUpdater = {
    checkForUpdates: vi.fn(),
    quitAndInstall: vi.fn(),
    on: vi.fn(),
    logger: null,
    autoDownload: false,
  };
  return {
    default: { autoUpdater: mockAutoUpdater },
    autoUpdater: mockAutoUpdater,
  };
});

// Mock electron
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/mock/path"),
    quit: vi.fn(),
  },
  BrowserWindow: {
    fromWebContents: vi.fn(),
    getAllWindows: vi.fn().mockReturnValue([]),
  },
  dialog: {
    showOpenDialog: vi.fn(),
    showMessageBox: vi.fn(),
  },
  ipcMain: {
    handle: vi.fn(),
  },
  shell: {
    openExternal: vi.fn(),
  },
}));

// Mock other dependencies
vi.mock("./db", () => ({
  getDatabase: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnValue(Promise.resolve([])),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnValue(Promise.resolve()),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  })),
}));

vi.mock("./db/schema", () => ({
  repositories: {},
  settings: { key: "key" },
  pullRequests: {},
}));

vi.mock("./gh-cli", () => ({
  getRepoName: vi.fn(),
  isGitRepository: vi.fn(),
}));

vi.mock("./scheduler", () => ({
  scheduler: {
    checkAllRepositories: vi.fn().mockResolvedValue([]),
    getAllPRs: vi.fn().mockResolvedValue([]),
    restart: vi.fn(),
  },
}));

vi.mock("./tray", () => ({
  updateTrayMenu: vi.fn(),
}));

vi.mock("./windows", () => ({
  createSettingsWindow: vi.fn(),
}));

import { ipcMain } from "electron";
import { IPC_CHANNELS } from "../shared/types";
import { setupIpcHandlers } from "./ipc";

describe("IPC Update Handlers", () => {
  let handleCallbacks: Map<string, (...args: never[]) => unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    handleCallbacks = new Map();

    // Capture IPC handle callbacks
    vi.mocked(ipcMain.handle).mockImplementation((channel, callback) => {
      handleCallbacks.set(channel, callback);
    });

    setupIpcHandlers();
  });

  afterEach(() => {
    handleCallbacks.clear();
  });

  describe("UPDATE_CHECK handler", () => {
    it("should register UPDATE_CHECK handler", () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.UPDATE_CHECK,
        expect.any(Function),
      );
    });

    it("should call autoUpdater.checkForUpdates when invoked", async () => {
      const handler = handleCallbacks.get(IPC_CHANNELS.UPDATE_CHECK);
      expect(handler).toBeDefined();

      await handler!();

      // Access via named export
      const { autoUpdater } = await import("electron-updater");
      expect(vi.mocked(autoUpdater.checkForUpdates)).toHaveBeenCalled();
    });
  });

  describe("UPDATE_INSTALL handler", () => {
    it("should register UPDATE_INSTALL handler", () => {
      expect(ipcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.UPDATE_INSTALL,
        expect.any(Function),
      );
    });

    it("should call autoUpdater.quitAndInstall when invoked", async () => {
      const handler = handleCallbacks.get(IPC_CHANNELS.UPDATE_INSTALL);
      expect(handler).toBeDefined();

      await handler!();

      // Access via named export
      const { autoUpdater } = await import("electron-updater");
      expect(vi.mocked(autoUpdater.quitAndInstall)).toHaveBeenCalled();
    });
  });
});
