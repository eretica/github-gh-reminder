# Database Migrations

This directory contains database migrations managed by Drizzle ORM.

## Overview

This project uses [Drizzle ORM](https://orm.drizzle.team/) with [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for database management. Migrations are automatically applied when the application starts.

## Migration Workflow

### 1. Modify the Schema

Edit the schema in `src/main/db/schema.ts` to add, modify, or remove tables and columns.

```typescript
// Example: Adding a new column
export const repositories = sqliteTable("repositories", {
  id: text("id").primaryKey(),
  path: text("path").notNull(),
  name: text("name").notNull(),
  enabled: integer("enabled").notNull().default(1),
  order: integer("order").notNull().default(0),
  color: text("color"), // New column
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

### 2. Generate Migration

Run the migration generation command:

```bash
pnpm db:generate
```

This will:
- Compare your schema with the current database state
- Generate a new migration file in `src/main/db/migrations/`
- Update the migration metadata in `meta/_journal.json`

### 3. Review the Migration

Check the generated SQL migration file to ensure it matches your intentions.

### 4. Apply Migrations

Migrations are automatically applied when the application starts via the `migrate()` function in `src/main/db/index.ts`.

For development/testing, you can also use:

```bash
pnpm db:migrate
```

## Migration Scripts

| Script | Description |
|--------|-------------|
| `pnpm db:generate` | Generate a new migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations (also runs automatically on app start) |

## Best Practices

### ✅ DO

- **Review migrations before committing**: Always check the generated SQL to ensure it's correct
- **Test migrations locally**: Run the app after generating migrations to verify they work
- **Use descriptive names**: If you manually name migrations, use clear, descriptive names
- **Keep migrations small**: Make incremental changes rather than large schema overhauls
- **Version control everything**: Commit both schema changes and generated migrations together

### ❌ DON'T

- **Don't edit applied migrations**: Once a migration is applied, create a new migration for changes
- **Don't delete migration files**: This can cause inconsistencies between environments
- **Don't skip migrations**: Always apply migrations in order
- **Don't use raw SQL in application code**: Use the Drizzle schema and ORM instead

## Migration Files Structure

```
migrations/
├── 0000_initial_schema.sql       # Initial database schema
├── 0001_add_color_to_repos.sql   # Example: future migration
├── meta/
│   ├── _journal.json             # Migration history
│   ├── 0000_snapshot.json        # Schema snapshot for version 0000
│   └── 0001_snapshot.json        # Schema snapshot for version 0001
└── README.md                      # This file
```

## Troubleshooting

### Migration fails on app start

1. Check the migration SQL file for syntax errors
2. Ensure your schema in `schema.ts` matches the migration
3. Check the console for detailed error messages

### Generated migration is empty

This usually means Drizzle doesn't detect any changes. Ensure:
- You saved your schema changes
- The schema types are correctly defined
- You're using Drizzle ORM types (not raw SQL types)

### Need to rollback a migration

Drizzle doesn't have built-in rollback. To undo a migration:
1. Create a new migration that reverses the changes
2. Or manually edit the database (not recommended for production)

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Drizzle Kit Documentation](https://orm.drizzle.team/kit-docs/overview)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- Project CLAUDE.md Section 2.2 (Database Initialization)
