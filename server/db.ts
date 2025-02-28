import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";
import { log } from "./vite";

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

  // Create tables directly from schema
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chain_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      proposer TEXT NOT NULL,
      created_at TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      vote_decision TEXT,
      vote_result TEXT,
      vote_tx_hash TEXT,
      analysis JSON
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proposal_id INTEGER NOT NULL,
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (proposal_id) REFERENCES proposals(id)
    );
  `);

  log('Database tables created successfully', 'sqlite');
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