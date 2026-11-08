// Must be first — payload.config reads env at module evaluation time.
import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../payload.config'
import { SeedInputError, clientSiteInputFromEnv, seedClientSite } from '../seed/clientSite'

/**
 * Provisions this backend's single tenant from a `/create-website` provisioning
 * request and seeds generic starter content. See src/seed/clientSite.ts.
 *
 *   PROVISIONING_REQUEST=../<slug>/provisioning-request.json \
 *   [STARTER_COPY_JSON=../<slug>/starter-copy.json] \
 *   SITE_URL=http://localhost:3111 REVALIDATE_SECRET=… pnpm seed:client-site
 *
 * Without an envelope: PROVISIONING_JSON + TENANT_SLUG + CLIENT_NAME +
 * CLIENT_EMAIL [+ CLIENT_PHONE, COMPANY_NAME, COMPANY_ICO, COMPANY_CITY].
 *
 * stdout: `TENANT_ID=<id>` first, then `#` comment lines. Exits only after the
 * revalidate pings the writes caused have finished, so the site is fresh.
 */
async function main() {
  let input
  try {
    input = clientSiteInputFromEnv(process.env)
  } catch (err) {
    if (err instanceof SeedInputError) {
      console.error(err.message)
      process.exit(1)
    }
    throw err
  }

  const payload = await getPayload({ config: await config })
  const s = await seedClientSite(payload, input)

  console.log(`TENANT_ID=${s.tenantId}`)
  console.log(
    `# ${s.tenantName} (${s.slug}): ${s.listings} sample listings in ${s.city}, ` +
      `${s.services} services, ${s.posts} posts`,
  )
  console.log(
    `# revalidate pings: ${s.pings.sent} sent, ${s.pings.ok} ok, ${s.pings.failed} failed` +
      (s.pings.pending ? `, ${s.pings.pending} still pending at the deadline` : ''),
  )
  console.log(`# TODO [DOPLNIT]: ${s.todos.doplnit.join(', ')}`)
  console.log(`# TODO [NÁVRH]: ${s.todos.navrh.join(', ')}`)
  process.exit(0)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
