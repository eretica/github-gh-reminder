import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PullRequest } from "../shared/types";

// Mock electron to prevent import errors
vi.mock("electron", () => ({
  Notification: vi.fn(),
  shell: { openExternal: vi.fn() },
}));

// Mock windows module to prevent import errors
vi.mock("./windows", () => ({
  createMainWindow: vi.fn(),
  setTrayBounds: vi.fn(),
}));

// Mock tray module to prevent import errors
vi.mock("./tray", () => ({
  getTray: vi.fn(),
}));

// Mock sound module to prevent import errors
vi.mock("./sound", () => ({
  playSound: vi.fn(),
}));

import {
  type NotifierDeps,
  notifyError,
  notifyNewPR,
  notifyReminder,
} from "./notifier";

// Helper to create mock dependencies
function createMockDeps(): NotifierDeps & {
  mockNotification: {
    on: ReturnType<typeof vi.fn>;
    show: ReturnType<typeof vi.fn>;
  };
  clickHandler: (() => void) | null;
  lastOptions: { title: string; body: string; silent: boolean } | null;
} {
  let clickHandler: (() => void) | null = null;
  let lastOptions: { title: string; body: string; silent: boolean } | null =
    null;

  const mockNotification = {
    on: vi.fn((event: string, handler: () => void) => {
      if (event === "click") {
        clickHandler = handler;
      }
    }),
    show: vi.fn(),
  };

  return {
    createNotification: vi.fn((options) => {
      lastOptions = options;
      return mockNotification;
    }),
    openExternal: vi.fn(),
    getTray: vi.fn(),
    setTrayBounds: vi.fn(),
    createMainWindow: vi.fn(),
    getSettings: vi.fn(async () => ({
      notifyOnNew: true,
      enableReminder: true,
      reminderIntervalHours: 4,
      checkIntervalMinutes: 5,
      notificationSound: true,
      notificationSoundName: "Basso",
    })),
    mockNotification,
    get clickHandler() {
      return clickHandler;
    },
    get lastOptions() {
      return lastOptions;
    },
  };
}

