import { CI_STATUS, REVIEW_DECISION } from "./constants";

export function getStatusColor(status: string | undefined): string {
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

export function getReviewDecisionBadge(
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
