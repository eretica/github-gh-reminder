import { useCallback, useEffect, useState } from "react";

interface UseSystemSoundsReturn {
  sounds: string[];
  loading: boolean;
  error: string | null;
  playSound: (soundName: string) => Promise<void>;
}

export function useSystemSounds(): UseSystemSoundsReturn {
  const [sounds, setSounds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSounds = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);
        const systemSounds = await window.api.getSystemSounds();
        setSounds(systemSounds);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load system sounds",
        );
      } finally {
        setLoading(false);
      }
    };

    loadSounds();
  }, []);

  const playSound = useCallback(async (soundName: string) => {
    try {
      await window.api.playSound(soundName);
    } catch (err) {
      console.error("Failed to play sound:", err);
    }
  }, []);

  return {
    sounds,
    loading,
    error,
    playSound,
  };
}
