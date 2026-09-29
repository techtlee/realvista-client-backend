import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../payload.config'

/**
 * Creates a realtor-role login for a tenant, so the client's actual view of the
 * admin can be checked rather than assumed.
 *
 *   TENANT_SLUG=demo-reality CLIENT_EMAIL=… CLIENT_PASSWORD=… pnpm seed:client
 */
async function main() {
  const slug = process.env.TENANT_SLUG
  const email = process.env.CLIENT_EMAIL
  const password = process.env.CLIENT_PASSWORD

  if (!slug || !email || !password) {
    console.error('Set TENANT_SLUG, CLIENT_EMAIL and CLIENT_PASSWORD.')
    process.exit(1)
  }

  const payload = await getPayload({ config: await config })

  const tenants = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    overrideAccess: true,
  })
  const tenant = tenants.docs[0]
  if (!tenant) {
    console.error(`No tenant with slug "${slug}"`)
    process.exit(1)
  }

  await payload.delete({
    collection: 'users',
    where: { email: { equals: email } },
    overrideAccess: true,
  })

  const user = await payload.create({
    collection: 'users',
    data: {
      email,
      password,
      name: 'Jan Novák',
      platformRole: 'client',
      tenants: [{ tenant: tenant.id, role: 'owner' }],
    } as never,
    overrideAccess: true,
  })

  console.log(`CLIENT_USER_ID=${user.id}`)
  console.log(`TENANT=${tenant.name} (${tenant.id})`)
  process.exit(0)
}

void main()
