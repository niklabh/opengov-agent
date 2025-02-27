
import { Pool } from '@neondatabase/serverless';
import { log } from "./vite";

async function addMissingColumns() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  log('Starting to add missing columns...', 'migration');

  try {
    // First check if the columns exist to avoid errors
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'proposals' 
      AND (column_name = 'vote_result' OR column_name = 'vote_tx_hash' OR column_name = 'vote_decision');
    `);
    
    const existingColumns = checkResult.rows.map(row => row.column_name);
    
    // Add each missing column if it doesn't exist
    if (!existingColumns.includes('vote_result')) {
      log('Adding vote_result column...', 'migration');
      await pool.query(`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS vote_result TEXT;`);
    }
    
    if (!existingColumns.includes('vote_tx_hash')) {
      log('Adding vote_tx_hash column...', 'migration');
      await pool.query(`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS vote_tx_hash TEXT;`);
    }
    
    if (!existingColumns.includes('vote_decision')) {
      log('Adding vote_decision column...', 'migration');
      await pool.query(`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS vote_decision TEXT;`);
    }
    
    log('Successfully added missing columns!', 'migration');
  } catch (error) {
    log(`Error adding columns: ${error}`, 'migration');
    throw error;
  } finally {
    await pool.end();
  }
}

addMissingColumns()
  .then(() => {
    log('Migration completed successfully', 'migration');
    process.exit(0);
  })
  .catch((error) => {
    log(`Migration failed: ${error}`, 'migration');
    process.exit(1);
  });
