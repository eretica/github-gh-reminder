import type { PullRequest, Repository } from "../../../../shared/types";
import { PullRequestItem } from "./PullRequestItem";

interface PullRequestListProps {
  pullRequests: PullRequest[];
  repositories: Repository[];
  onOpenPR: (url: string) => void;
  newPRIds?: Set<string>;
}

export function PullRequestList({
  pullRequests,
  repositories,
  onOpenPR,
  newPRIds = new Set(),
}: PullRequestListProps): JSX.Element {
  // Group PRs by repository name
  const prsByRepo = pullRequests.reduce(
    (acc, pr) => {
      if (!acc[pr.repositoryName]) {
        acc[pr.repositoryName] = [];
      }
      acc[pr.repositoryName].push(pr);
      return acc;
    },
    {} as Record<string, PullRequest[]>,
  );

  const handleOpenSettings = (): void => {
    window.api.openSettings();
  };

  // No repositories registered - show empty state with add button
  if (repositories.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 animate-fadeIn">
        <svg
          className="w-12 h-12 mx-auto mb-3 text-gray-300 animate-scaleIn"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        <p className="text-base font-medium">No repositories</p>
        <p className="text-sm mt-1 mb-4">
          Add a repository to start tracking PRs.
        </p>
        <button
          onClick={handleOpenSettings}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-200 hover:scale-105 active:scale-95"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Repository
        </button>
      </div>
    );
  }

  const handleOpenRepository = (repoName: string): void => {
    const url = `https://github.com/${repoName}`;
    window.api.openPullRequest(url);
  };

  // Show all repositories with their PRs (or empty message if no PRs)
  return (
    <div className="space-y-4">
      {repositories.map((repo) => {
        const repoPRs = prsByRepo[repo.name] || [];
        return (
          <div key={repo.id}>
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <button
                onClick={() => handleOpenRepository(repo.name)}
                className="font-medium text-gray-900 hover:text-blue-600 hover:underline transition-all duration-200"
              >
                {repo.name}
              </button>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {repoPRs.length}
              </span>
            </div>
            <div className="space-y-2 ml-1">
              {repoPRs.length > 0 ? (
                repoPRs.map((pr, index) => (
                  <div
                    key={pr.id}
                    className={newPRIds.has(pr.id) ? "animate-slideIn" : ""}
                    style={
                      newPRIds.has(pr.id)
                        ? { animationDelay: `${index * 50}ms` }
                        : {}
                    }
                  >
                    <PullRequestItem pullRequest={pr} onOpen={onOpenPR} />
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-400 py-2 pl-6 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  No pending reviews
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
