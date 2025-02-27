
import { Pool, neonConfig } from '@neondatabase/serverless';
import { log } from "./vite";
import ws from "ws";

// Set WebSocket implementation
neonConfig.webSocketConstructor = ws;
// Increase WebSocket connection timeouts
neonConfig.wsConnectionTimeoutMillis = 15000; // 15 seconds
neonConfig.fetchConnectionCache = true;
// Disable usage of fetch if causing issues
neonConfig.useSecureWebSocket = false;

async function fixDatabaseColumns() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }

  log('Initializing database connection...', 'fix');
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 15000, // 15 seconds
    max: 5 // Limit connections
  });
  log('Starting to fix database columns...', 'fix');

  try {
    // First try to identify the existing table structure
    log('Examining database structure...', 'fix');
    const tableQuery = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    log(`Found tables: ${tableQuery.rows.map(r => r.table_name).join(', ')}`, 'fix');
    
    // Check if proposals table exists
    if (tableQuery.rows.some(row => row.table_name === 'proposals')) {
      // Check columns in proposals
      const columnsQuery = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'proposals'
      `);
      
      log(`Existing columns in proposals: ${columnsQuery.rows.map(r => r.column_name).join(', ')}`, 'fix');
      
      // Add missing columns if they don't exist
      const columnsToAdd = [
        { name: 'vote_result', type: 'TEXT' },
        { name: 'vote_tx_hash', type: 'TEXT' },
        { name: 'vote_decision', type: 'TEXT' }
      ];
      
      for (const column of columnsToAdd) {
        if (!columnsQuery.rows.some(row => row.column_name === column.name)) {
          log(`Adding missing column: ${column.name}`, 'fix');
          try {
            await pool.query(`ALTER TABLE proposals ADD COLUMN ${column.name} ${column.type}`);
            log(`Successfully added column: ${column.name}`, 'fix');
          } catch (columnError) {
            log(`Error adding column ${column.name}: ${columnError}`, 'fix');
          }
        } else {
          log(`Column ${column.name} already exists`, 'fix');
        }
      }
    } else {
      log('Proposals table not found!', 'fix');
    }
    
    log('Database fix completed', 'fix');
  } catch (error) {
    log(`Database fix failed: ${error}`, 'fix');
    throw error;
  } finally {
    await pool.end();
  }
}

fixDatabaseColumns()
  .then(() => {
    log('Fix completed successfully', 'fix');
    process.exit(0);
  })
  .catch((error) => {
    log(`Fix failed: ${error}`, 'fix');
    process.exit(1);
  });
