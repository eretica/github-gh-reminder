import type { PullRequest } from "../../shared/types";

interface PullRequestItemProps {
  pullRequest: PullRequest;
  onOpen: (url: string) => void;
}

const CI_STATUS = {
  SUCCESS: "SUCCESS",
  FAILURE: "FAILURE",
  ERROR: "ERROR",
  PENDING: "PENDING",
} as const;

const REVIEW_DECISION = {
  APPROVED: "APPROVED",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
} as const;

const MERGEABLE_STATE = {
  MERGEABLE: "MERGEABLE",
  CONFLICTING: "CONFLICTING",
  UNKNOWN: "UNKNOWN",
} as const;

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

function getStatusColor(status: string | undefined): string {
  switch (status?.toUpperCase()) {
    case CI_STATUS.SUCCESS:
    case REVIEW_DECISION.APPROVED:
      return "text-green-600";
    case CI_STATUS.FAILURE:
    case CI_STATUS.ERROR:
    case REVIEW_DECISION.CHANGES_REQUESTED:
      return "text-red-600";
    case CI_STATUS.PENDING:
    case REVIEW_DECISION.REVIEW_REQUIRED:
      return "text-yellow-600";
    default:
      return "text-gray-400";
  }
}

function getReviewDecisionBadge(
  reviewDecision: string | null | undefined,
): JSX.Element | null {
  if (!reviewDecision) return null;

  const badges: Record<string, { label: string; color: string }> = {
    [REVIEW_DECISION.APPROVED]: {
      label: "Approved",
      color: "bg-green-100 text-green-700",
    },
    [REVIEW_DECISION.CHANGES_REQUESTED]: {
      label: "Changes requested",
      color: "bg-red-100 text-red-700",
    },
    [REVIEW_DECISION.REVIEW_REQUIRED]: {
      label: "Review required",
      color: "bg-yellow-100 text-yellow-700",
    },
  };

  const badge = badges[reviewDecision];
  if (!badge) return null;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}
    >
      {badge.label}
    </span>
  );
}

export function PullRequestItem({
  pullRequest,
  onOpen,
}: PullRequestItemProps): JSX.Element {
  const ciStatus = pullRequest.statusCheckRollup?.state;
  const hasDetails =
    pullRequest.isDraft !== undefined ||
    pullRequest.reviewDecision ||
    ciStatus ||
    pullRequest.commentsCount ||
    pullRequest.changedFiles ||
    pullRequest.reviewRequestsCount ||
    pullRequest.mergeable === MERGEABLE_STATE.CONFLICTING;

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer group"
      onClick={() => onOpen(pullRequest.url)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-blue-600 font-mono text-sm">
              #{pullRequest.prNumber}
            </span>
            {pullRequest.isDraft && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                Draft
              </span>
            )}
            {getReviewDecisionBadge(pullRequest.reviewDecision)}
            <span className="text-gray-900 font-medium truncate">
              {pullRequest.title}
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
              @{pullRequest.author}
            </span>
            <span className="mx-2">·</span>
            <span>{formatRelativeTime(pullRequest.createdAt)}</span>
          </div>
          {hasDetails && (
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
              {ciStatus && (
                <span
                  className={`inline-flex items-center gap-1 ${getStatusColor(ciStatus)}`}
                  title={`CI Status: ${ciStatus}`}
                >
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    {ciStatus === CI_STATUS.SUCCESS ? (
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    ) : ciStatus === CI_STATUS.FAILURE ||
                      ciStatus === CI_STATUS.ERROR ? (
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    ) : (
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    )}
                  </svg>
                  <span className="uppercase text-[10px] font-medium">
                    {ciStatus}
                  </span>
                </span>
              )}
              {pullRequest.commentsCount !== undefined &&
                pullRequest.commentsCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1"
                    title="Comments"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {pullRequest.commentsCount}
                  </span>
                )}
              {pullRequest.changedFiles !== undefined &&
                pullRequest.changedFiles > 0 && (
                  <span
                    className="inline-flex items-center gap-1"
                    title="Changed files"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                    </svg>
                    {pullRequest.changedFiles}
                  </span>
                )}
              {pullRequest.reviewRequestsCount !== undefined &&
                pullRequest.reviewRequestsCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1"
                    title="Reviewers requested"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                    {pullRequest.reviewRequestsCount}
                  </span>
                )}
              {pullRequest.mergeable === MERGEABLE_STATE.CONFLICTING && (
                <span
                  className="inline-flex items-center gap-1 text-red-600"
                  title="Has merge conflicts"
                >
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-[10px] font-medium">CONFLICTS</span>
                </span>
              )}
            </div>
          )}
        </div>
        <button
          className="p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Open in browser"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
