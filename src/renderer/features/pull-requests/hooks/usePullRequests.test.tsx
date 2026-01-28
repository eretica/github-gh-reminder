/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IpcApi, PullRequest, Repository } from "../../../../shared/types";
import { usePullRequests } from "./usePullRequests";

// Mock window.api
const mockApi: Partial<IpcApi> = {
  listPullRequests: vi.fn(),
  refreshPullRequests: vi.fn(),
  openPullRequest: vi.fn(),
  listRepositories: vi.fn(),
  onPullRequestsUpdated: vi.fn(),
};

// Set up window.api mock
beforeEach(() => {
  (window as unknown as { api: Partial<IpcApi> }).api = mockApi;
});

describe("usePullRequests", () => {
  const mockPRs: PullRequest[] = [
    {
      id: "pr1",
      repositoryId: "repo1",
      repositoryName: "owner/repo1",
      prNumber: 123,
      title: "Test PR 1",
      url: "https://github.com/owner/repo1/pull/123",
      author: "user1",
      createdAt: new Date().toISOString(),
      firstSeenAt: new Date().toISOString(),
      notifiedAt: null,
      lastRemindedAt: null,
      reminderEnabled: true,
    },
    {
      id: "pr2",
      repositoryId: "repo1",
      repositoryName: "owner/repo1",
      prNumber: 124,
      title: "Test PR 2",
      url: "https://github.com/owner/repo1/pull/124",
      author: "user2",
      createdAt: new Date().toISOString(),
      firstSeenAt: new Date().toISOString(),
      notifiedAt: null,
      lastRemindedAt: null,
      reminderEnabled: true,
    },
  ];

  const mockRepositories: Repository[] = [
    {
      id: "repo1",
      path: "/path/to/repo1",
      name: "owner/repo1",
      enabled: true,
      order: 0,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ];

  let updateCallback: ((prs: PullRequest[]) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    updateCallback = null;

    (mockApi.listPullRequests as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockPRs,
    );
    (mockApi.refreshPullRequests as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockPRs,
    );
    (mockApi.listRepositories as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRepositories,
    );
    (
      mockApi.onPullRequestsUpdated as ReturnType<typeof vi.fn>
    ).mockImplementation((callback: (prs: PullRequest[]) => void) => {
      updateCallback = callback;
      return vi.fn(); // Return unsubscribe function
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts with loading true", async () => {
      const { result } = renderHook(() => usePullRequests());

      // Initially loading is true
      expect(result.current.loading).toBe(true);
      expect(result.current.pullRequests).toEqual([]);
      expect(result.current.error).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe("initial load", () => {
    it("loads pull requests on mount", async () => {
      const { result } = renderHook(() => usePullRequests());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockApi.listPullRequests).toHaveBeenCalledTimes(1);
      expect(result.current.pullRequests).toEqual(mockPRs);
    });

    it("does not mark initial PRs as new (no animation)", async () => {
      const { result } = renderHook(() => usePullRequests());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Initial load should have empty newPRIds set (no animation)
      expect(result.current.newPRIds.size).toBe(0);
    });

    it("loads repositories on mount", async () => {
      const { result } = renderHook(() => usePullRequests());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockApi.listRepositories).toHaveBeenCalled();
      expect(result.current.repositories).toEqual(mockRepositories);
    });
  });

  describe("new PR detection", () => {
    it("detects new PRs on refresh", async () => {
      const { result } = renderHook(() => usePullRequests());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Initially no new PRs
      expect(result.current.newPRIds.size).toBe(0);

      // Add a new PR
      const newPR: PullRequest = {
        id: "pr3",
        repositoryId: "repo1",
        repositoryName: "owner/repo1",
        prNumber: 125,
        title: "New Test PR",
        url: "https://github.com/owner/repo1/pull/125",
        author: "user3",
        createdAt: new Date().toISOString(),
        firstSeenAt: new Date().toISOString(),
        notifiedAt: null,
        lastRemindedAt: null,
      reminderEnabled: true,
      };

      (
        mockApi.refreshPullRequests as ReturnType<typeof vi.fn>
      ).mockResolvedValue([...mockPRs, newPR]);

      // Refresh
      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // New PR should be detected
      expect(result.current.newPRIds.has("pr3")).toBe(true);
      expect(result.current.newPRIds.size).toBe(1);
    });

    it("does not mark existing PRs as new on refresh", async () => {
      const { result } = renderHook(() => usePullRequests());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Refresh with same PRs
      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // No new PRs should be detected
      expect(result.current.newPRIds.size).toBe(0);
    });

    it("detects new PRs from subscription updates", async () => {
      const { result } = renderHook(() => usePullRequests());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(updateCallback).not.toBeNull();

      // Initially no new PRs
      expect(result.current.newPRIds.size).toBe(0);

      // Add a new PR via subscription
      const newPR: PullRequest = {
        id: "pr4",
        repositoryId: "repo1",
        repositoryName: "owner/repo1",
        prNumber: 126,
        title: "Subscribed PR",
        url: "https://github.com/owner/repo1/pull/126",
        author: "user4",
        createdAt: new Date().toISOString(),
        firstSeenAt: new Date().toISOString(),
        notifiedAt: null,
        lastRemindedAt: null,
      reminderEnabled: true,
      };

      // Trigger subscription callback
      act(() => {
        updateCallback?.([...mockPRs, newPR]);
      });

      await waitFor(() => {
        expect(result.current.newPRIds.has("pr4")).toBe(true);
      });

      expect(result.current.newPRIds.size).toBe(1);
    });
  });

  describe("error handling", () => {
    it("handles initial load errors", async () => {
      const errorMessage = "Failed to load PRs";
      (mockApi.listPullRequests as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error(errorMessage),
      );

      const { result } = renderHook(() => usePullRequests());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.pullRequests).toEqual([]);
    });

    it("handles refresh errors", async () => {
      const { result } = renderHook(() => usePullRequests());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const errorMessage = "Failed to refresh PRs";
      (
        mockApi.refreshPullRequests as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error(errorMessage));

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe("openPullRequest", () => {
    it("calls window.api.openPullRequest with URL", async () => {
      const { result } = renderHook(() => usePullRequests());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const url = "https://github.com/owner/repo/pull/123";
      await act(async () => {
        await result.current.openPullRequest(url);
      });

      expect(mockApi.openPullRequest).toHaveBeenCalledWith(url);
    });

    it("handles openPullRequest errors", async () => {
      const { result } = renderHook(() => usePullRequests());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      (mockApi.openPullRequest as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Failed to open PR"),
      );

      await act(async () => {
        await result.current.openPullRequest("https://test.com");
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to open PR");
      });
    });
  });
});
