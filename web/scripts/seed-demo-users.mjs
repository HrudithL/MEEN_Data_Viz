/**
 * Creates local demo auth users in Supabase.
 * Run from web/: npm run seed:demo
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')

function loadEnvFile(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFile(envPath)

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const adminEmail =
  process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL ?? 'admin@demo.meendataviz.local'
const adminPassword =
  process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD ?? 'DemoAdmin123!'

const demoUsers = [
  { email: adminEmail, password: adminPassword, displayName: 'Demo Admin' },
  {
    email: 'editor@demo.meendataviz.local',
    password: 'DemoEditor123!',
    displayName: 'Demo Editor',
  },
  {
    email: 'viewer@demo.meendataviz.local',
    password: 'DemoViewer123!',
    displayName: 'Demo Viewer',
  },
]

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findUserIdByEmail(email) {
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    )
    if (match) return match.id

    if (data.users.length < perPage) return null
    page += 1
  }
}

async function ensureUser({ email, password, displayName }) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })

  if (!error) {
    console.log(`Created ${email}`)
    return data.user.id
  }

  const duplicate =
    error.message?.toLowerCase().includes('already') ||
    error.message?.toLowerCase().includes('registered') ||
    error.status === 422

  if (!duplicate) throw error

  const userId = await findUserIdByEmail(email)
  if (!userId) throw new Error(`User exists but could not look up ${email}`)

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    password,
    user_metadata: { display_name: displayName },
    email_confirm: true,
  })
  if (updateError) throw updateError
  console.log(`Updated ${email}`)
  return userId
}

try {
  for (const user of demoUsers) {
    await ensureUser(user)
  }
  console.log('\nDemo users ready.')
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`)
} catch (err) {
  console.error(err.message ?? err)
  process.exit(1)
}
