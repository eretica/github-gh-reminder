import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { Tray } from "electron";

// Mock electron before importing tray
vi.mock("electron", () => ({
  Tray: vi.fn(),
  nativeImage: {
    createFromPath: vi.fn(() => ({
      setTemplateImage: vi.fn(),
    })),
    createEmpty: vi.fn(() => ({
      setTemplateImage: vi.fn(),
    })),
  },
}));

vi.mock("./windows", () => ({
  createMainWindow: vi.fn(),
  setTrayBounds: vi.fn(),
}));

// Import after mocks
import { createMainWindow, setTrayBounds } from "./windows";
import {
  createTray,
  destroyTray,
  getCurrentPRs,
  getTray,
  updateTrayMenu,
} from "./tray";
import type { PullRequest } from "../shared/types";

const mockCreateMainWindow = createMainWindow as Mock;
const mockSetTrayBounds = setTrayBounds as Mock;
const MockTray = Tray as unknown as Mock;

describe("Tray", () => {
  let mockTrayInstance: {
    on: Mock;
    setToolTip: Mock;
    setImage: Mock;
    setTitle: Mock;
    destroy: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset module state by destroying tray
    destroyTray();

    // Setup mock Tray instance
    mockTrayInstance = {
      on: vi.fn(),
      setToolTip: vi.fn(),
      setImage: vi.fn(),
      setTitle: vi.fn(),
      destroy: vi.fn(),
    };

    MockTray.mockReturnValue(mockTrayInstance);
  });

  describe("createTray", () => {
    it("creates tray with proper initialization", () => {
      const tray = createTray();

      expect(MockTray).toHaveBeenCalledWith(expect.any(Object));
      expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith("PR Reminder");
      expect(tray).toBe(mockTrayInstance);
    });

    it("returns existing tray on second call (singleton pattern)", () => {
      const tray1 = createTray();
      const tray2 = createTray();

      expect(tray1).toBe(tray2);
      expect(MockTray).toHaveBeenCalledTimes(1);
    });

    it("sets up click handler to show menu window", () => {
      createTray();

      expect(mockTrayInstance.on).toHaveBeenCalledWith(
        "click",
        expect.any(Function),
      );

      // Simulate tray click
      const clickHandler = mockTrayInstance.on.mock.calls.find(
        (call) => call[0] === "click",
      )[1];

      const mockBounds = { x: 100, y: 200, width: 20, height: 20 };
      clickHandler({}, mockBounds);

      expect(mockSetTrayBounds).toHaveBeenCalledWith(mockBounds);
      expect(mockCreateMainWindow).toHaveBeenCalled();
    });

    it("always shows menu window on click regardless of PR count", () => {
      createTray();

      const clickHandler = mockTrayInstance.on.mock.calls.find(
        (call) => call[0] === "click",
      )[1];

      const mockBounds = { x: 100, y: 200, width: 20, height: 20 };

      // Click with no PRs
      updateTrayMenu([]);
      clickHandler({}, mockBounds);
      expect(mockCreateMainWindow).toHaveBeenCalledTimes(1);

      // Click with single PR
      const singlePR: PullRequest = {
        id: "pr1",
        repositoryName: "owner/repo",
        prNumber: 123,
        title: "Test PR",
        url: "https://github.com/owner/repo/pull/123",
        author: "testuser",
        createdAt: "2024-01-01T00:00:00Z",
      };
      updateTrayMenu([singlePR]);
      clickHandler({}, mockBounds);
      expect(mockCreateMainWindow).toHaveBeenCalledTimes(2);

      // Click with multiple PRs
      updateTrayMenu([singlePR, { ...singlePR, id: "pr2", prNumber: 456 }]);
      clickHandler({}, mockBounds);
      expect(mockCreateMainWindow).toHaveBeenCalledTimes(3);
    });
  });

  describe("updateTrayMenu", () => {
    beforeEach(() => {
      createTray();
      vi.clearAllMocks();
    });

    it("updates icon and title when PRs exist", () => {
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
        {
          id: "pr2",
          repositoryName: "owner/repo",
          prNumber: 456,
          title: "Another PR",
          url: "https://github.com/owner/repo/pull/456",
          author: "testuser",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      updateTrayMenu(prs);

      expect(mockTrayInstance.setImage).toHaveBeenCalled();
      expect(mockTrayInstance.setTitle).toHaveBeenCalledWith("2");
    });

    it("clears title when no PRs exist", () => {
      updateTrayMenu([]);

      expect(mockTrayInstance.setImage).toHaveBeenCalled();
      expect(mockTrayInstance.setTitle).toHaveBeenCalledWith("");
    });

    it("does nothing if tray is not initialized", () => {
      destroyTray();

      updateTrayMenu([
        {
          id: "pr1",
          repositoryName: "owner/repo",
          prNumber: 123,
          title: "Test PR",
          url: "https://github.com/owner/repo/pull/123",
          author: "testuser",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ]);

      // Should not throw error
      expect(mockTrayInstance.setImage).not.toHaveBeenCalled();
    });
  });

  describe("getCurrentPRs", () => {
    it("returns empty array initially", () => {
      expect(getCurrentPRs()).toEqual([]);
    });

    it("returns PRs after updateTrayMenu", () => {
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

      createTray();
      updateTrayMenu(prs);

      expect(getCurrentPRs()).toEqual(prs);
    });
  });

  describe("destroyTray", () => {
    it("destroys tray and clears reference", () => {
      createTray();

      destroyTray();

      expect(mockTrayInstance.destroy).toHaveBeenCalled();
      expect(getTray()).toBeNull();
    });

    it("allows creating new tray after destroy", () => {
      createTray();
      destroyTray();

      vi.clearAllMocks();
      const newTray = createTray();

      expect(MockTray).toHaveBeenCalledTimes(1);
      expect(newTray).toBe(mockTrayInstance);
    });

    it("does nothing if tray is already null", () => {
      destroyTray();
      destroyTray();

      // Should not throw error
      expect(mockTrayInstance.destroy).not.toHaveBeenCalled();
    });
  });

  describe("getTray", () => {
    it("returns null when tray is not created", () => {
      expect(getTray()).toBeNull();
    });

    it("returns tray instance when created", () => {
      const tray = createTray();

      expect(getTray()).toBe(tray);
    });

    it("returns null after destroy", () => {
      createTray();
      destroyTray();

      expect(getTray()).toBeNull();
    });
  });
});
