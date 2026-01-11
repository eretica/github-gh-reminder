import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

// Mock better-sqlite3
const mockExec = vi.fn();
const mockPrepare = vi.fn();
const mockPragma = vi.fn();
const mockClose = vi.fn();

const mockDatabaseInstance = {
  exec: mockExec,
  prepare: mockPrepare,
  pragma: mockPragma,
  close: mockClose,
};

// Create a mock constructor function
function MockDatabaseConstructor() {
  return mockDatabaseInstance;
}

vi.mock("better-sqlite3", () => ({
  default: MockDatabaseConstructor,
}));

// Mock drizzle
const mockDrizzleInstance = { query: vi.fn() };
vi.mock("drizzle-orm/better-sqlite3", () => ({
  drizzle: vi.fn(() => mockDrizzleInstance),
}));

// Mock migrate function
vi.mock("drizzle-orm/better-sqlite3/migrator", () => ({
  migrate: vi.fn(),
}));

// Mock electron
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => "/mock/user/data"),
  },
}));

// Import after mocks
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { DEFAULT_SETTINGS } from "../../shared/types";
import { closeDatabase, getDatabase, initDatabase } from "./index";

const _MockDatabase = Database as unknown as Mock;
const mockDrizzle = drizzle as unknown as Mock;
const mockMigrate = migrate as unknown as Mock;

describe("Database", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module state by re-importing (not possible directly, so we close db)
    closeDatabase();

    // Reset mocks
    mockPrepare.mockReturnValue({
      get: vi.fn().mockReturnValue(undefined),
      run: vi.fn(),
    });
  });

  describe("initDatabase", () => {
    it("enables WAL mode", () => {
      initDatabase();

      expect(mockPragma).toHaveBeenCalledWith("journal_mode = WAL");
    });

    it("creates tables", () => {
      initDatabase();

      // Now tables are created via migrations
      expect(mockMigrate).toHaveBeenCalled();
      expect(mockMigrate).toHaveBeenCalledWith(
        mockDrizzleInstance,
        expect.objectContaining({
          migrationsFolder: expect.stringContaining("migrations"),
        }),
      );
    });

    it("creates indexes", () => {
      initDatabase();

      // Indexes are created after migrations via exec
      expect(mockExec).toHaveBeenCalled();
      const sqlCall = mockExec.mock.calls[mockExec.mock.calls.length - 1][0];
      expect(sqlCall).toContain("CREATE INDEX IF NOT EXISTS idx_pr_repository");
      expect(sqlCall).toContain(
        "CREATE INDEX IF NOT EXISTS idx_notification_pr",
      );
    });

    it("initializes drizzle ORM", () => {
      initDatabase();

      expect(mockDrizzle).toHaveBeenCalledWith(
        mockDatabaseInstance,
        expect.any(Object),
      );
    });

    it("returns drizzle instance", () => {
      const db = initDatabase();

      expect(db).toBe(mockDrizzleInstance);
    });

    it("returns same instance on subsequent calls", () => {
      const db1 = initDatabase();
      const db2 = initDatabase();

      expect(db1).toBe(db2);
    });

    it("initializes default settings", () => {
      const mockRun = vi.fn();
      mockPrepare.mockReturnValue({
        get: vi.fn().mockReturnValue(undefined), // Setting doesn't exist
        run: mockRun,
      });

      initDatabase();

      // Should insert each default setting
      const settingsKeys = Object.keys(
        DEFAULT_SETTINGS,
      ) as (keyof typeof DEFAULT_SETTINGS)[];
      expect(mockPrepare).toHaveBeenCalledWith(
        "SELECT key FROM settings WHERE key = ?",
      );
      expect(mockPrepare).toHaveBeenCalledWith(
        "INSERT INTO settings (key, value) VALUES (?, ?)",
      );

      // Verify settings are inserted
      for (const key of settingsKeys) {
        expect(mockRun).toHaveBeenCalledWith(
          key,
          JSON.stringify(DEFAULT_SETTINGS[key]),
        );
      }
    });

    it("does not overwrite existing settings", () => {
      const mockRun = vi.fn();
      const mockGet = vi.fn().mockReturnValue({ key: "notifyOnNew" }); // Setting exists
      mockPrepare.mockReturnValue({
        get: mockGet,
        run: mockRun,
      });

      initDatabase();

      // INSERT should not be called for existing settings
      expect(mockRun).not.toHaveBeenCalled();
    });
  });

  describe("getDatabase", () => {
    it("returns initialized database", () => {
      initDatabase();
      const db = getDatabase();

      expect(db).toBe(mockDrizzleInstance);
    });

    it("throws error when database not initialized", () => {
      expect(() => getDatabase()).toThrow(
        "Database not initialized. Call initDatabase() first.",
      );
    });
  });

  describe("closeDatabase", () => {
    it("closes sqlite connection", () => {
      initDatabase();
      closeDatabase();

      expect(mockClose).toHaveBeenCalled();
    });

    it("allows database to be re-initialized after close", () => {
      initDatabase();
      closeDatabase();

      // Should be able to call initDatabase again
      const db = initDatabase();
      expect(db).toBe(mockDrizzleInstance);
    });

    it("can be called multiple times safely", () => {
      initDatabase();
      vi.clearAllMocks(); // Clear mocks before testing close behavior
      closeDatabase();
      closeDatabase(); // Should not throw

      // Only one close call because sqlite is set to null after first close
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it("resets database state", () => {
      initDatabase();
      closeDatabase();

      // getDatabase should throw after close
      expect(() => getDatabase()).toThrow("Database not initialized");
    });
  });

  describe("table structure validation", () => {
    it("runs migrations on initialization", () => {
      initDatabase();

      expect(mockMigrate).toHaveBeenCalled();
      expect(mockMigrate).toHaveBeenCalledWith(
        mockDrizzleInstance,
        expect.objectContaining({
          migrationsFolder: expect.stringContaining("migrations"),
        }),
      );
    });

    it("creates indexes after migrations", () => {
      initDatabase();

      expect(mockExec).toHaveBeenCalled();
      const sqlCall = mockExec.mock.calls[mockExec.mock.calls.length - 1][0];
      expect(sqlCall).toContain("CREATE INDEX IF NOT EXISTS idx_pr_repository");
      expect(sqlCall).toContain(
        "CREATE INDEX IF NOT EXISTS idx_notification_pr",
      );
    });
  });
});
