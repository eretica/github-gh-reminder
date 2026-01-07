export interface Repository {
  id: string;
  path: string;
  name: string;
  enabled: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  // Notification settings per repository
  notifyOnNew: boolean;
  enableReminder: boolean;
  reminderIntervalHours: number;
  notificationPriority: "low" | "normal" | "high";
  silent: boolean; // Do Not Disturb mode
}

export interface PullRequest {
  id: string;
  repositoryId: string;
  repositoryName: string;
  prNumber: number;
  title: string;
  url: string;
  author: string;
  createdAt: string;
  firstSeenAt: string;
  notifiedAt: string | null;
  lastRemindedAt: string | null;
}

export interface Settings {
  notifyOnNew: boolean;
  enableReminder: boolean;
  reminderIntervalHours: number;
  checkIntervalMinutes: number;
}

export const DEFAULT_SETTINGS: Settings = {
  notifyOnNew: true,
  enableReminder: true,
  reminderIntervalHours: 1,
  checkIntervalMinutes: 5,
};

export interface RepositoryNotificationSettings {
  notifyOnNew: boolean;
  enableReminder: boolean;
  reminderIntervalHours: number;
  notificationPriority: "low" | "normal" | "high";
  silent: boolean;
}

export interface IpcApi {
  // Repository
  listRepositories(): Promise<Repository[]>;
  addRepository(path: string): Promise<Repository>;
  removeRepository(id: string): Promise<void>;
  toggleRepository(id: string, enabled: boolean): Promise<void>;
  reorderRepositories(ids: string[]): Promise<void>;
  updateRepositoryNotificationSettings(
    id: string,
    settings: Partial<RepositoryNotificationSettings>
  ): Promise<void>;

  // Settings
  getSettings(): Promise<Settings>;
  setSettings(settings: Settings): Promise<void>;

  // Pull Requests
  listPullRequests(): Promise<PullRequest[]>;
  refreshPullRequests(): Promise<PullRequest[]>;
  openPullRequest(url: string): Promise<void>;

  // Windows
  openSettings(): Promise<void>;
  closeSettings(): Promise<void>;
  quitApp(): Promise<void>;

  // Events
  onPullRequestsUpdated(callback: (prs: PullRequest[]) => void): () => void;
}

export const IPC_CHANNELS = {
  REPO_LIST: "repo:list",
  REPO_ADD: "repo:add",
  REPO_REMOVE: "repo:remove",
  REPO_TOGGLE: "repo:toggle",
  REPO_REORDER: "repo:reorder",
  REPO_UPDATE_NOTIFICATION_SETTINGS: "repo:update-notification-settings",
  SETTINGS_GET: "settings:get",
  SETTINGS_SET: "settings:set",
  PR_LIST: "pr:list",
  PR_REFRESH: "pr:refresh",
  PR_OPEN: "pr:open",
  PR_UPDATED: "pr:updated",
  OPEN_SETTINGS: "window:open-settings",
  CLOSE_SETTINGS: "window:close-settings",
  QUIT_APP: "app:quit",
} as const;
