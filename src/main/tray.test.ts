import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PullRequest } from "../shared/types";

// Mock electron to prevent import errors
vi.mock("electron", () => ({
  nativeImage: {
    createFromPath: vi.fn().mockReturnValue({ setTemplateImage: vi.fn() }),
    createEmpty: vi.fn().mockReturnValue({ setTemplateImage: vi.fn() }),
  },
  Tray: vi.fn(),
}));

// Mock windows module to prevent import errors
vi.mock("./windows", () => ({
  createMainWindow: vi.fn(),
  setTrayBounds: vi.fn(),
}));

import {
  createTray,
  destroyTray,
  getCurrentPRs,
  getTray,
  updateTrayMenu,
} from "./tray";

// Helper to create mock dependencies
function createMockDeps() {
  let clickHandler:
    | ((
        event: unknown,
        bounds: { x: number; y: number; width: number; height: number },
      ) => void)
    | null = null;

  const mockTray = {
    setToolTip: vi.fn(),
    setImage: vi.fn(),
    setTitle: vi.fn(),
    destroy: vi.fn(),
    getBounds: vi.fn().mockReturnValue({ x: 100, y: 0, width: 22, height: 22 }),
    on: vi.fn(
      (
        event: string,
        handler: (
          event: unknown,
          bounds: { x: number; y: number; width: number; height: number },
        ) => void,
      ) => {
        if (event === "click") {
          clickHandler = handler;
        }
      },
    ),
  };

  const mockIcon = {
    setTemplateImage: vi.fn(),
  };

  return {
    createTrayInstance: vi.fn().mockReturnValue(mockTray),
    createIcon: vi.fn().mockReturnValue(mockIcon),
    setTrayBounds: vi.fn(),
    createMainWindow: vi.fn(),
    mockTray,
    mockIcon,
    get clickHandler() {
      return clickHandler;
    },
  };
}

describe("tray", () => {
  let mockDeps: ReturnType<typeof createMockDeps>;

  beforeEach(() => {
    mockDeps = createMockDeps();
    destroyTray();
  });

  afterEach(() => {
    destroyTray();
  });

  describe("createTray", () => {
    it("creates a new tray", () => {
      const tray = createTray(mockDeps);

      expect(tray).toBeDefined();
      expect(mockDeps.createTrayInstance).toHaveBeenCalled();
    });

    it("sets tooltip on tray", () => {
      createTray(mockDeps);

      expect(mockDeps.mockTray.setToolTip).toHaveBeenCalledWith("PR Reminder");
    });

    it("registers click handler", () => {
      createTray(mockDeps);

      expect(mockDeps.clickHandler).not.toBeNull();
    });

    it("returns existing tray if already created", () => {
      const tray1 = createTray(mockDeps);
      const tray2 = createTray(mockDeps);

      expect(tray1).toBe(tray2);
      expect(mockDeps.createTrayInstance).toHaveBeenCalledTimes(1);
    });
  });

  describe("tray click behavior", () => {
    const mockBounds = { x: 100, y: 0, width: 22, height: 22 };

    it("always opens menu window regardless of PR count (no PRs)", () => {
      createTray(mockDeps);

      mockDeps.clickHandler!({}, mockBounds);

      expect(mockDeps.setTrayBounds).toHaveBeenCalledWith(mockBounds);
      expect(mockDeps.createMainWindow).toHaveBeenCalled();
    });

    it("always opens menu window with single PR (not direct GitHub navigation)", () => {
      createTray(mockDeps);

      const singlePR: PullRequest = {
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

      updateTrayMenu([singlePR]);
      mockDeps.clickHandler!({}, mockBounds);

      // Should always open menu, not navigate to GitHub
      expect(mockDeps.setTrayBounds).toHaveBeenCalledWith(mockBounds);
      expect(mockDeps.createMainWindow).toHaveBeenCalled();
    });

    it("always opens menu window with multiple PRs", () => {
      createTray(mockDeps);

      const multiplePRs: PullRequest[] = [
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

      updateTrayMenu(multiplePRs);
      mockDeps.clickHandler!({}, mockBounds);

      expect(mockDeps.setTrayBounds).toHaveBeenCalledWith(mockBounds);
      expect(mockDeps.createMainWindow).toHaveBeenCalled();
    });

    it("does not crash when click handler is called after tray is destroyed", () => {
      createTray(mockDeps);
      const clickHandler = mockDeps.clickHandler;

      destroyTray();

      // Should not throw error
      expect(() => clickHandler!({}, mockBounds)).not.toThrow();

      // Should not call any methods after destroy
      expect(mockDeps.setTrayBounds).not.toHaveBeenCalled();
      expect(mockDeps.createMainWindow).not.toHaveBeenCalled();
    });
  });

  describe("updateTrayMenu", () => {
    it("updates icon and title for PRs", () => {
      createTray(mockDeps);

      const prs: PullRequest[] = [
        {
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
        },
      ];

      updateTrayMenu(prs);

      expect(mockDeps.createIcon).toHaveBeenCalledWith(true);
      expect(mockDeps.mockTray.setImage).toHaveBeenCalled();
      expect(mockDeps.mockTray.setTitle).toHaveBeenCalledWith("1");
    });

    it("clears title when no PRs", () => {
      createTray(mockDeps);

      updateTrayMenu([]);

      expect(mockDeps.createIcon).toHaveBeenCalledWith(false);
      expect(mockDeps.mockTray.setTitle).toHaveBeenCalledWith("");
    });

    it("does nothing if tray not created", () => {
      // Don't create tray, just call updateTrayMenu
      updateTrayMenu([]);

      expect(mockDeps.mockTray.setTitle).not.toHaveBeenCalled();
    });
  });

  describe("getCurrentPRs", () => {
    it("returns empty array initially", () => {
      expect(getCurrentPRs()).toEqual([]);
    });

    it("returns current PRs after update", () => {
      createTray(mockDeps);

      const prs: PullRequest[] = [
        {
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
        },
      ];

      updateTrayMenu(prs);

      expect(getCurrentPRs()).toEqual(prs);
    });
  });

  describe("destroyTray", () => {
    it("destroys tray and clears reference", () => {
      createTray(mockDeps);

      destroyTray();

      expect(mockDeps.mockTray.destroy).toHaveBeenCalled();
      expect(getTray()).toBeNull();
    });

    it("does nothing if tray not created", () => {
      // destroyTray without creating first
      destroyTray();

      // No error should occur
      expect(getTray()).toBeNull();
    });

    it("clears current PRs", () => {
      createTray(mockDeps);
      updateTrayMenu([
        {
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
        },
      ]);

      destroyTray();

      expect(getCurrentPRs()).toEqual([]);
    });
  });

  describe("getTray", () => {
    it("returns null when tray not created", () => {
      expect(getTray()).toBeNull();
    });

    it("returns tray when created", () => {
      createTray(mockDeps);

      expect(getTray()).toBeDefined();
    });
  });
});
