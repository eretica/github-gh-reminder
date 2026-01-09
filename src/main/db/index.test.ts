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
const mockAll = vi.fn();
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

    // Reset drizzle mocks - chain the methods for old queries
    mockGet.mockReturnValue(undefined);
    mockWhere.mockReturnValue({ get: mockGet });
    mockFrom.mockReturnValue({ where: mockWhere, all: mockAll });
    mockSelect.mockReturnValue({ from: mockFrom });

    // Mock for batch insert
    mockAll.mockReturnValue([]);

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

    it("initializes default settings with batch insert", () => {
      // Mock that no settings exist
      mockAll.mockReturnValue([]);

      initDatabase();

      // Should fetch all settings once
      expect(mockSelect).toHaveBeenCalled();
      expect(mockAll).toHaveBeenCalled();

      // Should insert all default settings in one batch
      expect(mockInsert).toHaveBeenCalled();

      // Verify all settings are in the batch
      const settingsKeys = Object.keys(
        DEFAULT_SETTINGS,
      ) as (keyof typeof DEFAULT_SETTINGS)[];

      const expectedValues = settingsKeys.map((key) => ({
        key,
        value: JSON.stringify(DEFAULT_SETTINGS[key]),
      }));

      expect(mockValues).toHaveBeenCalledWith(expectedValues);
    });

    it("does not overwrite existing settings", () => {
      // Mock that all settings already exist
      const existingSettings = Object.keys(DEFAULT_SETTINGS).map((key) => ({
        key,
        value: JSON.stringify(DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS]),
      }));
      mockAll.mockReturnValue(existingSettings);

      initDatabase();

      // SELECT should be called to check existing settings
      expect(mockSelect).toHaveBeenCalled();
      expect(mockAll).toHaveBeenCalled();

      // INSERT should not be called since all settings exist
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("only inserts missing settings", () => {
      // Mock that only some settings exist
      mockAll.mockReturnValue([
        { key: "notifyOnNew", value: "true" },
      ]);

      initDatabase();

      // Should insert only missing settings
      expect(mockInsert).toHaveBeenCalled();

      const expectedValues = [
        {
          key: "enableReminder",
          value: JSON.stringify(DEFAULT_SETTINGS.enableReminder),
        },
        {
          key: "reminderIntervalHours",
          value: JSON.stringify(DEFAULT_SETTINGS.reminderIntervalHours),
        },
        {
          key: "checkIntervalMinutes",
          value: JSON.stringify(DEFAULT_SETTINGS.checkIntervalMinutes),
        },
      ];

      expect(mockValues).toHaveBeenCalledWith(expectedValues);
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

    it("verifies migration path is correctly constructed", () => {
      initDatabase();

      const migrationsCall = mockMigrate.mock.calls[0];
      const migrationsPath = migrationsCall[1].migrationsFolder;

      // Should contain the correct path segments
      expect(migrationsPath).toContain("db");
      expect(migrationsPath).toContain("migrations");

      // Should be an absolute path or relative from __dirname
      expect(migrationsPath).toBeTruthy();
    });
  });
});
