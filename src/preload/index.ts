import { contextBridge, ipcRenderer } from "electron";
import {
  IPC_CHANNELS,
  type IpcApi,
  type PullRequest,
  type Repository,
  type Settings,
} from "../shared/types";

const api: IpcApi = {
  // Repository
  listRepositories: (): Promise<Repository[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.REPO_LIST),
  addRepository: (path: string): Promise<Repository> =>
    ipcRenderer.invoke(IPC_CHANNELS.REPO_ADD, path),
  removeRepository: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.REPO_REMOVE, id),
  toggleRepository: (id: string, enabled: boolean): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.REPO_TOGGLE, id, enabled),
  reorderRepositories: (ids: string[]): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.REPO_REORDER, ids),

  // Settings
  getSettings: (): Promise<Settings> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  setSettings: (settings: Settings): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, settings),

  // System Sounds
  getSystemSounds: (): Promise<string[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.SOUND_LIST),
  playSound: (soundName: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SOUND_PLAY, soundName),

  // Pull Requests
  listPullRequests: (): Promise<PullRequest[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.PR_LIST),
  refreshPullRequests: (): Promise<PullRequest[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.PR_REFRESH),
  openPullRequest: (url: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.PR_OPEN, url),

  // Windows
  openSettings: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_SETTINGS),
  closeSettings: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.CLOSE_SETTINGS),
  quitApp: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.QUIT_APP),

  // Updates
  checkForUpdates: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CHECK),
  quitAndInstall: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_INSTALL),

  // Events
  onPullRequestsUpdated: (
    callback: (prs: PullRequest[]) => void,
  ): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, prs: PullRequest[]): void =>
      callback(prs);
    ipcRenderer.on(IPC_CHANNELS.PR_UPDATED, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.PR_UPDATED, listener);
    };
  },

  // Navigation events
  onNavigateToSettings: (callback: () => void): (() => void) => {
    const listener = (): void => callback();
    ipcRenderer.on(IPC_CHANNELS.NAVIGATE_TO_SETTINGS, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.NAVIGATE_TO_SETTINGS, listener);
    };
  },
  onNavigateToMain: (callback: () => void): (() => void) => {
    const listener = (): void => callback();
    ipcRenderer.on(IPC_CHANNELS.NAVIGATE_TO_MAIN, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.NAVIGATE_TO_MAIN, listener);
    };
  },
};

contextBridge.exposeInMainWorld("api", api);
