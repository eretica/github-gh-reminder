/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IpcApi, Repository } from "../../../../shared/types";
import { useRepositories } from "./useRepositories";

// Mock window.api
const mockApi: Partial<IpcApi> = {
  listRepositories: vi.fn(),
  addRepository: vi.fn(),
  removeRepository: vi.fn(),
  toggleRepository: vi.fn(),
  reorderRepositories: vi.fn(),
};

// Set up window.api mock
beforeEach(() => {
  (window as unknown as { api: Partial<IpcApi> }).api = mockApi;
});

describe("useRepositories", () => {
  const mockRepositories: Repository[] = [
    {
      id: "repo1",
      path: "/path/to/repo1",
      name: "owner/repo1",
      enabled: true,
      order: 0,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "repo2",
      path: "/path/to/repo2",
      name: "owner/repo2",
      enabled: false,
      order: 1,
      createdAt: "2024-01-02T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (mockApi.listRepositories as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockRepositories,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts with loading true", async () => {
      const { result } = renderHook(() => useRepositories());

      // Initially loading is true
      expect(result.current.loading).toBe(true);
      expect(result.current.repositories).toEqual([]);
      expect(result.current.error).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe("data fetching", () => {
    it("fetches repositories on mount", async () => {
      const { result } = renderHook(() => useRepositories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockApi.listRepositories).toHaveBeenCalledTimes(1);
      expect(result.current.repositories).toEqual(mockRepositories);
    });

    it("sets error on fetch failure", async () => {
      (mockApi.listRepositories as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error"),
      );

      const { result } = renderHook(() => useRepositories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Network error");
      expect(result.current.repositories).toEqual([]);
    });
  });

  describe("addRepository", () => {
    it("adds repository and updates state", async () => {
      const newRepo: Repository = {
        id: "repo3",
        path: "/path/to/repo3",
        name: "owner/repo3",
        enabled: true,
        order: 2,
        createdAt: "2024-01-03T00:00:00Z",
        updatedAt: "2024-01-03T00:00:00Z",
      };
      (mockApi.addRepository as ReturnType<typeof vi.fn>).mockResolvedValue(
        newRepo,
      );

      const { result } = renderHook(() => useRepositories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addRepository();
      });

      expect(mockApi.addRepository).toHaveBeenCalledWith("");
      expect(result.current.repositories).toContainEqual(newRepo);
    });
  });

  describe("removeRepository", () => {
    it("removes repository and updates state", async () => {
      (mockApi.removeRepository as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );

      const { result } = renderHook(() => useRepositories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.removeRepository("repo1");
      });

      expect(mockApi.removeRepository).toHaveBeenCalledWith("repo1");
      expect(
        result.current.repositories.find((r) => r.id === "repo1"),
      ).toBeUndefined();
    });
  });

  describe("toggleRepository", () => {
    it("toggles repository enabled state", async () => {
      (mockApi.toggleRepository as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );

      const { result } = renderHook(() => useRepositories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.toggleRepository("repo1", false);
      });

      expect(mockApi.toggleRepository).toHaveBeenCalledWith("repo1", false);
      expect(
        result.current.repositories.find((r) => r.id === "repo1")?.enabled,
      ).toBe(false);
    });
  });

  describe("reorderRepositories", () => {
    it("reorders repositories", async () => {
      (
        mockApi.reorderRepositories as ReturnType<typeof vi.fn>
      ).mockResolvedValue(undefined);

      const { result } = renderHook(() => useRepositories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.reorderRepositories(["repo2", "repo1"]);
      });

      expect(mockApi.reorderRepositories).toHaveBeenCalledWith([
        "repo2",
        "repo1",
      ]);
      expect(result.current.repositories[0].id).toBe("repo2");
      expect(result.current.repositories[1].id).toBe("repo1");
    });
  });

  describe("refresh", () => {
    it("refetches repositories", async () => {
      const { result } = renderHook(() => useRepositories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updatedRepos = [
        ...mockRepositories,
        {
          id: "repo3",
          path: "/path/to/repo3",
          name: "owner/repo3",
          enabled: true,
          order: 2,
          createdAt: "2024-01-03T00:00:00Z",
          updatedAt: "2024-01-03T00:00:00Z",
        },
      ];
      (mockApi.listRepositories as ReturnType<typeof vi.fn>).mockResolvedValue(
        updatedRepos,
      );

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockApi.listRepositories).toHaveBeenCalledTimes(2);
      expect(result.current.repositories).toEqual(updatedRepos);
    });
  });

  describe("error handling", () => {
    it("sets generic error for non-Error exceptions on fetch", async () => {
      (mockApi.listRepositories as ReturnType<typeof vi.fn>).mockRejectedValue(
        "string error",
      );

      const { result } = renderHook(() => useRepositories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Failed to load repositories");
    });

    it("sets error on addRepository failure", async () => {
      (mockApi.addRepository as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Add failed"),
      );

      const { result } = renderHook(() => useRepositories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addRepository();
      });

      expect(result.current.error).toBe("Add failed");
    });

    it("sets generic error for non-Error on addRepository", async () => {
      (mockApi.addRepository as ReturnType<typeof vi.fn>).mockRejectedValue(
        "string error",
      );

      const { result } = renderHook(() => useRepositories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addRepository();
      });

      expect(result.current.error).toBe("Failed to add repository");
    });

    it("sets error on removeRepository failure", async () => {
      (mockApi.removeRepository as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Remove failed"),
      );

      const { result } = renderHook(() => useRepositories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.removeRepository("repo1");
      });

      expect(result.current.error).toBe("Remove failed");
    });

    it("sets generic error for non-Error on removeRepository", async () => {
      (mockApi.removeRepository as ReturnType<typeof vi.fn>).mockRejectedValue(
        "string error",
      );

      const { result } = renderHook(() => useRepositories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.removeRepository("repo1");
      });

      expect(result.current.error).toBe("Failed to remove repository");
    });

    it("sets error on toggleRepository failure", async () => {
      (mockApi.toggleRepository as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Toggle failed"),
      );

      const { result } = renderHook(() => useRepositories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.toggleRepository("repo1", false);
      });

      expect(result.current.error).toBe("Toggle failed");
    });

    it("sets generic error for non-Error on toggleRepository", async () => {
      (mockApi.toggleRepository as ReturnType<typeof vi.fn>).mockRejectedValue(
        "string error",
      );

      const { result } = renderHook(() => useRepositories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.toggleRepository("repo1", false);
      });

      expect(result.current.error).toBe("Failed to toggle repository");
    });

    it("sets error on reorderRepositories failure", async () => {
      (
        mockApi.reorderRepositories as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Reorder failed"));

      const { result } = renderHook(() => useRepositories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.reorderRepositories(["repo2", "repo1"]);
      });

      expect(result.current.error).toBe("Reorder failed");
    });

    it("sets generic error for non-Error on reorderRepositories", async () => {
      (
        mockApi.reorderRepositories as ReturnType<typeof vi.fn>
      ).mockRejectedValue("string error");

      const { result } = renderHook(() => useRepositories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.reorderRepositories(["repo2", "repo1"]);
      });

      expect(result.current.error).toBe("Failed to reorder repositories");
    });

    it("does not add repository when null is returned", async () => {
      (mockApi.addRepository as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      const { result } = renderHook(() => useRepositories());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialLength = result.current.repositories.length;

      await act(async () => {
        await result.current.addRepository();
      });

      expect(result.current.repositories.length).toBe(initialLength);
    });
  });
});
