import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { PullRequest } from "../shared/types";

// Mock dependencies before importing tray
vi.mock("electron", () => ({
  nativeImage: {
    createFromPath: vi.fn(() => ({
      setTemplateImage: vi.fn(),
    })),
    createEmpty: vi.fn(() => ({
      setTemplateImage: vi.fn(),
    })),
  },
  shell: {
    openExternal: vi.fn(),
  },
  Tray: vi.fn(),
}));

vi.mock("./windows", () => ({
  createMainWindow: vi.fn(),
  setTrayBounds: vi.fn(),
}));

// Import after mocks
import { shell, Tray } from "electron";
import {
  createTray,
  destroyTray,
  getCurrentPRs,
  getTray,
  updateTrayMenu,
} from "./tray";
import { createMainWindow, setTrayBounds } from "./windows";

const mockTray = Tray as unknown as Mock;
const mockCreateMainWindow = createMainWindow as Mock;
const mockSetTrayBounds = setTrayBounds as Mock;
const mockShellOpenExternal = shell.openExternal as Mock;

describe("Tray", () => {
  let mockTrayInstance: {
    setToolTip: Mock;
    on: Mock;
    setImage: Mock;
    setTitle: Mock;
    destroy: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock tray instance
    mockTrayInstance = {
      setToolTip: vi.fn(),
      on: vi.fn(),
      setImage: vi.fn(),
      setTitle: vi.fn(),
      destroy: vi.fn(),
    };

    mockTray.mockReturnValue(mockTrayInstance);
  });

  describe("createTray", () => {
    it("creates tray with correct tooltip", () => {
      createTray();

      expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith("PR Reminder");
    });

    it("always shows menu window on click, regardless of PR count", () => {
      createTray();

      // Get the click handler
      const clickHandler = mockTrayInstance.on.mock.calls.find(
        (call) => call[0] === "click",
      )?.[1];

      expect(clickHandler).toBeDefined();

      // Simulate click with bounds
      const mockBounds = { x: 100, y: 100, width: 20, height: 20 };
      clickHandler?.(undefined, mockBounds);

      // Should always set bounds and create window
      expect(mockSetTrayBounds).toHaveBeenCalledWith(mockBounds);
      expect(mockCreateMainWindow).toHaveBeenCalled();
      expect(mockShellOpenExternal).not.toHaveBeenCalled();
    });

    it("returns existing tray if already created", () => {
      const tray1 = createTray();
      const tray2 = createTray();

      expect(tray1).toBe(tray2);
      expect(mockTray).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateTrayMenu", () => {
    it("updates icon and title when PRs exist", () => {
      createTray();

      const mockPRs: PullRequest[] = [
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

      updateTrayMenu(mockPRs);

      expect(mockTrayInstance.setImage).toHaveBeenCalled();
      expect(mockTrayInstance.setTitle).toHaveBeenCalledWith("1");
    });

    it("updates icon and clears title when no PRs", () => {
      createTray();

      updateTrayMenu([]);

      expect(mockTrayInstance.setImage).toHaveBeenCalled();
      expect(mockTrayInstance.setTitle).toHaveBeenCalledWith("");
    });

    it("shows correct count for multiple PRs", () => {
      createTray();

      const mockPRs: PullRequest[] = [
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

      updateTrayMenu(mockPRs);

      expect(mockTrayInstance.setTitle).toHaveBeenCalledWith("2");
    });

    it("does nothing if tray not created", () => {
      updateTrayMenu([]);

      expect(mockTrayInstance.setImage).not.toHaveBeenCalled();
    });
  });

  describe("getCurrentPRs", () => {
    it("returns empty array initially", () => {
      expect(getCurrentPRs()).toEqual([]);
    });

    it("returns PRs after updateTrayMenu", () => {
      createTray();

      const mockPRs: PullRequest[] = [
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

      updateTrayMenu(mockPRs);

      expect(getCurrentPRs()).toEqual(mockPRs);
    });
  });

  describe("destroyTray", () => {
    it("destroys tray instance", () => {
      createTray();
      destroyTray();

      expect(mockTrayInstance.destroy).toHaveBeenCalled();
    });

    it("allows creating new tray after destroy", () => {
      createTray();
      destroyTray();

      mockTray.mockClear();
      createTray();

      expect(mockTray).toHaveBeenCalledTimes(1);
    });

    it("does nothing if tray not created", () => {
      destroyTray();

      expect(mockTrayInstance.destroy).not.toHaveBeenCalled();
    });
  });

  describe("getTray", () => {
    it("returns null initially", () => {
      expect(getTray()).toBeNull();
    });

    it("returns tray instance after creation", () => {
      createTray();

      expect(getTray()).toBe(mockTrayInstance);
    });

    it("returns null after destroy", () => {
      createTray();
      destroyTray();

      expect(getTray()).toBeNull();
    });
  });
});
