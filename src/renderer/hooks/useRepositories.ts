import { useCallback, useEffect, useState } from "react";
import type {
  Repository,
  RepositoryNotificationSettings,
} from "../../shared/types";

interface UseRepositoriesReturn {
  repositories: Repository[];
  loading: boolean;
  error: string | null;
  addRepository: () => Promise<void>;
  removeRepository: (id: string) => Promise<void>;
  toggleRepository: (id: string, enabled: boolean) => Promise<void>;
  reorderRepositories: (ids: string[]) => Promise<void>;
  updateNotificationSettings: (
    id: string,
    settings: Partial<RepositoryNotificationSettings>,
  ) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useRepositories(): UseRepositoriesReturn {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const repos = await window.api.listRepositories();
      setRepositories(repos);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load repositories",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addRepository = useCallback(async () => {
    try {
      setError(null);
      const repo = await window.api.addRepository("");
      if (repo) {
        setRepositories((prev) => [...prev, repo]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add repository");
    }
  }, []);

  const removeRepository = useCallback(async (id: string) => {
    try {
      setError(null);
      await window.api.removeRepository(id);
      setRepositories((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove repository",
      );
    }
  }, []);

  const toggleRepository = useCallback(async (id: string, enabled: boolean) => {
    try {
      setError(null);
      await window.api.toggleRepository(id, enabled);
      setRepositories((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled } : r)),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to toggle repository",
      );
    }
  }, []);

  const reorderRepositories = useCallback(async (ids: string[]) => {
    try {
      setError(null);
      await window.api.reorderRepositories(ids);
      setRepositories((prev) => {
        const repoMap = new Map(prev.map((r) => [r.id, r]));
        return ids.map((id, index) => ({ ...repoMap.get(id)!, order: index }));
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reorder repositories",
      );
    }
  }, []);

  const updateNotificationSettings = useCallback(
    async (id: string, settings: Partial<RepositoryNotificationSettings>) => {
      // Store previous state for rollback on error
      const previousState = repositories.find((r) => r.id === id);

      try {
        setError(null);
        // Optimistically update UI
        setRepositories((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...settings } : r)),
        );
        await window.api.updateRepositoryNotificationSettings(id, settings);
      } catch (err) {
        // Rollback on error
        if (previousState) {
          setRepositories((prev) =>
            prev.map((r) => (r.id === id ? previousState : r)),
          );
        }
        setError(
          err instanceof Error
            ? err.message
            : "Failed to update notification settings",
        );
      }
    },
    [repositories],
  );

  return {
    repositories,
    loading,
    error,
    addRepository,
    removeRepository,
    toggleRepository,
    reorderRepositories,
    updateNotificationSettings,
    refresh,
  };
}
