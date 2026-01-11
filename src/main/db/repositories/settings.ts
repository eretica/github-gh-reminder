import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { Settings } from "../../../shared/types";
import * as schema from "../schema";

export class SettingsRepository {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  async getAll(): Promise<Settings> {
    const records = await this.db.select().from(schema.settings);

    const settingsMap = new Map(
      records.map((r) => [r.key, JSON.parse(r.value)]),
    );

    return {
      notifyOnNew: settingsMap.get("notifyOnNew") ?? true,
      enableReminder: settingsMap.get("enableReminder") ?? true,
      reminderIntervalHours: settingsMap.get("reminderIntervalHours") ?? 4,
      checkIntervalMinutes: settingsMap.get("checkIntervalMinutes") ?? 5,
      showRefreshToast: settingsMap.get("showRefreshToast") ?? true,
    };
  }

  async get<K extends keyof Settings>(key: K): Promise<Settings[K] | null> {
    const records = await this.db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, key));

    if (records.length === 0) return null;

    return JSON.parse(records[0].value) as Settings[K];
  }

  async set<K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ): Promise<void> {
    await this.db
      .insert(schema.settings)
      .values({
        key,
        value: JSON.stringify(value),
      })
      .onConflictDoUpdate({
        target: schema.settings.key,
        set: { value: JSON.stringify(value) },
      });
  }

  async setAll(settings: Partial<Settings>): Promise<void> {
    const entries = Object.entries(settings) as Array<
      [keyof Settings, Settings[keyof Settings]]
    >;

    await this.db.transaction(async (tx) => {
      for (const [key, value] of entries) {
        await tx
          .insert(schema.settings)
          .values({ key, value: JSON.stringify(value) })
          .onConflictDoUpdate({
            target: schema.settings.key,
            set: { value: JSON.stringify(value) },
          });
      }
    });
  }

  async delete(key: keyof Settings): Promise<void> {
    await this.db.delete(schema.settings).where(eq(schema.settings.key, key));
  }
}
