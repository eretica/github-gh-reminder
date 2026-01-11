import { Toast } from "../components/ui";
import { PullRequestList } from "../features/pull-requests/components/PullRequestList";
import { usePullRequests } from "../features/pull-requests/hooks/usePullRequests";
import { useSettings } from "../features/settings/hooks/useSettings";
import { useToast } from "../hooks/useToast";

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function MainPage(): JSX.Element {
  const {
    pullRequests,
    repositories,
    loading,
    error,
    refresh,
    openPullRequest,
    lastUpdated,
  } = usePullRequests();
  const { settings } = useSettings();
  const { toasts, showToast, hideToast } = useToast();

  const handleOpenSettings = (): void => {
    window.location.hash = "#/settings";
  };

  const handleQuit = (): void => {
    window.api.quitApp();
  };

  const handleRefresh = async (): Promise<void> => {
    try {
      await refresh();
      if (settings.showRefreshToast) {
        showToast("Pull requests refreshed successfully", "success");
      }
    } catch (err) {
      if (settings.showRefreshToast) {
        showToast(
          err instanceof Error
            ? err.message
            : "Failed to refresh pull requests",
          "error",
        );
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <header className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-gray-700">
            Pending Reviews
          </h1>
          <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
            {pullRequests.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Settings button */}
          <button
            onClick={handleOpenSettings}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-all duration-200 hover:scale-110 active:scale-95"
            title="Settings"
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
          {/* Quit button */}
          <button
            onClick={handleQuit}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-200 rounded transition-all duration-200 hover:scale-110 active:scale-95"
            title="Quit"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm animate-fadeIn">
            {error}
          </div>
        )}

        {loading && pullRequests.length === 0 && repositories.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <PullRequestList
            pullRequests={pullRequests}
            repositories={repositories}
            onOpenPR={openPullRequest}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {lastUpdated ? `Last updated: ${formatTime(lastUpdated)}` : ""}
        </span>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
            loading
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-105 active:scale-95"
          }`}
        >
          <svg
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </footer>

      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </div>
  );
}
