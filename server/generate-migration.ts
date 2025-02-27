
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import * as schema from "@shared/schema";
import { log } from "./vite";

async function generateMigration() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  log("Generating migration...", "migration");
  
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });
    
    // Generate migration
    await migrate(db, { migrationsFolder: "./migrations", migrationsTable: "drizzle_migrations" });
    
    log("Migration generation completed", "migration");
    
    // Close the pool
    await pool.end();
  } catch (error) {
    log(`Migration generation failed: ${(error as Error).message}`, "migration");
    process.exit(1);
  }
}

generateMigration().catch((err) => {
  log(`Unhandled error: ${err.message}`, "migration");
  process.exit(1);
});
