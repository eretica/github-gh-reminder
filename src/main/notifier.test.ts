import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { PullRequest } from "../shared/types";

// Mock dependencies before importing notifier
vi.mock("electron", () => ({
  Notification: vi.fn(),
  shell: {
    openExternal: vi.fn(),
  },
}));

vi.mock("./windows", () => ({
  createMainWindow: vi.fn(),
}));

// Import after mocks
import { Notification, shell } from "electron";
import { notifyError, notifyNewPR, notifyReminder } from "./notifier";
import { createMainWindow } from "./windows";

const mockNotification = Notification as unknown as Mock;
const mockShellOpenExternal = shell.openExternal as Mock;
const mockCreateMainWindow = createMainWindow as Mock;

describe("Notifier", () => {
  let mockNotificationInstance: {
    on: Mock;
    show: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock notification instance
    mockNotificationInstance = {
      on: vi.fn(),
      show: vi.fn(),
    };

    mockNotification.mockReturnValue(mockNotificationInstance);
  });

  describe("notifyNewPR", () => {
    it("creates notification with correct title and body", () => {
      const pr: PullRequest = {
        id: "pr1",
        repositoryId: "repo1",
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

      notifyNewPR(pr);

      expect(mockNotification).toHaveBeenCalledWith({
        title: "New PR Review Request",
        body: "owner/repo: #123 Test PR\nby @testuser",
        silent: false,
      });
      expect(mockNotificationInstance.show).toHaveBeenCalled();
    });

    it("opens PR URL when notification is clicked", () => {
      const pr: PullRequest = {
        id: "pr1",
        repositoryId: "repo1",
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

      notifyNewPR(pr);

      // Get the click handler
      const clickHandler = mockNotificationInstance.on.mock.calls.find(
        (call) => call[0] === "click",
      )?.[1];

      expect(clickHandler).toBeDefined();

      // Simulate click
      clickHandler?.();

      expect(mockShellOpenExternal).toHaveBeenCalledWith(pr.url);
    });
  });

  describe("notifyReminder", () => {
    it("does nothing when no PRs", () => {
      notifyReminder([]);

      expect(mockNotification).not.toHaveBeenCalled();
    });

    it("shows single PR details for one PR", () => {
      const prs: PullRequest[] = [
        {
          id: "pr1",
          repositoryId: "repo1",
          repositoryName: "owner/repo",
          prNumber: 123,
          title: "Test PR",
          url: "https://github.com/owner/repo/pull/123",
          author: "testuser",
          createdAt: "2024-01-01T00:00:00Z",
          firstSeenAt: "2024-01-01T00:00:00Z",
          notifiedAt: null,
          lastRemindedAt: null,
        },
      ];

      notifyReminder(prs);

      expect(mockNotification).toHaveBeenCalledWith({
        title: "PR Review Reminder",
        body: "owner/repo: #123 Test PR",
        silent: false,
      });
      expect(mockNotificationInstance.show).toHaveBeenCalled();
    });

    it("shows count for multiple PRs", () => {
      const prs: PullRequest[] = [
        {
          id: "pr1",
          repositoryId: "repo1",
          repositoryName: "owner/repo1",
          prNumber: 123,
          title: "Test PR 1",
          url: "https://github.com/owner/repo1/pull/123",
          author: "user1",
          createdAt: "2024-01-01T00:00:00Z",
          firstSeenAt: "2024-01-01T00:00:00Z",
          notifiedAt: null,
          lastRemindedAt: null,
        },
        {
          id: "pr2",
          repositoryId: "repo2",
          repositoryName: "owner/repo2",
          prNumber: 456,
          title: "Test PR 2",
          url: "https://github.com/owner/repo2/pull/456",
          author: "user2",
          createdAt: "2024-01-01T00:00:00Z",
          firstSeenAt: "2024-01-01T00:00:00Z",
          notifiedAt: null,
          lastRemindedAt: null,
        },
      ];

      notifyReminder(prs);

      expect(mockNotification).toHaveBeenCalledWith({
        title: "PR Review Reminder",
        body: "You have 2 PRs waiting for your review",
        silent: false,
      });
    });

    it("opens GitHub URL when single PR notification is clicked", () => {
      const prs: PullRequest[] = [
        {
          id: "pr1",
          repositoryId: "repo1",
          repositoryName: "owner/repo",
          prNumber: 123,
          title: "Test PR",
          url: "https://github.com/owner/repo/pull/123",
          author: "testuser",
          createdAt: "2024-01-01T00:00:00Z",
          firstSeenAt: "2024-01-01T00:00:00Z",
          notifiedAt: null,
          lastRemindedAt: null,
        },
      ];

      notifyReminder(prs);

      // Get the click handler
      const clickHandler = mockNotificationInstance.on.mock.calls.find(
        (call) => call[0] === "click",
      )?.[1];

      expect(clickHandler).toBeDefined();

      // Simulate click
      clickHandler?.();

      expect(mockShellOpenExternal).toHaveBeenCalledWith(prs[0].url);
      expect(mockCreateMainWindow).not.toHaveBeenCalled();
    });

    it("opens menu window when multiple PR notification is clicked", () => {
      const prs: PullRequest[] = [
        {
          id: "pr1",
          repositoryId: "repo1",
          repositoryName: "owner/repo1",
          prNumber: 123,
          title: "Test PR 1",
          url: "https://github.com/owner/repo1/pull/123",
          author: "user1",
          createdAt: "2024-01-01T00:00:00Z",
          firstSeenAt: "2024-01-01T00:00:00Z",
          notifiedAt: null,
          lastRemindedAt: null,
        },
        {
          id: "pr2",
          repositoryId: "repo2",
          repositoryName: "owner/repo2",
          prNumber: 456,
          title: "Test PR 2",
          url: "https://github.com/owner/repo2/pull/456",
          author: "user2",
          createdAt: "2024-01-01T00:00:00Z",
          firstSeenAt: "2024-01-01T00:00:00Z",
          notifiedAt: null,
          lastRemindedAt: null,
        },
      ];

      notifyReminder(prs);

      // Get the click handler
      const clickHandler = mockNotificationInstance.on.mock.calls.find(
        (call) => call[0] === "click",
      )?.[1];

      expect(clickHandler).toBeDefined();

      // Simulate click
      clickHandler?.();

      expect(mockCreateMainWindow).toHaveBeenCalled();
      expect(mockShellOpenExternal).not.toHaveBeenCalled();
    });
  });

  describe("notifyError", () => {
    it("creates silent notification with title and message", () => {
      notifyError("Error Title", "Error message details");

      expect(mockNotification).toHaveBeenCalledWith({
        title: "Error Title",
        body: "Error message details",
        silent: true,
      });
      expect(mockNotificationInstance.show).toHaveBeenCalled();
    });
  });
});
