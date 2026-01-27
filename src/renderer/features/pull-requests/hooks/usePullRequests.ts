import { useCallback, useEffect, useState } from "react";
import type { PullRequest, Repository } from "../../../../shared/types";

interface UsePullRequestsReturn {
  pullRequests: PullRequest[];
  repositories: Repository[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  openPullRequest: (url: string) => Promise<void>;
  lastUpdated: Date | null;
  newPRIds: Set<string>;
}

export function usePullRequests(): UsePullRequestsReturn {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [prevPRIds, setPrevPRIds] = useState<Set<string>>(new Set());
  const [newPRIds, setNewPRIds] = useState<Set<string>>(new Set());

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

      // Detect new PRs
      const currentIds = new Set(prs.map(pr => pr.id));
      const newIds = new Set<string>();
      for (const id of currentIds) {
        if (!prevPRIds.has(id)) {
          newIds.add(id);
        }
      }

      setPullRequests(prs);
      setNewPRIds(newIds);
      setPrevPRIds(currentIds);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh pull requests",
      );
    } finally {
      setLoading(false);
    }
  }, [loadRepositories, prevPRIds]);

  useEffect(() => {
    // Initial load
    const loadData = async (): Promise<void> => {
      try {
        setLoading(true);
        const [prs] = await Promise.all([
          window.api.listPullRequests(),
          loadRepositories(),
        ]);

        // Initial load: no animation
        const currentIds = new Set(prs.map(pr => pr.id));
        setPullRequests(prs);
        setNewPRIds(new Set());
        setPrevPRIds(currentIds);
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
      // Detect new PRs
      const currentIds = new Set(prs.map(pr => pr.id));
      const newIds = new Set<string>();
      for (const id of currentIds) {
        if (!prevPRIds.has(id)) {
          newIds.add(id);
        }
      }

      setPullRequests(prs);
      setNewPRIds(newIds);
      setPrevPRIds(currentIds);
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
    newPRIds,
  };
}
