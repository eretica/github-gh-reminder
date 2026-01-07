/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PullRequest } from "../../shared/types";
import { PullRequestItem } from "./PullRequestItem";

describe("PullRequestItem", () => {
  const mockPR: PullRequest = {
    id: "pr1",
    repositoryId: "repo1",
    repositoryName: "owner/repo",
    prNumber: 123,
    title: "Test Pull Request",
    url: "https://github.com/owner/repo/pull/123",
    author: "testuser",
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    firstSeenAt: new Date().toISOString(),
    notifiedAt: null,
    lastRemindedAt: null,
  };

  it("renders PR number", () => {
    const onOpen = vi.fn();
    render(<PullRequestItem pullRequest={mockPR} onOpen={onOpen} />);

    expect(screen.getByText("#123")).toBeInTheDocument();
  });

  it("renders PR title", () => {
    const onOpen = vi.fn();
    render(<PullRequestItem pullRequest={mockPR} onOpen={onOpen} />);

    expect(screen.getByText("Test Pull Request")).toBeInTheDocument();
  });

  it("renders author name with @ symbol", () => {
    const onOpen = vi.fn();
    render(<PullRequestItem pullRequest={mockPR} onOpen={onOpen} />);

    expect(screen.getByText("@testuser")).toBeInTheDocument();
  });

  it("calls onOpen with URL when clicked", () => {
    const onOpen = vi.fn();
    render(<PullRequestItem pullRequest={mockPR} onOpen={onOpen} />);

    const item = screen.getByText("Test Pull Request").closest("div");
    fireEvent.click(item!.parentElement!.parentElement!);

    expect(onOpen).toHaveBeenCalledWith(
      "https://github.com/owner/repo/pull/123",
    );
  });

  describe("formatRelativeTime", () => {
    it("shows 'just now' for recent times", () => {
      const recentPR = {
        ...mockPR,
        createdAt: new Date().toISOString(),
      };
      const onOpen = vi.fn();
      render(<PullRequestItem pullRequest={recentPR} onOpen={onOpen} />);

      expect(screen.getByText("just now")).toBeInTheDocument();
    });

    it("shows minutes for times less than an hour", () => {
      const minutesAgoPR = {
        ...mockPR,
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
      };
      const onOpen = vi.fn();
      render(<PullRequestItem pullRequest={minutesAgoPR} onOpen={onOpen} />);

      expect(screen.getByText("30 min ago")).toBeInTheDocument();
    });

    it("shows hours for times less than a day", () => {
      const hoursAgoPR = {
        ...mockPR,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
      };
      const onOpen = vi.fn();
      render(<PullRequestItem pullRequest={hoursAgoPR} onOpen={onOpen} />);

      expect(screen.getByText("5 hours ago")).toBeInTheDocument();
    });

    it("shows singular hour for 1 hour", () => {
      const oneHourAgoPR = {
        ...mockPR,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      };
      const onOpen = vi.fn();
      render(<PullRequestItem pullRequest={oneHourAgoPR} onOpen={onOpen} />);

      expect(screen.getByText("1 hour ago")).toBeInTheDocument();
    });

    it("shows days for times less than a week", () => {
      const daysAgoPR = {
        ...mockPR,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      };
      const onOpen = vi.fn();
      render(<PullRequestItem pullRequest={daysAgoPR} onOpen={onOpen} />);

      expect(screen.getByText("3 days ago")).toBeInTheDocument();
    });

    it("shows singular day for 1 day", () => {
      const oneDayAgoPR = {
        ...mockPR,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      };
      const onOpen = vi.fn();
      render(<PullRequestItem pullRequest={oneDayAgoPR} onOpen={onOpen} />);

      expect(screen.getByText("1 day ago")).toBeInTheDocument();
    });

    it("shows date for times more than a week", () => {
      const weeksAgoPR = {
        ...mockPR,
        createdAt: new Date(
          Date.now() - 14 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 14 days ago
      };
      const onOpen = vi.fn();
      render(<PullRequestItem pullRequest={weeksAgoPR} onOpen={onOpen} />);

      // Should show a formatted date instead of "X days ago"
      const expectedDate = new Date(weeksAgoPR.createdAt).toLocaleDateString();
      expect(screen.getByText(expectedDate)).toBeInTheDocument();
    });
  });

  it("renders open in browser button", () => {
    const onOpen = vi.fn();
    render(<PullRequestItem pullRequest={mockPR} onOpen={onOpen} />);

    expect(screen.getByTitle("Open in browser")).toBeInTheDocument();
  });

  describe("Extended PR details", () => {
    it("renders draft badge when PR is draft", () => {
      const draftPR: PullRequest = {
        ...mockPR,
        isDraft: true,
      };
      const onOpen = vi.fn();
      render(<PullRequestItem pullRequest={draftPR} onOpen={onOpen} />);

      expect(screen.getByText("Draft")).toBeInTheDocument();
    });

    it("does not render draft badge when PR is not draft", () => {
      const nonDraftPR: PullRequest = {
        ...mockPR,
        isDraft: false,
      };
      const onOpen = vi.fn();
      render(<PullRequestItem pullRequest={nonDraftPR} onOpen={onOpen} />);

      expect(screen.queryByText("Draft")).not.toBeInTheDocument();
    });

    it("renders approved badge when review decision is approved", () => {
      const approvedPR: PullRequest = {
        ...mockPR,
        reviewDecision: "APPROVED",
      };
      const onOpen = vi.fn();
      render(<PullRequestItem pullRequest={approvedPR} onOpen={onOpen} />);

      expect(screen.getByText("Approved")).toBeInTheDocument();
    });

    it("renders changes requested badge when review decision is changes requested", () => {
      const changesRequestedPR: PullRequest = {
        ...mockPR,
        reviewDecision: "CHANGES_REQUESTED",
      };
      const onOpen = vi.fn();
      render(
        <PullRequestItem pullRequest={changesRequestedPR} onOpen={onOpen} />,
      );

      expect(screen.getByText("Changes requested")).toBeInTheDocument();
    });

    it("renders review required badge when review decision is review required", () => {
      const reviewRequiredPR: PullRequest = {
        ...mockPR,
        reviewDecision: "REVIEW_REQUIRED",
      };
      const onOpen = vi.fn();
      render(
        <PullRequestItem pullRequest={reviewRequiredPR} onOpen={onOpen} />,
      );

      expect(screen.getByText("Review required")).toBeInTheDocument();
    });

    it("renders CI status indicator with success state", () => {
      const successPR: PullRequest = {
        ...mockPR,
        statusCheckRollup: { state: "SUCCESS" },
      };
      const onOpen = vi.fn();
      render(<PullRequestItem pullRequest={successPR} onOpen={onOpen} />);

      expect(screen.getByText("SUCCESS")).toBeInTheDocument();
    });

    it("renders CI status indicator with failure state", () => {
      const failurePR: PullRequest = {
        ...mockPR,
        statusCheckRollup: { state: "FAILURE" },
      };
      const onOpen = vi.fn();
      render(<PullRequestItem pullRequest={failurePR} onOpen={onOpen} />);

      expect(screen.getByText("FAILURE")).toBeInTheDocument();
    });

    it("renders comments count when available", () => {
      const prWithComments: PullRequest = {
        ...mockPR,
        commentsCount: 5,
      };
      const onOpen = vi.fn();
      render(<PullRequestItem pullRequest={prWithComments} onOpen={onOpen} />);

      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByTitle("Comments")).toBeInTheDocument();
    });

    it("does not render comments count when zero", () => {
      const prWithNoComments: PullRequest = {
        ...mockPR,
        commentsCount: 0,
      };
      const onOpen = vi.fn();
      render(
        <PullRequestItem pullRequest={prWithNoComments} onOpen={onOpen} />,
      );

      expect(screen.queryByTitle("Comments")).not.toBeInTheDocument();
    });

    it("renders changed files count when available", () => {
      const prWithFiles: PullRequest = {
        ...mockPR,
        changedFiles: 10,
      };
      const onOpen = vi.fn();
      render(<PullRequestItem pullRequest={prWithFiles} onOpen={onOpen} />);

      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByTitle("Changed files")).toBeInTheDocument();
    });

    it("renders reviewer requests count when available", () => {
      const prWithReviewers: PullRequest = {
        ...mockPR,
        reviewRequestsCount: 3,
      };
      const onOpen = vi.fn();
      render(<PullRequestItem pullRequest={prWithReviewers} onOpen={onOpen} />);

      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByTitle("Reviewers requested")).toBeInTheDocument();
    });

    it("renders merge conflict warning when PR has conflicts", () => {
      const conflictingPR: PullRequest = {
        ...mockPR,
        mergeable: "CONFLICTING",
      };
      const onOpen = vi.fn();
      render(<PullRequestItem pullRequest={conflictingPR} onOpen={onOpen} />);

      expect(screen.getByText("CONFLICTS")).toBeInTheDocument();
      expect(screen.getByTitle("Has merge conflicts")).toBeInTheDocument();
    });

    it("does not render merge conflict warning when PR is mergeable", () => {
      const mergeablePR: PullRequest = {
        ...mockPR,
        mergeable: "MERGEABLE",
      };
      const onOpen = vi.fn();
      render(<PullRequestItem pullRequest={mergeablePR} onOpen={onOpen} />);

      expect(screen.queryByText("CONFLICTS")).not.toBeInTheDocument();
    });

    it("renders multiple extended details at once", () => {
      const fullDetailsPR: PullRequest = {
        ...mockPR,
        isDraft: true,
        reviewDecision: "APPROVED",
        statusCheckRollup: { state: "SUCCESS" },
        commentsCount: 5,
        changedFiles: 10,
        reviewRequestsCount: 2,
        mergeable: "MERGEABLE",
      };
      const onOpen = vi.fn();
      render(<PullRequestItem pullRequest={fullDetailsPR} onOpen={onOpen} />);

      expect(screen.getByText("Draft")).toBeInTheDocument();
      expect(screen.getByText("Approved")).toBeInTheDocument();
      expect(screen.getByText("SUCCESS")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });
});
