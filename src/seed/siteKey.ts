import { randomBytes, randomUUID } from 'node:crypto'
import { closeSync, constants, fsyncSync, openSync, renameSync, rmSync, writeSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'

import type { Payload } from 'payload'

export class SiteKeyError extends Error {}

export interface SiteKeyEnv {
  tenantSlug: string
  probeUrl: string
  /** Absolute path, or undefined for the legacy print-to-stdout behaviour. */
  out?: string
}

/**
 * Reads and checks the environment before anything touches the database.
 *
 * `CMS_PROBE_URL` is required: the old silent default of
 * http://localhost:3000 probed whatever happened to run there (often a
 * different backend), so a key could "verify" against the wrong CMS (B4).
 */
export function parseSiteKeyEnv(env: Record<string, string | undefined>): SiteKeyEnv {
  const tenantSlug = env.TENANT_SLUG?.trim()
  if (!tenantSlug) throw new SiteKeyError('Set TENANT_SLUG, e.g. TENANT_SLUG=demo-reality.')

  const probeUrl = env.CMS_PROBE_URL?.trim()
  if (!probeUrl) {
    throw new SiteKeyError(
      'Set CMS_PROBE_URL to this backend\'s own URL (e.g. http://localhost:3211); the minted key is verified against it.',
    )
  }
  try {
    const u = new URL(probeUrl)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error()
  } catch {
    throw new SiteKeyError(`CMS_PROBE_URL is not an http(s) URL: ${probeUrl}`)
  }

  const out = env.SITE_KEY_OUT?.trim()
  return { tenantSlug, probeUrl: probeUrl.replace(/\/+$/, ''), out: out ? resolve(out) : undefined }
}

export interface MintedKey {
  tenantId: number | string
  tenantName: string
  userId: number | string
  apiKey: string
}

/**
 * Mints a read-only service account + API key for one tenant's website.
 *
 * The key is scoped by tenant membership, so it can only ever read that
 * client's content — the same access functions the admin panel goes through.
 * Any previous `site+<slug>` account is replaced, which revokes its key.
 */
export async function mintSiteKey(payload: Payload, slug: string, probeUrl: string): Promise<MintedKey> {
  const tenants = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    overrideAccess: true,
  })
  const tenant = tenants.docs[0]
  if (!tenant) throw new SiteKeyError(`No tenant with slug "${slug}".`)

  // Revoking the old key is only safe if the new one can be verified. With
  // nothing answering at probeUrl the run would end with the old key deleted
  // and the new one unverified, i.e. a site that 403s. Keep the old key.
  if (!(await probeAnswers(probeUrl))) {
    throw new SiteKeyError(
      `Nothing answers at ${probeUrl}, so the new key could not be verified. ` +
        'Start this backend there and re-run; the existing site key was left in place.',
    )
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
  const apiKey = randomUUID()

  const user = await payload.create({
    collection: 'users',
    data: {
      email,
      password: randomBytes(24).toString('base64url'),
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

  return { tenantId: tenant.id, tenantName: tenant.name, userId: user.id, apiKey }
}

/**
 * One unauthenticated GET: does anything answer at probeUrl? Any HTTP status
 * counts (the endpoint will say 403); only no response at all is a failure.
 */
export async function probeAnswers(probeUrl: string): Promise<boolean> {
  const res = await fetch(`${probeUrl}/api/site-settings?limit=1`, {
    signal: AbortSignal.timeout(60_000),
  }).catch(() => null)
  return res !== null
}

/**
 * Proves the key authenticates against the running backend. Returns the HTTP
 * status. The generous timeout covers `next dev` compiling the route on its
 * first request, which takes well over 10 s on a cold start.
 */
export async function verifySiteKey(probeUrl: string, apiKey: string): Promise<number | null> {
  const res = await fetch(`${probeUrl}/api/site-settings?limit=1`, {
    headers: { Authorization: `users API-Key ${apiKey}` },
    signal: AbortSignal.timeout(60_000),
  }).catch(() => null)
  return res ? res.status : null
}

/**
 * The SITE_KEY_OUT file: the key and nothing else (no `NAME=`, no newline),
 * mode 0600. Callers pipe it straight into a secret store or
 * `vercel env add`, so any extra byte would become part of the key.
 * `path` comes from {@link parseSiteKeyEnv}, which resolves a relative
 * SITE_KEY_OUT against the cwd (the backend directory when run via pnpm).
 */
export function writeSiteKeyFile(path: string, apiKey: string): void {
  writeSecretFile(path, apiKey)
}

/**
 * Writes a secret file atomically with mode 0600: a temp file is created
 * exclusively with 0600 in the same directory (so no moment exists where the
 * secret is world-readable), fsynced, then renamed over the target.
 */
export function writeSecretFile(path: string, content: string): void {
  if (!isAbsolute(path)) throw new SiteKeyError(`Secret file path must be absolute: ${path}`)
  const tmp = join(dirname(path), `.${basename(path)}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`)
  const fd = openSync(tmp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600)
  try {
    writeSync(fd, content)
    fsyncSync(fd)
  } catch (err) {
    closeSync(fd)
    rmSync(tmp, { force: true })
    throw err
  }
  closeSync(fd)
  renameSync(tmp, path)
}
