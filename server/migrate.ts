import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import { log } from "./vite";

async function runMigration() {
  log("Starting database migration...", "migration");

  try {
    const sqlite = new Database("database.sqlite");
    const db = drizzle(sqlite);

    // Run migrations
    await migrate(db, { migrationsFolder: "./drizzle" });

    log("Migration completed successfully", "migration");

    // Close database connection
    sqlite.close();
  } catch (error) {
    log(`Migration failed: ${(error as Error).message}`, "migration");
    process.exit(1);
  }
}

runMigration().catch((err) => {
  log(`Unhandled error: ${err.message}`, "migration");
  process.exit(1);
});