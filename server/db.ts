import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { log } from "./vite";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Add connection error handling
pool.on('error', (err) => {
  log(`Database pool error: ${err.message}`, 'postgres');
});

// Test the connection
pool.connect()
  .then(() => log('Database connection established successfully', 'postgres'))
  .catch(err => {
    log(`Failed to connect to database: ${err.message}`, 'postgres');
    throw err;
  });

export const db = drizzle({ client: pool, schema });