import { useCallback, useEffect, useState } from "react";
import type { PullRequest, Repository } from "../../shared/types";

interface UsePullRequestsReturn {
  pullRequests: PullRequest[];
  repositories: Repository[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  openPullRequest: (url: string) => Promise<void>;
  lastUpdated: Date | null;
}

export function usePullRequests(): UsePullRequestsReturn {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadRepositories = useCallback(async () => {
    try {
      const repos = await window.api.listRepositories();
      setRepositories(repos.filter((r) => r.enabled));
    } catch {
      // Ignore repository loading errors
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [prs] = await Promise.all([
        window.api.refreshPullRequests(),
        loadRepositories(),
      ]);
      setPullRequests(prs);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh pull requests",
      );
    } finally {
      setLoading(false);
    }
  }, [loadRepositories]);

  useEffect(() => {
    // Initial load
    const loadData = async (): Promise<void> => {
      try {
        setLoading(true);
        const [prs] = await Promise.all([
          window.api.listPullRequests(),
          loadRepositories(),
        ]);
        setPullRequests(prs);
        setLastUpdated(new Date());
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load pull requests",
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to updates
    const unsubscribe = window.api.onPullRequestsUpdated((prs) => {
      setPullRequests(prs);
      setLastUpdated(new Date());
      loadRepositories();
    });

    return unsubscribe;
  }, [loadRepositories]);

  const openPullRequest = useCallback(async (url: string) => {
    try {
      await window.api.openPullRequest(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to open pull request",
      );
    }
  }, []);

  return {
    pullRequests,
    repositories,
    loading,
    error,
    refresh,
    openPullRequest,
    lastUpdated,
  };
}
