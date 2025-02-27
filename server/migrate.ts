
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { Pool } from "@neondatabase/serverless";
import { log } from "./vite";

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  log("Starting database migration...", "migration");
  
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    
    // Run migrations from the 'migrations' folder
    await migrate(db, { migrationsFolder: "./migrations" });
    
    log("Migration completed successfully", "migration");
    
    // Close the pool
    await pool.end();
  } catch (error) {
    log(`Migration failed: ${(error as Error).message}`, "migration");
    process.exit(1);
  }
}

runMigration().catch((err) => {
  log(`Unhandled error: ${err.message}`, "migration");
  process.exit(1);
});
