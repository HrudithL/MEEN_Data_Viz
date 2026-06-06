/**
 * Apply SQL migrations via Supabase database connection string.
 * Set DATABASE_URL in .env.local (Project Settings → Database → Connection string URI)
 * Usage: node --env-file=.env.local scripts/run-migrations.mjs
 */
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const { Client } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dirname, '..', '..', 'supabase', 'migrations')

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
if (!connectionString) {
  console.error('Set DATABASE_URL or SUPABASE_DB_URL in .env.local (Postgres connection URI from Supabase)')
  console.error('Or run each file in supabase/migrations/ via Supabase Dashboard → SQL Editor')
  process.exit(1)
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
await client.connect()

const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8')
  console.log(`Applying ${file}...`)
  try {
    await client.query(sql)
    console.log('  OK')
  } catch (err) {
    console.error(`  Error: ${err.message}`)
  }
}

await client.end()
console.log('Migrations complete.')
