import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { Notification, shell } from "electron";

// Mock electron before importing notifier
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
import { createMainWindow } from "./windows";
import { notifyNewPR, notifyReminder, notifyError } from "./notifier";
import type { PullRequest } from "../shared/types";

const MockNotification = Notification as unknown as Mock;
const mockShellOpenExternal = shell.openExternal as Mock;
const mockCreateMainWindow = createMainWindow as Mock;

describe("Notifier", () => {
  let mockNotificationInstance: {
    on: Mock;
    show: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock Notification instance
    mockNotificationInstance = {
      on: vi.fn(),
      show: vi.fn(),
    };

    MockNotification.mockReturnValue(mockNotificationInstance);
  });

  describe("notifyNewPR", () => {
    it("creates notification with PR details", () => {
      const pr: PullRequest = {
        id: "pr1",
        repositoryName: "owner/repo",
        prNumber: 123,
        title: "Test PR",
        url: "https://github.com/owner/repo/pull/123",
        author: "testuser",
        createdAt: "2024-01-01T00:00:00Z",
      };

      notifyNewPR(pr);

      expect(MockNotification).toHaveBeenCalledWith({
        title: "New PR Review Request",
        body: "owner/repo: #123 Test PR\nby @testuser",
        silent: false,
      });
      expect(mockNotificationInstance.show).toHaveBeenCalled();
    });

    it("sets up click handler to open PR URL", () => {
      const pr: PullRequest = {
        id: "pr1",
        repositoryName: "owner/repo",
        prNumber: 123,
        title: "Test PR",
        url: "https://github.com/owner/repo/pull/123",
        author: "testuser",
        createdAt: "2024-01-01T00:00:00Z",
      };

      notifyNewPR(pr);

      expect(mockNotificationInstance.on).toHaveBeenCalledWith(
        "click",
        expect.any(Function),
      );

      // Simulate notification click
      const clickHandler = mockNotificationInstance.on.mock.calls.find(
        (call) => call[0] === "click",
      )[1];
      clickHandler();

      expect(mockShellOpenExternal).toHaveBeenCalledWith(
        "https://github.com/owner/repo/pull/123",
      );
    });
  });

  describe("notifyReminder", () => {
    it("does not show notification for empty PR list", () => {
      notifyReminder([]);

      expect(MockNotification).not.toHaveBeenCalled();
      expect(mockNotificationInstance.show).not.toHaveBeenCalled();
    });

    it("shows single PR details for one PR", () => {
      const prs: PullRequest[] = [
        {
          id: "pr1",
          repositoryName: "owner/repo",
          prNumber: 123,
          title: "Test PR",
          url: "https://github.com/owner/repo/pull/123",
          author: "testuser",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      notifyReminder(prs);

      expect(MockNotification).toHaveBeenCalledWith({
        title: "PR Review Reminder",
        body: "owner/repo: #123 Test PR",
        silent: false,
      });
      expect(mockNotificationInstance.show).toHaveBeenCalled();
    });

    it("shows PR count for multiple PRs", () => {
      const prs: PullRequest[] = [
        {
          id: "pr1",
          repositoryName: "owner/repo1",
          prNumber: 123,
          title: "Test PR 1",
          url: "https://github.com/owner/repo1/pull/123",
          author: "testuser",
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "pr2",
          repositoryName: "owner/repo2",
          prNumber: 456,
          title: "Test PR 2",
          url: "https://github.com/owner/repo2/pull/456",
          author: "testuser",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      notifyReminder(prs);

      expect(MockNotification).toHaveBeenCalledWith({
        title: "PR Review Reminder",
        body: "You have 2 PRs waiting for your review",
        silent: false,
      });
      expect(mockNotificationInstance.show).toHaveBeenCalled();
    });

    it("opens PR URL when clicking on single PR reminder", () => {
      const prs: PullRequest[] = [
        {
          id: "pr1",
          repositoryName: "owner/repo",
          prNumber: 123,
          title: "Test PR",
          url: "https://github.com/owner/repo/pull/123",
          author: "testuser",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      notifyReminder(prs);

      expect(mockNotificationInstance.on).toHaveBeenCalledWith(
        "click",
        expect.any(Function),
      );

      // Simulate notification click
      const clickHandler = mockNotificationInstance.on.mock.calls.find(
        (call) => call[0] === "click",
      )[1];
      clickHandler();

      expect(mockShellOpenExternal).toHaveBeenCalledWith(
        "https://github.com/owner/repo/pull/123",
      );
    });

    it("does not navigate when clicking on multiple PR reminder", () => {
      const prs: PullRequest[] = [
        {
          id: "pr1",
          repositoryName: "owner/repo1",
          prNumber: 123,
          title: "Test PR 1",
          url: "https://github.com/owner/repo1/pull/123",
          author: "testuser",
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "pr2",
          repositoryName: "owner/repo2",
          prNumber: 456,
          title: "Test PR 2",
          url: "https://github.com/owner/repo2/pull/456",
          author: "testuser",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      notifyReminder(prs);

      expect(mockNotificationInstance.on).toHaveBeenCalledWith(
        "click",
        expect.any(Function),
      );

      // Simulate notification click
      const clickHandler = mockNotificationInstance.on.mock.calls.find(
        (call) => call[0] === "click",
      )[1];
      clickHandler();

      // Should not open external link or create window
      expect(mockShellOpenExternal).not.toHaveBeenCalled();
      expect(mockCreateMainWindow).not.toHaveBeenCalled();
    });
  });

  describe("notifyError", () => {
    it("creates silent notification with error details", () => {
      notifyError("Error Title", "Error message details");

      expect(MockNotification).toHaveBeenCalledWith({
        title: "Error Title",
        body: "Error message details",
        silent: true,
      });
      expect(mockNotificationInstance.show).toHaveBeenCalled();
    });

    it("does not set up click handler", () => {
      notifyError("Error", "Something went wrong");

      expect(mockNotificationInstance.on).not.toHaveBeenCalled();
    });
  });
});
