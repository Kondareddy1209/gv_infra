import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/khammam_realestate'
});

async function seed() {
  try {
    const sqlPath = path.join(process.cwd(), 'scripts', 'setup_postgis.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Executing setup_postgis.sql against PostgreSQL...');
    await pool.query(sql);
    console.log('Successfully initialized database schema & seeded initial properties!');
  } catch (err) {
    console.warn('Database seed failed:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
