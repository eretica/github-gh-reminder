import Database from "better-sqlite3";
import {
  type BetterSQLite3Database,
  drizzle,
} from "drizzle-orm/better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../schema";
import { PullRequestRepository } from "./pullRequest";

describe("PullRequestRepository", () => {
  let sqlite: Database.Database;
  let db: BetterSQLite3Database<typeof schema>;
  let repo: PullRequestRepository;
  let testRepositoryId: string;

  beforeEach(() => {
    // Create in-memory database
    sqlite = new Database(":memory:");
    db = drizzle(sqlite, { schema });

    // Create tables
    sqlite.exec(`
      CREATE TABLE repositories (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        "order" INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE pull_requests (
        id TEXT PRIMARY KEY,
        repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
        pr_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        author TEXT NOT NULL,
        created_at TEXT NOT NULL,
        first_seen_at TEXT NOT NULL,
        notified_at TEXT,
        last_reminded_at TEXT,
        reminder_enabled INTEGER NOT NULL DEFAULT 1
      );
    `);

    // Insert test repository
    testRepositoryId = "test-repo-id";
    sqlite
      .prepare(
        "INSERT INTO repositories (id, path, name, enabled, 'order', created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        testRepositoryId,
        "/test/path",
        "test-repo",
        1,
        0,
        new Date().toISOString(),
        new Date().toISOString(),
      );

    repo = new PullRequestRepository(db);
  });

  afterEach(() => {
    sqlite.close();
  });

  describe("reminderEnabled feature", () => {
    it("should create a new pull request with default reminderEnabled=true", async () => {
      const pr = await repo.create({
        repositoryId: testRepositoryId,
        repositoryName: "test-repo",
        prNumber: 123,
        title: "Test PR",
        url: "https://github.com/test/repo/pull/123",
        author: "testuser",
        createdAt: new Date().toISOString(),
        notifiedAt: null,
        lastRemindedAt: null,
      });

      expect(pr.id).toBeDefined();
      expect(pr.prNumber).toBe(123);
      expect(pr.title).toBe("Test PR");
      expect(pr.reminderEnabled).toBe(true);
    });

    it("should create a new pull request with reminderEnabled=false", async () => {
      const pr = await repo.create({
        repositoryId: testRepositoryId,
        repositoryName: "test-repo",
        prNumber: 124,
        title: "Test PR 2",
        url: "https://github.com/test/repo/pull/124",
        author: "testuser",
        createdAt: new Date().toISOString(),
        notifiedAt: null,
        lastRemindedAt: null,
        reminderEnabled: false,
      });

      expect(pr.reminderEnabled).toBe(false);
    });

    it("should update reminderEnabled from true to false", async () => {
      const created = await repo.create({
        repositoryId: testRepositoryId,
        repositoryName: "test-repo",
        prNumber: 125,
        title: "Test PR 3",
        url: "https://github.com/test/repo/pull/125",
        author: "testuser",
        createdAt: new Date().toISOString(),
        notifiedAt: null,
        lastRemindedAt: null,
      });

      expect(created.reminderEnabled).toBe(true);

      const updated = await repo.update(created.id, {
        reminderEnabled: false,
      });

      expect(updated.reminderEnabled).toBe(false);
    });

    it("should update reminderEnabled from false to true", async () => {
      const created = await repo.create({
        repositoryId: testRepositoryId,
        repositoryName: "test-repo",
        prNumber: 126,
        title: "Test PR 4",
        url: "https://github.com/test/repo/pull/126",
        author: "testuser",
        createdAt: new Date().toISOString(),
        notifiedAt: null,
        lastRemindedAt: null,
        reminderEnabled: false,
      });

      expect(created.reminderEnabled).toBe(false);

      const updated = await repo.update(created.id, {
        reminderEnabled: true,
      });

      expect(updated.reminderEnabled).toBe(true);
    });

    it("should preserve reminderEnabled when updating other fields", async () => {
      const created = await repo.create({
        repositoryId: testRepositoryId,
        repositoryName: "test-repo",
        prNumber: 127,
        title: "Test PR 5",
        url: "https://github.com/test/repo/pull/127",
        author: "testuser",
        createdAt: new Date().toISOString(),
        notifiedAt: null,
        lastRemindedAt: null,
        reminderEnabled: false,
      });

      const updated = await repo.update(created.id, {
        title: "Updated Title",
      });

      expect(updated.title).toBe("Updated Title");
      expect(updated.reminderEnabled).toBe(false);
    });

    it("should return correct reminderEnabled value when finding by id", async () => {
      const created = await repo.create({
        repositoryId: testRepositoryId,
        repositoryName: "test-repo",
        prNumber: 128,
        title: "Test PR 6",
        url: "https://github.com/test/repo/pull/128",
        author: "testuser",
        createdAt: new Date().toISOString(),
        notifiedAt: null,
        lastRemindedAt: null,
        reminderEnabled: false,
      });

      const found = await repo.findById(created.id);

      expect(found).not.toBeNull();
      expect(found?.reminderEnabled).toBe(false);
    });

    it("should return all pull requests with correct reminderEnabled values", async () => {
      await repo.create({
        repositoryId: testRepositoryId,
        repositoryName: "test-repo",
        prNumber: 129,
        title: "Test PR 7",
        url: "https://github.com/test/repo/pull/129",
        author: "testuser",
        createdAt: new Date().toISOString(),
        notifiedAt: null,
        lastRemindedAt: null,
        reminderEnabled: true,
      });

      await repo.create({
        repositoryId: testRepositoryId,
        repositoryName: "test-repo",
        prNumber: 130,
        title: "Test PR 8",
        url: "https://github.com/test/repo/pull/130",
        author: "testuser",
        createdAt: new Date().toISOString(),
        notifiedAt: null,
        lastRemindedAt: null,
        reminderEnabled: false,
      });

      const prs = await repo.findAll();

      expect(prs).toHaveLength(2);
      expect(prs[0].reminderEnabled).toBe(true);
      expect(prs[1].reminderEnabled).toBe(false);
    });
  });
});
