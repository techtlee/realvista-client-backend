import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../payload.config'
import { SiteKeyError, mintSiteKey, parseSiteKeyEnv, verifySiteKey, writeSiteKeyFile } from '../seed/siteKey'

/**
 * Mints a read-only service account + API key for one tenant's website and
 * proves it authenticates against the running backend.
 *
 *   TENANT_SLUG=… CMS_PROBE_URL=http://localhost:3211 SITE_KEY_OUT=/abs/path pnpm seed:site-key
 *
 * With SITE_KEY_OUT (absolute, or relative to the cwd) the file holds only the
 * key, no name and no newline (mode 0600, atomic), and stdout carries no secret: only `TENANT_ID=<id>` and a
 * verification line. Without it the key is printed as before, with a warning,
 * because stdout ends up in terminals, logs and transcripts.
 */
async function main() {
  let env
  try {
    env = parseSiteKeyEnv(process.env)
  } catch (err) {
    if (err instanceof SiteKeyError) {
      console.error(err.message)
      process.exit(1)
    }
    throw err
  }

  const payload = await getPayload({ config: await config })

  let minted
  try {
    minted = await mintSiteKey(payload, env.tenantSlug, env.probeUrl)
  } catch (err) {
    if (err instanceof SiteKeyError) {
      console.error(err.message)
      process.exit(1)
    }
    throw err
  }

  // A silently broken key surfaces as a 403 on the live site, which is a much
  // worse place to discover it.
  const status = await verifySiteKey(env.probeUrl, minted.apiKey)
  if (status !== 200) {
    console.error(
      `The minted key did not authenticate (HTTP ${status ?? 'no response'}) against ${env.probeUrl}. ` +
        'Is this backend running there?',
    )
    process.exit(1)
  }

  console.log(`TENANT_ID=${minted.tenantId}`)
  if (env.out) {
    writeSiteKeyFile(env.out, minted.apiKey)
    console.log(`# key written to ${env.out} (0600)`)
  } else {
    console.error('warning: SITE_KEY_OUT is unset, so the key is printed to stdout. Prefer SITE_KEY_OUT.')
    console.log(`CMS_API_KEY=${minted.apiKey}`)
  }
  console.log(`# verified: HTTP ${status} from ${env.probeUrl}/api/site-settings (user ${minted.userId})`)
  process.exit(0)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
