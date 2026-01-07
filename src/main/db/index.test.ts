import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

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

// Mock electron
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => "/mock/user/data"),
  },
}));

// Import after mocks
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { initDatabase, getDatabase, closeDatabase } from "./index";
import { DEFAULT_SETTINGS } from "../../shared/types";

const MockDatabase = Database as unknown as Mock;
const mockDrizzle = drizzle as unknown as Mock;

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

      expect(mockExec).toHaveBeenCalled();
      const sqlCall = mockExec.mock.calls[0][0];
      expect(sqlCall).toContain("CREATE TABLE IF NOT EXISTS repositories");
      expect(sqlCall).toContain("CREATE TABLE IF NOT EXISTS settings");
      expect(sqlCall).toContain("CREATE TABLE IF NOT EXISTS pull_requests");
      expect(sqlCall).toContain("CREATE TABLE IF NOT EXISTS notification_history");
    });

    it("creates indexes", () => {
      initDatabase();

      const sqlCall = mockExec.mock.calls[0][0];
      expect(sqlCall).toContain("CREATE INDEX IF NOT EXISTS idx_pr_repository");
      expect(sqlCall).toContain("CREATE INDEX IF NOT EXISTS idx_notification_pr");
    });

    it("initializes drizzle ORM", () => {
      initDatabase();

      expect(mockDrizzle).toHaveBeenCalledWith(mockDatabaseInstance, expect.any(Object));
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
      const settingsKeys = Object.keys(DEFAULT_SETTINGS) as (keyof typeof DEFAULT_SETTINGS)[];
      expect(mockPrepare).toHaveBeenCalledWith("SELECT key FROM settings WHERE key = ?");
      expect(mockPrepare).toHaveBeenCalledWith("INSERT INTO settings (key, value) VALUES (?, ?)");

      // Verify settings are inserted
      for (const key of settingsKeys) {
        expect(mockRun).toHaveBeenCalledWith(key, JSON.stringify(DEFAULT_SETTINGS[key]));
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
      expect(() => getDatabase()).toThrow("Database not initialized. Call initDatabase() first.");
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
    it("repositories table has required fields", () => {
      initDatabase();

      const sqlCall = mockExec.mock.calls[0][0];
      expect(sqlCall).toContain("id TEXT PRIMARY KEY");
      expect(sqlCall).toContain("path TEXT NOT NULL");
      expect(sqlCall).toContain("name TEXT NOT NULL");
      expect(sqlCall).toContain("enabled INTEGER NOT NULL DEFAULT 1");
      expect(sqlCall).toContain('"order" INTEGER NOT NULL DEFAULT 0');
      expect(sqlCall).toContain("created_at TEXT NOT NULL");
      expect(sqlCall).toContain("updated_at TEXT NOT NULL");
    });

    it("pull_requests table has required fields", () => {
      initDatabase();

      const sqlCall = mockExec.mock.calls[0][0];
      expect(sqlCall).toContain("repository_id TEXT NOT NULL REFERENCES repositories(id)");
      expect(sqlCall).toContain("pr_number INTEGER NOT NULL");
      expect(sqlCall).toContain("title TEXT NOT NULL");
      expect(sqlCall).toContain("url TEXT NOT NULL");
      expect(sqlCall).toContain("author TEXT NOT NULL");
      expect(sqlCall).toContain("first_seen_at TEXT NOT NULL");
      expect(sqlCall).toContain("notified_at TEXT");
      expect(sqlCall).toContain("last_reminded_at TEXT");
    });

    it("pull_requests has cascade delete", () => {
      initDatabase();

      const sqlCall = mockExec.mock.calls[0][0];
      expect(sqlCall).toContain("ON DELETE CASCADE");
    });

    it("settings table has required fields", () => {
      initDatabase();

      const sqlCall = mockExec.mock.calls[0][0];
      expect(sqlCall).toContain("key TEXT PRIMARY KEY");
      expect(sqlCall).toContain("value TEXT NOT NULL");
    });

    it("notification_history table has required fields", () => {
      initDatabase();

      const sqlCall = mockExec.mock.calls[0][0];
      expect(sqlCall).toContain("CREATE TABLE IF NOT EXISTS notification_history");
      expect(sqlCall).toContain("pr_id TEXT NOT NULL REFERENCES pull_requests(id)");
      expect(sqlCall).toContain("type TEXT NOT NULL");
      expect(sqlCall).toContain("notified_at TEXT NOT NULL");
    });
  });
});
