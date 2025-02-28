import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";
import { log } from "./vite";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

// Initialize SQLite database
const sqlite = new Database("database.sqlite", {
  verbose: (message) => log(message, 'sqlite')
});

// Enable foreign keys and WAL mode
sqlite.exec('PRAGMA foreign_keys = ON;');
sqlite.exec('PRAGMA journal_mode = WAL');

// Create database instance
const db = drizzle(sqlite, { schema });

// Initialize database tables
try {
  log('Initializing database...', 'sqlite');

  // Use Drizzle's migrate functionality to create tables
  migrate(db, { migrationsFolder: "./drizzle" });

  log('Database initialized successfully', 'sqlite');
} catch (error) {
  const err = error as Error;
  log(`Failed to initialize database: ${err.message}`, 'sqlite');
  throw err;
}

// Export getDb function for consistent interface
export const getDb = async () => {
  try {
    // Simple connection test
    sqlite.prepare('SELECT 1').get();
    return db;
  } catch (error) {
    const err = error as Error;
    log(`Database error: ${err.message}`, 'sqlite');
    throw err;
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  log('Closing database connection...', 'sqlite');
  sqlite.close();
});

process.on('SIGINT', () => {
  log('Closing database connection...', 'sqlite');
  sqlite.close();
});

export { db };