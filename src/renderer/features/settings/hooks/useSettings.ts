import { useCallback, useEffect, useState } from "react";
import type { Settings } from "../../../../shared/types";
import { DEFAULT_SETTINGS } from "../../../../shared/types";

interface UseSettingsReturn {
  settings: Settings;
  loading: boolean;
  error: string | null;
  updateSettings: (newSettings: Settings) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedSettings = await window.api.getSettings();
      setSettings(loadedSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateSettings = useCallback(async (newSettings: Settings) => {
    try {
      setError(null);
      await window.api.setSettings(newSettings);
      setSettings(newSettings);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update settings",
      );
    }
  }, []);

  return {
    settings,
    loading,
    error,
    updateSettings,
    refresh,
  };
}
