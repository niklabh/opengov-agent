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
    } catch (err) {
      log(`Database connection attempt ${i + 1} failed: ${err.message}`, 'postgres');
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Failed to establish database connection after retries');
};

// Initialize pool with retry mechanism
export const pool = await createPool();

// Add connection error handling
pool.on('error', async (err) => {
  log(`Database pool error: ${err.message}`, 'postgres');
  if (err.code === '57P01') {
    log('Attempting to reconnect to database...', 'postgres');
    try {
      const newPool = await createPool();
      Object.assign(pool, newPool);
      log('Successfully reconnected to database', 'postgres');
    } catch (reconnectErr) {
      log(`Failed to reconnect to database: ${reconnectErr.message}`, 'postgres');
    }
  }
});

export const db = drizzle({ client: pool, schema });