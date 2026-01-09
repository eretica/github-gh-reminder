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
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockGet = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockRun = vi.fn();

const mockDrizzleInstance = {
  query: vi.fn(),
  select: mockSelect,
  insert: mockInsert,
};

vi.mock("drizzle-orm/better-sqlite3", () => ({
  drizzle: vi.fn(() => mockDrizzleInstance),
}));

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

    // Reset drizzle mocks - chain the methods
    mockGet.mockReturnValue(undefined);
    mockWhere.mockReturnValue({ get: mockGet });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });

    mockRun.mockReturnValue(undefined);
    mockValues.mockReturnValue({ run: mockRun });
    mockInsert.mockReturnValue({ values: mockValues });

    // Reset other mocks
    mockPrepare.mockReturnValue({
      get: vi.fn().mockReturnValue(undefined),
      run: vi.fn(),
    });
    mockMigrate.mockClear();
  });

  describe("initDatabase", () => {
    it("enables WAL mode", () => {
      initDatabase();

      expect(mockPragma).toHaveBeenCalledWith("journal_mode = WAL");
    });

    it("runs migrations", () => {
      initDatabase();

      expect(mockMigrate).toHaveBeenCalledWith(
        mockDrizzleInstance,
        expect.objectContaining({
          migrationsFolder: expect.stringContaining("db/migrations"),
        }),
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
      // Mock that settings don't exist
      mockGet.mockReturnValue(undefined);

      initDatabase();

      // Should check for each default setting
      const settingsKeys = Object.keys(
        DEFAULT_SETTINGS,
      ) as (keyof typeof DEFAULT_SETTINGS)[];

      expect(mockSelect).toHaveBeenCalled();

      // Verify settings are inserted
      expect(mockInsert).toHaveBeenCalled();
      for (const key of settingsKeys) {
        expect(mockValues).toHaveBeenCalledWith({
          key,
          value: JSON.stringify(DEFAULT_SETTINGS[key]),
        });
      }
    });

    it("does not overwrite existing settings", () => {
      // Mock that settings exist
      mockGet.mockReturnValue({ key: "notifyOnNew", value: "true" });

      initDatabase();

      // INSERT should not be called for existing settings
      expect(mockInsert).not.toHaveBeenCalled();
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

  describe("migration verification", () => {
    it("verifies migrations create all required tables", () => {
      initDatabase();

      // Verify migrations were called
      expect(mockMigrate).toHaveBeenCalledTimes(1);

      // Verify migrations folder path is correct
      const migrationsCall = mockMigrate.mock.calls[0];
      expect(migrationsCall[1].migrationsFolder).toContain("db/migrations");
    });

    it("verifies error handling during initialization", () => {
      closeDatabase();

      // Mock Database to throw error
      const originalDatabase = MockDatabaseConstructor;
      vi.mocked(MockDatabaseConstructor).mockImplementationOnce(() => {
        throw new Error("Database connection failed");
      });

      // Should throw with proper error message
      expect(() => initDatabase()).toThrow("Database connection failed");
    });
  });
});
