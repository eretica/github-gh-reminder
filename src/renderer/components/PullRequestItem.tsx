import type { PullRequest } from "../../shared/types";

interface PullRequestItemProps {
  pullRequest: PullRequest;
  onOpen: (url: string) => void;
}

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

export function PullRequestItem({
  pullRequest,
  onOpen,
}: PullRequestItemProps): JSX.Element {
  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer group"
      onClick={() => onOpen(pullRequest.url)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-blue-600 font-mono text-sm">
              #{pullRequest.prNumber}
            </span>
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
