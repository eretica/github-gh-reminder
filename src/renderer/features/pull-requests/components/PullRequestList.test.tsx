/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PullRequest, Repository } from "../../../../shared/types";
import { PullRequestList } from "./PullRequestList";

// Mock window.api
beforeEach(() => {
  (window as unknown as { api: { openSettings: () => void } }).api = {
    openSettings: vi.fn(),
  };
});

describe("PullRequestList - Animation", () => {
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
    {
      id: "pr3",
      repositoryId: "repo1",
      repositoryName: "owner/repo1",
      prNumber: 125,
      title: "Test PR 3",
      url: "https://github.com/owner/repo1/pull/125",
      author: "user3",
      createdAt: new Date().toISOString(),
      firstSeenAt: new Date().toISOString(),
      notifiedAt: null,
      lastRemindedAt: null,
      reminderEnabled: true,
    },
  ];

  const onOpenPR = vi.fn();

  describe("conditional animation", () => {
    it("applies animation class to new PRs", () => {
      const newPRIds = new Set(["pr1", "pr3"]);

      render(
        <PullRequestList
          pullRequests={mockPRs}
          repositories={mockRepositories}
          onOpenPR={onOpenPR}
          onToggleReminder={vi.fn()}
          newPRIds={newPRIds}
        />,
      );

      // Find PR containers by checking the parent div of PR items
      // The structure is: <div className={animate-slideIn}><PullRequestItem /></div>
      const pr1Text = screen.getByText("Test PR 1");
      const pr2Text = screen.getByText("Test PR 2");
      const pr3Text = screen.getByText("Test PR 3");

      // Navigate up to find the wrapper div that has animation class
      const pr1Wrapper =
        pr1Text.closest("[class*='animate']") ||
        pr1Text.closest("div")?.parentElement;
      const pr2Wrapper =
        pr2Text.closest("[class*='animate']") ||
        pr2Text.closest("div")?.parentElement;
      const pr3Wrapper =
        pr3Text.closest("[class*='animate']") ||
        pr3Text.closest("div")?.parentElement;

      // PR1 and PR3 should have animation class
      expect(pr1Wrapper?.className).toContain("animate-slideIn");
      expect(pr3Wrapper?.className).toContain("animate-slideIn");

      // PR2 should NOT have animation class (but wrapper div exists)
      expect(pr2Wrapper?.className).not.toContain("animate-slideIn");
    });

    it("applies animation delay style to new PRs", () => {
      const newPRIds = new Set(["pr1", "pr3"]);

      render(
        <PullRequestList
          pullRequests={mockPRs}
          repositories={mockRepositories}
          onOpenPR={onOpenPR}
          onToggleReminder={vi.fn()}
          newPRIds={newPRIds}
        />,
      );

      // Find PR wrappers
      const pr1Text = screen.getByText("Test PR 1");
      const pr3Text = screen.getByText("Test PR 3");

      const pr1Wrapper =
        pr1Text.closest("[class*='animate']") ||
        pr1Text.closest("div")?.parentElement;
      const pr3Wrapper =
        pr3Text.closest("[class*='animate']") ||
        pr3Text.closest("div")?.parentElement;

      // New PRs should have animationDelay style
      expect((pr1Wrapper as HTMLElement)?.style.animationDelay).toBeDefined();
      expect((pr3Wrapper as HTMLElement)?.style.animationDelay).toBeDefined();
    });

    it("does not apply animation to existing PRs", () => {
      const newPRIds = new Set<string>(); // No new PRs

      render(
        <PullRequestList
          pullRequests={mockPRs}
          repositories={mockRepositories}
          onOpenPR={onOpenPR}
          onToggleReminder={vi.fn()}
          newPRIds={newPRIds}
        />,
      );

      // Find PR wrappers by navigating from text
      const pr1Text = screen.getByText("Test PR 1");
      const pr2Text = screen.getByText("Test PR 2");
      const pr3Text = screen.getByText("Test PR 3");

      const pr1Wrapper =
        pr1Text.closest("[class*='animate']") ||
        pr1Text.closest("div")?.parentElement;
      const pr2Wrapper =
        pr2Text.closest("[class*='animate']") ||
        pr2Text.closest("div")?.parentElement;
      const pr3Wrapper =
        pr3Text.closest("[class*='animate']") ||
        pr3Text.closest("div")?.parentElement;

      // None should have animation class
      expect(pr1Wrapper?.className).not.toContain("animate-slideIn");
      expect(pr2Wrapper?.className).not.toContain("animate-slideIn");
      expect(pr3Wrapper?.className).not.toContain("animate-slideIn");
    });

    it("handles empty newPRIds set (default parameter)", () => {
      render(
        <PullRequestList
          pullRequests={mockPRs}
          repositories={mockRepositories}
          onOpenPR={onOpenPR}
          onToggleReminder={vi.fn()}
          // newPRIds is omitted, should default to empty Set
        />,
      );

      // Find PR wrapper
      const pr1Text = screen.getByText("Test PR 1");
      const pr1Wrapper =
        pr1Text.closest("[class*='animate']") ||
        pr1Text.closest("div")?.parentElement;

      // Should not have animation class
      expect(pr1Wrapper?.className).not.toContain("animate-slideIn");
    });

    it("applies staggered animation delay to multiple new PRs", () => {
      const newPRIds = new Set(["pr1", "pr2", "pr3"]);

      render(
        <PullRequestList
          pullRequests={mockPRs}
          repositories={mockRepositories}
          onOpenPR={onOpenPR}
          onToggleReminder={vi.fn()}
          newPRIds={newPRIds}
        />,
      );

      // Find PR wrappers by navigating from text
      const pr1Text = screen.getByText("Test PR 1");
      const pr2Text = screen.getByText("Test PR 2");
      const pr3Text = screen.getByText("Test PR 3");

      const pr1Wrapper =
        pr1Text.closest("[class*='animate']") ||
        pr1Text.closest("div")?.parentElement;
      const pr2Wrapper =
        pr2Text.closest("[class*='animate']") ||
        pr2Text.closest("div")?.parentElement;
      const pr3Wrapper =
        pr3Text.closest("[class*='animate']") ||
        pr3Text.closest("div")?.parentElement;

      // Each PR should have different animation delay (index * 50ms)
      const delay1 = (pr1Wrapper as HTMLElement)?.style.animationDelay;
      const delay2 = (pr2Wrapper as HTMLElement)?.style.animationDelay;
      const delay3 = (pr3Wrapper as HTMLElement)?.style.animationDelay;

      // Delays should be staggered: 0ms, 50ms, 100ms
      expect(delay1).toBe("0ms");
      expect(delay2).toBe("50ms");
      expect(delay3).toBe("100ms");
    });
  });

  describe("mixed new and existing PRs", () => {
    it("correctly applies animation to only new PRs in mixed list", () => {
      const newPRIds = new Set(["pr2"]); // Only PR2 is new

      render(
        <PullRequestList
          pullRequests={mockPRs}
          repositories={mockRepositories}
          onOpenPR={onOpenPR}
          onToggleReminder={vi.fn()}
          newPRIds={newPRIds}
        />,
      );

      // Find PR wrappers by navigating from text
      const pr1Text = screen.getByText("Test PR 1");
      const pr2Text = screen.getByText("Test PR 2");
      const pr3Text = screen.getByText("Test PR 3");

      const pr1Wrapper =
        pr1Text.closest("[class*='animate']") ||
        pr1Text.closest("div")?.parentElement;
      const pr2Wrapper =
        pr2Text.closest("[class*='animate']") ||
        pr2Text.closest("div")?.parentElement;
      const pr3Wrapper =
        pr3Text.closest("[class*='animate']") ||
        pr3Text.closest("div")?.parentElement;

      // Only PR2 should have animation
      expect(pr1Wrapper?.className).not.toContain("animate-slideIn");
      expect(pr2Wrapper?.className).toContain("animate-slideIn");
      expect(pr3Wrapper?.className).not.toContain("animate-slideIn");
    });
  });
});
