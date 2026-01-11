import { execFile } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchReviewRequestedPRs,
  getRepoName,
  isGitRepository,
} from "./gh-cli";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

const mockExecFile = vi.mocked(execFile);

describe("gh-cli", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchReviewRequestedPRs", () => {
    it("returns PRs when successful", async () => {
      const mockPRs = [
        {
          number: 123,
          title: "Test PR",
          url: "https://github.com/owner/repo/pull/123",
          author: { login: "testuser" },
          createdAt: "2024-01-01T00:00:00Z",
          isDraft: false,
          state: "OPEN",
          reviewDecision: null,
          reviewRequests: [],
          comments: [],
          changedFiles: 5,
          mergeable: "MERGEABLE",
          statusCheckRollup: { state: "SUCCESS" },
        },
      ];

      (mockExecFile as any).mockImplementation(
        (_file: string, _args: string[], _options: any, callback: any) => {
          callback(null, { stdout: JSON.stringify(mockPRs), stderr: "" });
          return {} as ReturnType<typeof execFile>;
        },
      );

      const result = await fetchReviewRequestedPRs("/path/to/repo");

      expect(result.success).toBe(true);
      expect(result.prs).toEqual(mockPRs);
      expect(result.error).toBeUndefined();
    });

    it("returns empty array when no PRs found", async () => {
      (mockExecFile as any).mockImplementation(
        (_file: string, _args: string[], _options: any, callback: any) => {
          callback(null, { stdout: "[]", stderr: "" });
          return {} as ReturnType<typeof execFile>;
        },
      );

      const result = await fetchReviewRequestedPRs("/path/to/repo");

      expect(result.success).toBe(true);
      expect(result.prs).toEqual([]);
    });

    it("returns error result on failure", async () => {
      (mockExecFile as any).mockImplementation(
        (_file: string, _args: string[], _options: any, callback: any) => {
          callback(new Error("gh: command not found"), {
            stdout: "",
            stderr: "",
          });
          return {} as ReturnType<typeof execFile>;
        },
      );

      const result = await fetchReviewRequestedPRs("/path/to/repo");

      expect(result.success).toBe(false);
      expect(result.prs).toEqual([]);
      expect(result.error).toContain("gh: command not found");
    });

    it("returns multiple PRs correctly", async () => {
      const mockPRs = [
        {
          number: 1,
          title: "First PR",
          url: "https://github.com/owner/repo/pull/1",
          author: { login: "user1" },
          createdAt: "2024-01-01T00:00:00Z",
          isDraft: false,
          state: "OPEN",
          reviewDecision: "APPROVED",
          reviewRequests: [],
          comments: [{ id: "1" }],
          changedFiles: 3,
          mergeable: "MERGEABLE",
          statusCheckRollup: { state: "SUCCESS" },
        },
        {
          number: 2,
          title: "Second PR",
          url: "https://github.com/owner/repo/pull/2",
          author: { login: "user2" },
          createdAt: "2024-01-02T00:00:00Z",
          isDraft: true,
          state: "OPEN",
          reviewDecision: null,
          reviewRequests: [{ __typename: "User", login: "reviewer" }],
          comments: [],
          changedFiles: 10,
          mergeable: "CONFLICTING",
          statusCheckRollup: { state: "PENDING" },
        },
      ];

      (mockExecFile as any).mockImplementation(
        (_file: string, _args: string[], _options: any, callback: any) => {
          callback(null, { stdout: JSON.stringify(mockPRs), stderr: "" });
          return {} as ReturnType<typeof execFile>;
        },
      );

      const result = await fetchReviewRequestedPRs("/path/to/repo");

      expect(result.success).toBe(true);
      expect(result.prs).toEqual(mockPRs);
    });
  });

  describe("getRepoName", () => {
    it("returns repo name when successful", async () => {
      (mockExecFile as any).mockImplementation(
        (_file: string, _args: string[], _options: any, callback: any) => {
          callback(null, { stdout: "owner/repo-name\n", stderr: "" });
          return {} as ReturnType<typeof execFile>;
        },
      );

      const result = await getRepoName("/path/to/repo");

      expect(result).toBe("owner/repo-name");
    });

    it("returns null when command fails", async () => {
      (mockExecFile as any).mockImplementation(
        (_file: string, _args: string[], _options: any, callback: any) => {
          callback(new Error("not a repository"), { stdout: "", stderr: "" });
          return {} as ReturnType<typeof execFile>;
        },
      );

      const result = await getRepoName("/path/to/not-a-repo");

      expect(result).toBe(null);
    });

    it("trims whitespace from output", async () => {
      (mockExecFile as any).mockImplementation(
        (_file: string, _args: string[], _options: any, callback: any) => {
          callback(null, { stdout: "  owner/repo  \n", stderr: "" });
          return {} as ReturnType<typeof execFile>;
        },
      );

      const result = await getRepoName("/path/to/repo");

      expect(result).toBe("owner/repo");
    });
  });

  describe("isGitRepository", () => {
    it("returns true for a git repository", async () => {
      (mockExecFile as any).mockImplementation(
        (_file: string, _args: string[], _options: any, callback: any) => {
          callback(null, { stdout: ".git\n", stderr: "" });
          return {} as ReturnType<typeof execFile>;
        },
      );

      const result = await isGitRepository("/path/to/repo");

      expect(result).toBe(true);
    });

    it("returns false for a non-git directory", async () => {
      (mockExecFile as any).mockImplementation(
        (_file: string, _args: string[], _options: any, callback: any) => {
          callback(new Error("fatal: not a git repository"), {
            stdout: "",
            stderr: "",
          });
          return {} as ReturnType<typeof execFile>;
        },
      );

      const result = await isGitRepository("/path/to/not-a-repo");

      expect(result).toBe(false);
    });
  });
});
