import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const repositories = sqliteTable("repositories", {
  id: text("id").primaryKey(),
  path: text("path").notNull(),
  name: text("name").notNull(),
  enabled: integer("enabled").notNull().default(1),
  order: integer("order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const pullRequests = sqliteTable("pull_requests", {
  id: text("id").primaryKey(),
  repositoryId: text("repository_id")
    .notNull()
    .references(() => repositories.id, { onDelete: "cascade" }),
  prNumber: integer("pr_number").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  author: text("author").notNull(),
  createdAt: text("created_at").notNull(),
  firstSeenAt: text("first_seen_at").notNull(),
  notifiedAt: text("notified_at"),
  lastRemindedAt: text("last_reminded_at"),
  reminderEnabled: integer("reminder_enabled").notNull().default(1),
});

export const notificationHistory = sqliteTable("notification_history", {
  id: text("id").primaryKey(),
  prId: text("pr_id")
    .notNull()
    .references(() => pullRequests.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'new' | 'remind'
  notifiedAt: text("notified_at").notNull(),
});

export type RepositoryRecord = typeof repositories.$inferSelect;
export type NewRepository = typeof repositories.$inferInsert;
export type PullRequestRecord = typeof pullRequests.$inferSelect;
export type NewPullRequest = typeof pullRequests.$inferInsert;
export type NotificationHistoryRecord = typeof notificationHistory.$inferSelect;
export type NewNotificationHistory = typeof notificationHistory.$inferInsert;
