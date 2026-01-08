import { execSync } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchReviewRequestedPRs,
  getGhStatus,
  getRepoName,
  isGhAuthenticated,
  isGhInstalled,
  isGitRepository,
} from "./gh-cli";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

const mockExecSync = vi.mocked(execSync);

describe("gh-cli", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isGhInstalled", () => {
    it("returns true when gh is installed", () => {
      mockExecSync.mockReturnValueOnce("gh version 2.40.0");

      expect(isGhInstalled()).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith("gh --version", {
        encoding: "utf-8",
        timeout: 5000,
      });
    });

    it("returns false when gh is not installed", () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error("command not found: gh");
      });

      expect(isGhInstalled()).toBe(false);
    });
  });

  describe("isGhAuthenticated", () => {
    it("returns true when authenticated", () => {
      mockExecSync.mockReturnValueOnce("Logged in to github.com");

      expect(isGhAuthenticated()).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith("gh auth status", {
        encoding: "utf-8",
        timeout: 5000,
      });
    });

    it("returns false when not authenticated", () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error("You are not logged into any GitHub hosts");
      });

      expect(isGhAuthenticated()).toBe(false);
    });
  });

  describe("getGhStatus", () => {
    it("returns installed: true, authenticated: true when both are true", () => {
      mockExecSync
        .mockReturnValueOnce("gh version 2.40.0")
        .mockReturnValueOnce("Logged in to github.com");

      expect(getGhStatus()).toEqual({ installed: true, authenticated: true });
    });

    it("returns installed: true, authenticated: false when only installed", () => {
      mockExecSync
        .mockReturnValueOnce("gh version 2.40.0")
        .mockImplementationOnce(() => {
          throw new Error("Not authenticated");
        });

      expect(getGhStatus()).toEqual({ installed: true, authenticated: false });
    });

    it("returns installed: false, authenticated: false when not installed", () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error("command not found");
      });

      expect(getGhStatus()).toEqual({ installed: false, authenticated: false });
    });
  });

  describe("getRepoName", () => {
    it("returns repo name when successful", () => {
      mockExecSync.mockReturnValueOnce("owner/repo-name\n");

      expect(getRepoName("/path/to/repo")).toBe("owner/repo-name");
      expect(mockExecSync).toHaveBeenCalledWith(
        "gh repo view --json nameWithOwner --jq .nameWithOwner",
        {
          cwd: "/path/to/repo",
          encoding: "utf-8",
          timeout: 10000,
        },
      );
    });

    it("returns null when command fails", () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error("not a repository");
      });

      expect(getRepoName("/path/to/not-a-repo")).toBe(null);
    });
  });

  describe("isGitRepository", () => {
    it("returns true for a git repository", () => {
      mockExecSync.mockReturnValueOnce(".git");

      expect(isGitRepository("/path/to/repo")).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith("git rev-parse --git-dir", {
        cwd: "/path/to/repo",
        encoding: "utf-8",
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"],
      });
    });

    it("returns false for a non-git directory", () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error("fatal: not a git repository");
      });

      expect(isGitRepository("/path/to/not-a-repo")).toBe(false);
    });
  });

  describe("fetchReviewRequestedPRs", () => {
    it("returns PRs when search is successful", () => {
      const mockPRs = [
        {
          number: 123,
          title: "Test PR",
          url: "https://github.com/owner/repo/pull/123",
          author: { login: "testuser" },
          createdAt: "2024-01-01T00:00:00Z",
          reviewRequests: [{ __typename: "User", login: "currentuser" }],
        },
      ];
      mockExecSync.mockReturnValueOnce(JSON.stringify(mockPRs));

      const result = fetchReviewRequestedPRs("/path/to/repo");

      expect(result).toEqual(mockPRs);
      expect(mockExecSync).toHaveBeenCalledWith(
        'gh pr list --search "review-requested:@me" --limit 100 --json number,title,url,author,createdAt,isDraft,state,reviewDecision,reviewRequests,comments,changedFiles,mergeable,statusCheckRollup',
        {
          cwd: "/path/to/repo",
          encoding: "utf-8",
          timeout: 30000,
          env: { ...process.env, GH_NO_UPDATE_NOTIFIER: "1" },
        },
      );
    });

    it("falls back to client-side filtering when search returns empty", () => {
      const fallbackPRs = [
        {
          number: 456,
          title: "Fallback PR",
          url: "https://github.com/owner/repo/pull/456",
          author: { login: "anotheruser" },
          createdAt: "2024-01-03T00:00:00Z",
          reviewRequests: [{ __typename: "User", login: "currentuser" }],
        },
        {
          number: 789,
          title: "Team Review PR",
          url: "https://github.com/owner/repo/pull/789",
          author: { login: "thirduser" },
          createdAt: "2024-01-04T00:00:00Z",
          reviewRequests: [{ __typename: "Team", login: "team-name" }],
        },
      ];

      // First call (search) returns empty array
      mockExecSync.mockReturnValueOnce("[]");
      // Second call (fallback) returns all open PRs
      mockExecSync.mockReturnValueOnce(JSON.stringify(fallbackPRs));

      const result = fetchReviewRequestedPRs("/path/to/repo");

      // Should filter to only User review requests
      expect(result).toEqual([fallbackPRs[0]]);
      expect(mockExecSync).toHaveBeenCalledTimes(2);
    });

    it("falls back when search command fails", () => {
      const fallbackPRs = [
        {
          number: 101,
          title: "Error Recovery PR",
          url: "https://github.com/owner/repo/pull/101",
          author: { login: "testuser" },
          createdAt: "2024-01-05T00:00:00Z",
          reviewRequests: [{ __typename: "User", login: "currentuser" }],
        },
      ];

      // First call (search) throws error
      mockExecSync.mockImplementationOnce(() => {
        throw new Error("Search API error");
      });
      // Second call (fallback) succeeds
      mockExecSync.mockReturnValueOnce(JSON.stringify(fallbackPRs));

      const result = fetchReviewRequestedPRs("/path/to/repo");

      expect(result).toEqual(fallbackPRs);
      expect(mockExecSync).toHaveBeenCalledTimes(2);
    });

    it("returns empty array when both search and fallback fail", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("Network error");
      });

      expect(fetchReviewRequestedPRs("/path/to/repo")).toEqual([]);
    });

    it("filters out team-only review requests in fallback", () => {
      const allPRs = [
        {
          number: 1,
          title: "User Review PR",
          url: "https://github.com/owner/repo/pull/1",
          author: { login: "user1" },
          createdAt: "2024-01-01T00:00:00Z",
          reviewRequests: [{ __typename: "User", login: "currentuser" }],
        },
        {
          number: 2,
          title: "Team Review PR",
          url: "https://github.com/owner/repo/pull/2",
          author: { login: "user2" },
          createdAt: "2024-01-02T00:00:00Z",
          reviewRequests: [{ __typename: "Team", login: "team-name" }],
        },
        {
          number: 3,
          title: "No Review PR",
          url: "https://github.com/owner/repo/pull/3",
          author: { login: "user3" },
          createdAt: "2024-01-03T00:00:00Z",
          reviewRequests: [],
        },
      ];

      // Search returns empty, fallback returns all PRs
      mockExecSync.mockReturnValueOnce("[]");
      mockExecSync.mockReturnValueOnce(JSON.stringify(allPRs));

      const result = fetchReviewRequestedPRs("/path/to/repo");

      // Should only return the first PR (User review request)
      expect(result).toEqual([allPRs[0]]);
    });

    it("returns multiple PRs correctly from search", () => {
      const mockPRs = [
        {
          number: 1,
          title: "First PR",
          url: "https://github.com/owner/repo/pull/1",
          author: { login: "user1" },
          createdAt: "2024-01-01T00:00:00Z",
          reviewRequests: [{ __typename: "User" }],
        },
        {
          number: 2,
          title: "Second PR",
          url: "https://github.com/owner/repo/pull/2",
          author: { login: "user2" },
          createdAt: "2024-01-02T00:00:00Z",
          reviewRequests: [{ __typename: "User" }],
        },
      ];
      mockExecSync.mockReturnValueOnce(JSON.stringify(mockPRs));

      expect(fetchReviewRequestedPRs("/path/to/repo")).toEqual(mockPRs);
    });
  });
});
