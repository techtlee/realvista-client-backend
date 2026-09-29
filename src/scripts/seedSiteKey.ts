import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../payload.config'

/**
 * Mints a read-only service account + API key for one tenant's website.
 *
 * The key is scoped by tenant membership, so it can only ever read that
 * client's content — the same access functions the admin panel goes through.
 *
 *   TENANT_SLUG=demo-reality pnpm seed:site-key
 */
async function main() {
  const slug = process.env.TENANT_SLUG
  if (!slug) {
    console.error('Set TENANT_SLUG, e.g. TENANT_SLUG=demo-reality pnpm seed:site-key')
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

  const email = `site+${slug}@makleri.internal`
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    overrideAccess: true,
  })
  for (const u of existing.docs) {
    await payload.delete({ collection: 'users', id: u.id, overrideAccess: true })
  }

  // Payload stores the API key encrypted and never returns it — not even with
  // showHiddenFields, which exposes only a `hasAPIKey` flag. The plaintext is
  // therefore whatever we set here, and this is the only moment it is knowable.
  const apiKey = crypto.randomUUID()

  const user = await payload.create({
    collection: 'users',
    data: {
      email,
      password: crypto.randomUUID(),
      name: `Web ${tenant.name}`,
      platformRole: 'client',
      tenants: [{ tenant: tenant.id, role: 'editor' }],
      enableAPIKey: true,
    } as never,
    overrideAccess: true,
  })

  // Set the key in a second write. On create, Payload does not compute the
  // lookup index for a supplied apiKey, so the key is stored but never matches
  // on authentication — the failure is silent until the site 403s.
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { enableAPIKey: true, apiKey } as never,
    overrideAccess: true,
  })

  // Prove the key works before handing it over. A silently broken key surfaces
  // as a 403 on the live site, which is a much worse place to discover it.
  const probe = await fetch(`${process.env.CMS_PROBE_URL ?? 'http://localhost:3000'}/api/site-settings?limit=1`, {
    headers: { Authorization: `users API-Key ${apiKey}` },
  }).catch(() => null)

  if (!probe || !probe.ok) {
    console.error(
      `The minted key did not authenticate (HTTP ${probe?.status ?? 'no response'}). ` +
        `Is the CMS running on ${process.env.CMS_PROBE_URL ?? 'http://localhost:3000'}?`,
    )
    process.exit(1)
  }

  console.log(`TENANT_ID=${tenant.id}`)
  console.log(`CMS_API_KEY=${apiKey}`)
  console.log(`# verified: HTTP ${probe.status} from /api/site-settings (user ${user.id})`)
  process.exit(0)
}

void main()
