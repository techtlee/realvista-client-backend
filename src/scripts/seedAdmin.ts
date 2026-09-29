// Must be first: payload.config reads PAYLOAD_SECRET and DATABASE_URL at module
// evaluation time, and ES modules evaluate in import order.
import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../payload.config'

/**
 * Creates the first platform-admin account.
 *
 * `platformRole` is admin-write-only, so the admin panel's create-first-user
 * flow can only ever produce a `client` with no tenants — an account that can
 * log in and see nothing. This script is the intended bootstrap: the Local API
 * with `overrideAccess: true` is the one path allowed to mint an admin.
 *
 *   MAKLERI_ADMIN_EMAIL=me@example.cz MAKLERI_ADMIN_PASSWORD=... pnpm seed:admin
 *
 * Safe to re-run: an existing account with that email is promoted rather than
 * duplicated.
 */
async function seedAdmin() {
  const email = process.env.MAKLERI_ADMIN_EMAIL
  const password = process.env.MAKLERI_ADMIN_PASSWORD

  if (!email || !password) {
    console.error(
      'Set MAKLERI_ADMIN_EMAIL and MAKLERI_ADMIN_PASSWORD.\n' +
        'Example:\n' +
        '  MAKLERI_ADMIN_EMAIL=josef@example.cz MAKLERI_ADMIN_PASSWORD="$(openssl rand -base64 24)" pnpm seed:admin',
    )
    process.exit(1)
  }

  const payload = await getPayload({ config: await config })

  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })

  const found = existing.docs[0]

  if (found) {
    await payload.update({
      collection: 'users',
      id: found.id,
      data: { platformRole: 'platform-admin' },
      overrideAccess: true,
    })
    console.log(`Promoted existing user to platform-admin: ${email}`)
  } else {
    await payload.create({
      collection: 'users',
      data: { email, password, platformRole: 'platform-admin' },
      overrideAccess: true,
    })
    console.log(`Created platform-admin: ${email}`)
  }

  process.exit(0)
}

void seedAdmin()
