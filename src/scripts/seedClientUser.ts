import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../payload.config'
import { ClientUserError, upsertClientUser } from '../seed/clientUser'

/**
 * Creates or updates the realtor's login for a tenant (upsert by e-mail), so
 * the client's actual view of the admin can be checked rather than assumed.
 *
 *   TENANT_SLUG=… CLIENT_EMAIL=… CLIENT_NAME=… CLIENT_PASSWORD=… pnpm seed:client
 *
 * Re-running keeps the existing password; set CLIENT_RESET_PASSWORD=1 to
 * overwrite it with CLIENT_PASSWORD.
 */
async function main() {
  const missing = ['TENANT_SLUG', 'CLIENT_EMAIL', 'CLIENT_NAME', 'CLIENT_PASSWORD'].filter(
    (k) => !process.env[k]?.trim(),
  )
  if (missing.length) {
    console.error(`Set ${missing.join(', ')}.`)
    process.exit(1)
  }

  const payload = await getPayload({ config: await config })
  try {
    const r = await upsertClientUser(payload, {
      tenantSlug: process.env.TENANT_SLUG!,
      email: process.env.CLIENT_EMAIL!,
      name: process.env.CLIENT_NAME!,
      password: process.env.CLIENT_PASSWORD!,
      resetPassword: process.env.CLIENT_RESET_PASSWORD === '1',
    })
    console.log(`CLIENT_USER_ID=${r.userId}`)
    console.log(`TENANT=${r.tenantName} (${r.tenantId})`)
    console.log(`# ${r.action}`)
  } catch (err) {
    if (err instanceof ClientUserError) {
      console.error(err.message)
      process.exit(1)
    }
    throw err
  }
  process.exit(0)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
