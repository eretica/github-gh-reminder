import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import type { Settings } from "../shared/types";

// Mock dependencies before importing scheduler
vi.mock("./db", () => ({
  getDatabase: vi.fn(),
}));

vi.mock("./gh-cli", () => ({
  fetchReviewRequestedPRs: vi.fn(),
}));

vi.mock("./notifier", () => ({
  notifyNewPR: vi.fn(),
  notifyReminder: vi.fn(),
}));

vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid"),
}));

// Import after mocks
import { getDatabase } from "./db";
import { fetchReviewRequestedPRs } from "./gh-cli";
import { notifyNewPR, notifyReminder } from "./notifier";
import { scheduler } from "./scheduler";

const mockGetDatabase = getDatabase as Mock;
const mockFetchPRs = fetchReviewRequestedPRs as Mock;
const mockNotifyNewPR = notifyNewPR as Mock;
const mockNotifyReminder = notifyReminder as Mock;

describe("PRScheduler", () => {
  const defaultSettings: Settings = {
    notifyOnNew: true,
    enableReminder: true,
    reminderIntervalHours: 1,
    checkIntervalMinutes: 5,
  };

  let mockDb: {
    select: Mock;
    insert: Mock;
    update: Mock;
    delete: Mock;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Setup mock database
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    // Chain mocks for select
    const mockSelectFrom = vi.fn();
    const mockSelectWhere = vi.fn();
    const mockSelectInnerJoin = vi.fn();

    mockDb.select.mockReturnValue({ from: mockSelectFrom });
    mockSelectFrom.mockReturnValue({
      where: mockSelectWhere,
      innerJoin: mockSelectInnerJoin,
    });
    mockSelectWhere.mockResolvedValue([]);
    mockSelectInnerJoin.mockReturnValue({ where: mockSelectWhere });

    // Chain mocks for insert
    const mockInsertValues = vi.fn();
    mockDb.insert.mockReturnValue({ values: mockInsertValues });
    mockInsertValues.mockResolvedValue(undefined);

    // Chain mocks for update
    const mockUpdateSet = vi.fn();
    const mockUpdateWhere = vi.fn();
    mockDb.update.mockReturnValue({ set: mockUpdateSet });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockResolvedValue(undefined);

    // Chain mocks for delete
    const mockDeleteWhere = vi.fn();
    mockDb.delete.mockReturnValue({ where: mockDeleteWhere });
    mockDeleteWhere.mockResolvedValue(undefined);

    mockGetDatabase.mockReturnValue(mockDb);
    mockFetchPRs.mockResolvedValue({ success: true, prs: [], logs: [] });
  });

  afterEach(() => {
    scheduler.stop();
    vi.useRealTimers();
  });

  describe("start/stop", () => {
    it("starts check interval with correct timing", () => {
      const setIntervalSpy = vi.spyOn(global, "setInterval");

      scheduler.start(defaultSettings);

      // Check interval: 5 minutes = 300000ms
      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        5 * 60 * 1000,
      );
    });

    it("starts reminder interval when enabled", () => {
      const setIntervalSpy = vi.spyOn(global, "setInterval");

      scheduler.start(defaultSettings);

      // Should have 2 intervals: check and reminder
      expect(setIntervalSpy).toHaveBeenCalledTimes(2);
      // Reminder interval: 1 hour = 3600000ms
      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        1 * 60 * 60 * 1000,
      );
    });

    it("does not start reminder interval when disabled", () => {
      const setIntervalSpy = vi.spyOn(global, "setInterval");
      const settings = { ...defaultSettings, enableReminder: false };

      scheduler.start(settings);

      // Only check interval should be set
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    });

    it("stops all intervals", () => {
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      scheduler.start(defaultSettings);
      scheduler.stop();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it("clears existing intervals when start is called again", () => {
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      scheduler.start(defaultSettings);
      scheduler.start(defaultSettings);

      // Should clear previous intervals
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe("restart", () => {
    it("calls start with new settings", () => {
      const startSpy = vi.spyOn(scheduler, "start");
      const newSettings = { ...defaultSettings, checkIntervalMinutes: 10 };

      scheduler.restart(newSettings);

      expect(startSpy).toHaveBeenCalledWith(newSettings);
    });
  });

  describe("onUpdate", () => {
    it("registers callback and returns unsubscribe function", () => {
      const callback = vi.fn();

      const unsubscribe = scheduler.onUpdate(callback);

      expect(typeof unsubscribe).toBe("function");
    });

    it("unsubscribe removes callback", async () => {
      const callback = vi.fn();
      const unsubscribe = scheduler.onUpdate(callback);

      unsubscribe();

      // Manually call checkAllRepositories to trigger update
      const mockSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      });
      mockDb.select.mockReturnValue({ from: mockSelectFrom });

      await scheduler.checkAllRepositories(defaultSettings);

      // Callback should not be called after unsubscribe
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("checkAllRepositories", () => {
    it("fetches enabled repositories from database", async () => {
      const mockSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      });
      mockDb.select.mockReturnValue({ from: mockSelectFrom });

      await scheduler.checkAllRepositories(defaultSettings);

      expect(mockDb.select).toHaveBeenCalled();
    });

    it("returns empty array when no repositories", async () => {
      const mockSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      });
      mockDb.select.mockReturnValue({ from: mockSelectFrom });

      const result = await scheduler.checkAllRepositories(defaultSettings);

      expect(result).toEqual([]);
    });

    it("checks each enabled repository", async () => {
      const repos = [
        {
          id: "repo1",
          path: "/path/to/repo1",
          name: "owner/repo1",
          enabled: 1,
          order: 0,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
        {
          id: "repo2",
          path: "/path/to/repo2",
          name: "owner/repo2",
          enabled: 1,
          order: 1,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
      ];

      // First call returns repos, subsequent calls return empty for PRs
      const mockSelectFrom = vi.fn();
      const mockWhere = vi.fn();

      mockDb.select.mockReturnValue({ from: mockSelectFrom });
      mockSelectFrom.mockReturnValue({ where: mockWhere });

      let callCount = 0;
      mockWhere.mockImplementation(() => {
        callCount++;
        // First call: get repos, subsequent calls: get existing PRs
        if (callCount === 1) return Promise.resolve(repos);
        return Promise.resolve([]);
      });

      mockFetchPRs.mockResolvedValue({ success: true, prs: [], logs: [] });

      await scheduler.checkAllRepositories(defaultSettings);

      expect(mockFetchPRs).toHaveBeenCalledTimes(2);
      expect(mockFetchPRs).toHaveBeenCalledWith("/path/to/repo1");
      expect(mockFetchPRs).toHaveBeenCalledWith("/path/to/repo2");
    });

    it("notifies callbacks with updated PRs", async () => {
      const callback = vi.fn();
      scheduler.onUpdate(callback);

      const mockSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      });
      mockDb.select.mockReturnValue({ from: mockSelectFrom });

      await scheduler.checkAllRepositories(defaultSettings);

      expect(callback).toHaveBeenCalledWith([]);
    });
  });

  describe("getAllPRs", () => {
    it("returns all PRs from enabled repositories", async () => {
      const mockPRData = [
        {
          pr: {
            id: "pr1",
            repositoryId: "repo1",
            prNumber: 123,
            title: "Test PR",
            url: "https://github.com/owner/repo/pull/123",
            author: "testuser",
            createdAt: "2024-01-01T00:00:00Z",
            firstSeenAt: "2024-01-01T00:00:00Z",
            notifiedAt: null,
            lastRemindedAt: null,
          },
          repo: { name: "owner/repo" },
        },
      ];

      const mockSelectFrom = vi.fn();
      const mockInnerJoin = vi.fn();
      const mockWhere = vi.fn();

      mockDb.select.mockReturnValue({ from: mockSelectFrom });
      mockSelectFrom.mockReturnValue({ innerJoin: mockInnerJoin });
      mockInnerJoin.mockReturnValue({ where: mockWhere });
      mockWhere.mockResolvedValue(mockPRData);

      const result = await scheduler.getAllPRs();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "pr1",
        repositoryName: "owner/repo",
        prNumber: 123,
        title: "Test PR",
      });
    });
  });

  describe("new PR notification", () => {
    it("notifies for new PRs when notifyOnNew is true", async () => {
      const repo = {
        id: "repo1",
        path: "/path/to/repo",
        name: "owner/repo",
        enabled: 1,
        order: 0,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };

      const ghPR = {
        number: 123,
        title: "New PR",
        url: "https://github.com/owner/repo/pull/123",
        author: { login: "testuser" },
        createdAt: "2024-01-01T00:00:00Z",
      };

      // Setup mocks
      const mockSelectFrom = vi.fn();
      const mockWhere = vi.fn();

      mockDb.select.mockReturnValue({ from: mockSelectFrom });
      mockSelectFrom.mockReturnValue({ where: mockWhere });

      let callCount = 0;
      mockWhere.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([repo]); // First: get repos
        return Promise.resolve([]); // Second: no existing PRs
      });

      mockFetchPRs.mockResolvedValue({ success: true, prs: [ghPR], logs: [] });

      const mockInsertValues = vi.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: mockInsertValues });

      await scheduler.checkAllRepositories(defaultSettings);

      expect(mockNotifyNewPR).toHaveBeenCalledWith(
        expect.objectContaining({
          prNumber: 123,
          title: "New PR",
          author: "testuser",
        }),
      );
    });

    it("does not notify for new PRs when notifyOnNew is false", async () => {
      const settings = { ...defaultSettings, notifyOnNew: false };

      const repo = {
        id: "repo1",
        path: "/path/to/repo",
        name: "owner/repo",
        enabled: 1,
        order: 0,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };

      const ghPR = {
        number: 123,
        title: "New PR",
        url: "https://github.com/owner/repo/pull/123",
        author: { login: "testuser" },
        createdAt: "2024-01-01T00:00:00Z",
      };

      const mockSelectFrom = vi.fn();
      const mockWhere = vi.fn();

      mockDb.select.mockReturnValue({ from: mockSelectFrom });
      mockSelectFrom.mockReturnValue({ where: mockWhere });

      let callCount = 0;
      mockWhere.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([repo]);
        return Promise.resolve([]);
      });

      mockFetchPRs.mockResolvedValue({ success: true, prs: [ghPR], logs: [] });

      const mockInsertValues = vi.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: mockInsertValues });

      await scheduler.checkAllRepositories(settings);

      expect(mockNotifyNewPR).not.toHaveBeenCalled();
    });
  });

  describe("PR update handling", () => {
    it("updates existing PR data", async () => {
      const repo = {
        id: "repo1",
        path: "/path/to/repo",
        name: "owner/repo",
        enabled: 1,
        order: 0,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };

      const existingPR = {
        id: "existing-pr",
        repositoryId: "repo1",
        prNumber: 123,
        title: "Old Title",
        url: "https://github.com/owner/repo/pull/123",
        author: "testuser",
        createdAt: "2024-01-01T00:00:00Z",
        firstSeenAt: "2024-01-01T00:00:00Z",
        notifiedAt: null,
        lastRemindedAt: null,
      };

      const updatedGhPR = {
        number: 123,
        title: "Updated Title",
        url: "https://github.com/owner/repo/pull/123",
        author: { login: "testuser" },
        createdAt: "2024-01-01T00:00:00Z",
      };

      const mockSelectFrom = vi.fn();
      const mockWhere = vi.fn();

      mockDb.select.mockReturnValue({ from: mockSelectFrom });
      mockSelectFrom.mockReturnValue({ where: mockWhere });

      let callCount = 0;
      mockWhere.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([repo]);
        return Promise.resolve([existingPR]);
      });

      mockFetchPRs.mockResolvedValue({
        success: true,
        prs: [updatedGhPR],
        logs: [],
      });

      const mockUpdateSet = vi.fn();
      const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
      mockDb.update.mockReturnValue({ set: mockUpdateSet });
      mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });

      await scheduler.checkAllRepositories(defaultSettings);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Updated Title",
        }),
      );
    });

    it("removes PRs that no longer exist", async () => {
      const repo = {
        id: "repo1",
        path: "/path/to/repo",
        name: "owner/repo",
        enabled: 1,
        order: 0,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };

      const existingPR = {
        id: "stale-pr",
        repositoryId: "repo1",
        prNumber: 999,
        title: "Stale PR",
        url: "https://github.com/owner/repo/pull/999",
        author: "testuser",
        createdAt: "2024-01-01T00:00:00Z",
        firstSeenAt: "2024-01-01T00:00:00Z",
        notifiedAt: null,
        lastRemindedAt: null,
      };

      const mockSelectFrom = vi.fn();
      const mockWhere = vi.fn();

      mockDb.select.mockReturnValue({ from: mockSelectFrom });
      mockSelectFrom.mockReturnValue({ where: mockWhere });

      let callCount = 0;
      mockWhere.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([repo]);
        return Promise.resolve([existingPR]);
      });

      // No PRs returned from GitHub - means the PR was closed/merged
      mockFetchPRs.mockResolvedValue({ success: true, prs: [], logs: [] });

      const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
      mockDb.delete.mockReturnValue({ where: mockDeleteWhere });

      await scheduler.checkAllRepositories(defaultSettings);

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe("sendReminders (via interval)", () => {
    it("sends reminders for PRs that need reminding", async () => {
      const prData = [
        {
          pr: {
            id: "pr1",
            repositoryId: "repo1",
            prNumber: 123,
            title: "Test PR",
            url: "https://github.com/owner/repo/pull/123",
            author: "testuser",
            createdAt: "2024-01-01T00:00:00Z",
            firstSeenAt: "2024-01-01T00:00:00Z",
            notifiedAt: null,
            lastRemindedAt: null, // Never reminded
          },
          repo: { name: "owner/repo", id: "repo1", enabled: 1 },
        },
      ];

      const mockSelectFrom = vi.fn();
      const mockInnerJoin = vi.fn();
      const mockWhere = vi.fn();

      mockDb.select.mockReturnValue({ from: mockSelectFrom });
      mockSelectFrom.mockReturnValue({
        innerJoin: mockInnerJoin,
        where: mockWhere,
      });
      mockInnerJoin.mockReturnValue({ where: mockWhere });

      // Return empty for check repos, then PR data for reminders
      let selectCallCount = 0;
      mockWhere.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount <= 1) return Promise.resolve([]); // checkAllRepositories - repos
        return Promise.resolve(prData); // sendReminders queries
      });

      const mockUpdateSet = vi.fn();
      const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
      mockDb.update.mockReturnValue({ set: mockUpdateSet });
      mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });

      // Start scheduler and trigger reminder interval
      scheduler.start(defaultSettings);

      // Advance time to trigger reminder interval (1 hour)
      await vi.advanceTimersByTimeAsync(1 * 60 * 60 * 1000);

      expect(mockNotifyReminder).toHaveBeenCalled();
    });

    it("does not send reminders when enableReminder is false", async () => {
      const settings = { ...defaultSettings, enableReminder: false };

      const mockSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      });
      mockDb.select.mockReturnValue({ from: mockSelectFrom });

      scheduler.start(settings);

      // Advance time - but reminder should not be triggered
      await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000);

      expect(mockNotifyReminder).not.toHaveBeenCalled();
    });

    it("does not send reminders when no PRs need reminding", async () => {
      const mockSelectFrom = vi.fn();
      const mockInnerJoin = vi.fn();
      const mockWhere = vi.fn();

      mockDb.select.mockReturnValue({ from: mockSelectFrom });
      mockSelectFrom.mockReturnValue({
        innerJoin: mockInnerJoin,
        where: mockWhere,
      });
      mockInnerJoin.mockReturnValue({ where: mockWhere });
      mockWhere.mockResolvedValue([]); // No PRs

      scheduler.start(defaultSettings);

      // Advance time to trigger reminder interval
      await vi.advanceTimersByTimeAsync(1 * 60 * 60 * 1000);

      expect(mockNotifyReminder).not.toHaveBeenCalled();
    });

    it("updates lastRemindedAt after sending reminders", async () => {
      const prData = [
        {
          pr: {
            id: "pr1",
            repositoryId: "repo1",
            prNumber: 123,
            title: "Test PR",
            url: "https://github.com/owner/repo/pull/123",
            author: "testuser",
            createdAt: "2024-01-01T00:00:00Z",
            firstSeenAt: "2024-01-01T00:00:00Z",
            notifiedAt: null,
            lastRemindedAt: null,
          },
          repo: { name: "owner/repo", id: "repo1", enabled: 1 },
        },
      ];

      const mockSelectFrom = vi.fn();
      const mockInnerJoin = vi.fn();
      const mockWhere = vi.fn();

      mockDb.select.mockReturnValue({ from: mockSelectFrom });
      mockSelectFrom.mockReturnValue({
        innerJoin: mockInnerJoin,
        where: mockWhere,
      });
      mockInnerJoin.mockReturnValue({ where: mockWhere });

      let selectCallCount = 0;
      mockWhere.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount <= 1) return Promise.resolve([]);
        return Promise.resolve(prData);
      });

      const mockUpdateSet = vi.fn();
      const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
      mockDb.update.mockReturnValue({ set: mockUpdateSet });
      mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });

      scheduler.start(defaultSettings);

      await vi.advanceTimersByTimeAsync(1 * 60 * 60 * 1000);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          lastRemindedAt: expect.any(String),
        }),
      );
    });

    it("filters out PRs that were recently reminded via JS filter", async () => {
      // This test verifies the JS filter: neverRemindedPRs.filter(item => item.pr.lastRemindedAt === null)
      // When a PR has lastRemindedAt set (not null), it should be filtered out from neverRemindedPRs
      //
      // sendReminders runs two queries with innerJoin:
      // 1. prsToRemind: Gets PRs where lastRemindedAt < threshold (old reminders)
      // 2. neverRemindedPRs: Gets all PRs, then JS filters for lastRemindedAt === null
      //
      // For this test, we return empty for prsToRemind (no old PRs),
      // and return a PR with lastRemindedAt set for neverRemindedPRs.
      // The JS filter should exclude it.

      const recentlyRemindedPR = {
        pr: {
          id: "pr1",
          repositoryId: "repo1",
          prNumber: 123,
          title: "Test PR",
          url: "https://github.com/owner/repo/pull/123",
          author: "testuser",
          createdAt: "2024-01-01T00:00:00Z",
          firstSeenAt: "2024-01-01T00:00:00Z",
          notifiedAt: null,
          lastRemindedAt: "2026-01-01T00:00:00Z", // Not null - should be filtered by JS
        },
        repo: { name: "owner/repo", id: "repo1", enabled: 1 },
      };

      const mockSelectFrom = vi.fn();
      const mockWhere = vi.fn();

      mockDb.select.mockReturnValue({ from: mockSelectFrom });

      // Track innerJoin calls within sendReminders
      let innerJoinCallCount = 0;
      mockSelectFrom.mockImplementation(() => {
        return {
          innerJoin: () => {
            innerJoinCallCount++;
            return {
              where: () => {
                // sendReminders makes 2 innerJoin queries:
                // 1st (odd): prsToRemind - return empty (no old PRs to remind)
                // 2nd (even): neverRemindedPRs - return PR with lastRemindedAt set
                if (innerJoinCallCount % 2 === 1) {
                  return Promise.resolve([]); // prsToRemind: empty
                }
                // neverRemindedPRs: returns PR, but JS filter should exclude it
                return Promise.resolve([recentlyRemindedPR]);
              },
            };
          },
          where: mockWhere,
        };
      });

      // checkAllRepositories query (no innerJoin, just where)
      mockWhere.mockResolvedValue([]);

      scheduler.start(defaultSettings);

      await vi.advanceTimersByTimeAsync(1 * 60 * 60 * 1000);

      // Should not notify because:
      // - prsToRemind is empty
      // - neverRemindedPRs has a PR but it's filtered out because lastRemindedAt !== null
      expect(mockNotifyReminder).not.toHaveBeenCalled();
    });
  });
});
