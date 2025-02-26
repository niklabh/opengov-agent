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

// Create a connection pool with retries
const createPool = async (retries = 5, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 10000, // 10 second timeout
        max: 20 // Maximum number of clients in the pool
      });

      // Test the connection
      await pool.connect();
      log('Database connection established successfully', 'postgres');
      return pool;
    } catch (error) {
      const err = error as Error;
      log(`Database connection attempt ${i + 1} failed: ${err.message}`, 'postgres');
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Failed to establish database connection after retries');
};

// Initialize pool using IIFE to allow top-level await
export let pool: Pool | null = null;
(async () => {
  try {
    pool = await createPool();

    // Add connection error handling
    pool.on('error', async (error) => {
      const err = error as Error & { code?: string };
      log(`Database pool error: ${err.message}`, 'postgres');
      if (err.code === '57P01') {
        log('Attempting to reconnect to database...', 'postgres');
        try {
          const newPool = await createPool();
          if (pool) {
            Object.assign(pool, newPool);
          } else {
            pool = newPool;
          }
          log('Successfully reconnected to database', 'postgres');
        } catch (error) {
          const reconnectErr = error as Error;
          log(`Failed to reconnect to database: ${reconnectErr.message}`, 'postgres');
        }
      }
    });
  } catch (error) {
    const err = error as Error;
    log(`Failed to initialize database pool: ${err.message}`, 'postgres');
    throw err;
  }
})();

// Create database instance once pool is initialized
export const getDb = async () => {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return drizzle({ client: pool, schema });
};

// For backward compatibility, export db instance
export const db = drizzle({ 
  client: pool || new Pool({ connectionString: process.env.DATABASE_URL }), 
  schema 
});