describe("notifier", () => {
  let mockDeps: ReturnType<typeof createMockDeps>;

  beforeEach(() => {
    mockDeps = createMockDeps();
  });

  describe("notifyNewPR", () => {
    const mockPR: PullRequest = {
      id: "pr-1",
      repositoryId: "repo-1",
      repositoryName: "owner/repo",
      prNumber: 123,
      title: "Test PR",
      url: "https://github.com/owner/repo/pull/123",
      author: "testuser",
      createdAt: "2024-01-01T00:00:00Z",
      firstSeenAt: "2024-01-01T00:00:00Z",
      notifiedAt: null,
      lastRemindedAt: null,
    };

    it("creates notification with correct title and body", async () => {
      await notifyNewPR(mockPR, mockDeps);

      expect(mockDeps.lastOptions).toEqual({
        title: "New PR Review Request",
        body: "owner/repo: #123 Test PR\nby @testuser",
        silent: false,
      });
    });

    it("shows the notification", async () => {
      await notifyNewPR(mockPR, mockDeps);

      expect(mockDeps.mockNotification.show).toHaveBeenCalled();
    });

    it("opens PR URL in browser on click", async () => {
      await notifyNewPR(mockPR, mockDeps);

      expect(mockDeps.clickHandler).not.toBeNull();
      mockDeps.clickHandler!();

      expect(mockDeps.openExternal).toHaveBeenCalledWith(
        "https://github.com/owner/repo/pull/123",
      );
    });

    it("handles error when opening URL fails", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockDeps.openExternal = vi.fn().mockImplementation(() => {
        throw new Error("Failed to open external URL");
      });

      await notifyNewPR(mockPR, mockDeps);
      mockDeps.clickHandler!();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to open URL"),
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("notifyReminder", () => {
    const mockSinglePR: PullRequest = {
      id: "pr-1",
      repositoryId: "repo-1",
      repositoryName: "owner/repo",
      prNumber: 123,
      title: "Test PR",
      url: "https://github.com/owner/repo/pull/123",
      author: "testuser",
      createdAt: "2024-01-01T00:00:00Z",
      firstSeenAt: "2024-01-01T00:00:00Z",
      notifiedAt: null,
      lastRemindedAt: null,
    };

    const mockMultiplePRs: PullRequest[] = [
      {
        id: "pr-1",
        repositoryId: "repo-1",
        repositoryName: "owner/repo1",
        prNumber: 123,
        title: "First PR",
        url: "https://github.com/owner/repo1/pull/123",
        author: "user1",
        createdAt: "2024-01-01T00:00:00Z",
        firstSeenAt: "2024-01-01T00:00:00Z",
        notifiedAt: null,
        lastRemindedAt: null,
      },
      {
        id: "pr-2",
        repositoryId: "repo-2",
        repositoryName: "owner/repo2",
        prNumber: 456,
        title: "Second PR",
        url: "https://github.com/owner/repo2/pull/456",
        author: "user2",
        createdAt: "2024-01-02T00:00:00Z",
        firstSeenAt: "2024-01-02T00:00:00Z",
        notifiedAt: null,
        lastRemindedAt: null,
      },
    ];

    it("does not show notification when no PRs", () => {
      notifyReminder([], mockDeps);

      expect(mockDeps.createNotification).not.toHaveBeenCalled();
    });

    it("creates notification with single PR details", async () => {
      await notifyReminder([mockSinglePR], mockDeps);

      expect(mockDeps.lastOptions).toEqual({
        title: "PR Review Reminder",
        body: "owner/repo: #123 Test PR",
        silent: false,
      });
    });

    it("creates notification with multiple PR count", async () => {
      await notifyReminder(mockMultiplePRs, mockDeps);

      expect(mockDeps.lastOptions).toEqual({
        title: "PR Review Reminder",
        body: "You have 2 PRs waiting for your review",
        silent: false,
      });
    });

    it("opens PR URL in browser on click for single PR", async () => {
      await notifyReminder([mockSinglePR], mockDeps);

      mockDeps.clickHandler!();

      expect(mockDeps.openExternal).toHaveBeenCalledWith(
        "https://github.com/owner/repo/pull/123",
      );
      expect(mockDeps.createMainWindow).not.toHaveBeenCalled();
    });

    it("opens menu window on click for multiple PRs", async () => {
      const mockTrayBounds = { x: 100, y: 0, width: 22, height: 22 };
      mockDeps.getTray = vi.fn().mockReturnValue({
        getBounds: () => mockTrayBounds,
      });

      await notifyReminder(mockMultiplePRs, mockDeps);

      mockDeps.clickHandler!();

      expect(mockDeps.openExternal).not.toHaveBeenCalled();
      expect(mockDeps.setTrayBounds).toHaveBeenCalledWith(mockTrayBounds);
      expect(mockDeps.createMainWindow).toHaveBeenCalled();
    });

    it("opens menu window on click for multiple PRs even without tray", async () => {
      mockDeps.getTray = vi.fn().mockReturnValue(null);

      await notifyReminder(mockMultiplePRs, mockDeps);

      mockDeps.clickHandler!();

      expect(mockDeps.openExternal).not.toHaveBeenCalled();
      expect(mockDeps.setTrayBounds).not.toHaveBeenCalled();
      expect(mockDeps.createMainWindow).toHaveBeenCalled();
    });

    it("handles error when opening single PR URL fails", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockDeps.openExternal = vi.fn().mockImplementation(() => {
        throw new Error("Failed to open external URL");
      });

      await notifyReminder([mockSinglePR], mockDeps);
      mockDeps.clickHandler!();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to open URL"),
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("notifyError", () => {
    it("creates notification with correct title and body", () => {
      notifyError("Error Title", "Error message", mockDeps);

      expect(mockDeps.lastOptions).toEqual({
        title: "Error Title",
        body: "Error message",
        silent: true,
      });
    });

    it("shows the notification", () => {
      notifyError("Error Title", "Error message", mockDeps);

      expect(mockDeps.mockNotification.show).toHaveBeenCalled();
    });
  });
});
