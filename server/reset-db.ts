
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@shared/schema";
import { log } from "./vite";

async function resetDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  log("Starting database reset...", "reset");
  
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    
    // Drop existing tables
    log("Dropping existing tables...", "reset");
    await db.execute(`DROP TABLE IF EXISTS "chat_messages" CASCADE;`);
    await db.execute(`DROP TABLE IF EXISTS "proposals" CASCADE;`);
    await db.execute(`DROP TABLE IF EXISTS "drizzle_migrations" CASCADE;`);
    
    log("Tables dropped successfully", "reset");
    
    // Close the pool
    await pool.end();
    
    log("Database reset completed. Ready for migration.", "reset");
  } catch (error) {
    log(`Database reset failed: ${(error as Error).message}`, "reset");
    process.exit(1);
  }
}

resetDatabase().catch((err) => {
  log(`Unhandled error: ${err.message}`, "reset");
  process.exit(1);
});
