import { join } from "node:path";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { app } from "electron";
import { DEFAULT_SETTINGS } from "../../shared/types";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqlite: Database.Database | null = null;

export function initDatabase(): ReturnType<typeof drizzle<typeof schema>> {
  if (db) return db;

  try {
    const userDataPath = app.getPath("userData");
    const dbPath = join(userDataPath, "github-pr-reminder.db");

    sqlite = new Database(dbPath);

    // Enable WAL mode for better performance
    sqlite.pragma("journal_mode = WAL");

    db = drizzle(sqlite, { schema });

    // Run migrations to create/update database schema
    const migrationsFolder = join(__dirname, "db", "migrations");
    migrate(db, { migrationsFolder });

    // Initialize default settings if not exist
    initDefaultSettings();

    return db;
  } catch (error) {
    // Log detailed error only in development
    if (process.env.NODE_ENV !== "production") {
      console.error("Database initialization failed:", error);
    }

    // Clean up database connection on error
    if (sqlite) {
      sqlite.close();
      sqlite = null;
    }

    // Throw sanitized error for production
    const sanitizedError =
      error instanceof Error
        ? new Error("Database initialization failed")
        : new Error("Unknown database error");

    throw sanitizedError;
  }
}

function initDefaultSettings(): void {
  if (!db) return;

  // Get all existing settings at once to avoid N+1 queries
  const existingSettings = db.select().from(schema.settings).all();
  const existingKeys = new Set(existingSettings.map((s) => s.key));

  // Batch insert missing settings
  const settingsToInsert = Object.entries(DEFAULT_SETTINGS)
    .filter(([key]) => !existingKeys.has(key))
    .map(([key, value]) => ({
      key,
      value: JSON.stringify(value),
    }));

  if (settingsToInsert.length > 0) {
    db.insert(schema.settings).values(settingsToInsert).run();
  }
}

export function getDatabase(): ReturnType<typeof drizzle<typeof schema>> {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}
