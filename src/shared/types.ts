export interface Repository {
  id: string;
  path: string;
  name: string;
  enabled: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
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
  // Extended PR details
  isDraft?: boolean;
  state?: string;
  reviewDecision?: string | null;
  reviewRequestsCount?: number;
  commentsCount?: number;
  changedFiles?: number;
  mergeable?: string;
  statusCheckRollup?: {
    state: string;
  } | null;
}

export interface Settings {
  notifyOnNew: boolean;
  enableReminder: boolean;
  reminderIntervalHours: number;
  checkIntervalMinutes: number;
  showRefreshToast: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  notifyOnNew: true,
  enableReminder: true,
  reminderIntervalHours: 1,
  checkIntervalMinutes: 5,
  showRefreshToast: true,
};

export interface IpcApi {
  // Repository
  listRepositories(): Promise<Repository[]>;
  addRepository(path: string): Promise<Repository>;
  removeRepository(id: string): Promise<void>;
  toggleRepository(id: string, enabled: boolean): Promise<void>;
  reorderRepositories(ids: string[]): Promise<void>;

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

  // Updates
  checkForUpdates(): Promise<void>;
  quitAndInstall(): Promise<void>;

  // Events
  onPullRequestsUpdated(callback: (prs: PullRequest[]) => void): () => void;
  onNavigateToSettings(callback: () => void): () => void;
  onNavigateToMain(callback: () => void): () => void;
}

export const IPC_CHANNELS = {
  REPO_LIST: "repo:list",
  REPO_ADD: "repo:add",
  REPO_REMOVE: "repo:remove",
  REPO_TOGGLE: "repo:toggle",
  REPO_REORDER: "repo:reorder",
  SETTINGS_GET: "settings:get",
  SETTINGS_SET: "settings:set",
  PR_LIST: "pr:list",
  PR_REFRESH: "pr:refresh",
  PR_OPEN: "pr:open",
  PR_UPDATED: "pr:updated",
  OPEN_SETTINGS: "window:open-settings",
  CLOSE_SETTINGS: "window:close-settings",
  QUIT_APP: "app:quit",
  UPDATE_CHECK: "update:check",
  UPDATE_INSTALL: "update:install",
  // Navigation events (renderer -> renderer via main)
  NAVIGATE_TO_SETTINGS: "navigate:to-settings",
  NAVIGATE_TO_MAIN: "navigate:to-main",
} as const;
