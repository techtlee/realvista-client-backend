import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

/**
 * Tells a tenant's website that its content changed.
 *
 * Without this a realtor's edit is invisible until the site's cache expires,
 * which they experience as the website being broken. Publishing has to feel
 * immediate or they stop trusting the CMS.
 *
 * Deliberately fire-and-forget: the editor's save must not wait on, or fail
 * because of, their website. A dropped call self-heals when the page's own
 * revalidation window elapses.
 */

interface TenantWithSite {
  siteUrl?: string | null
  revalidateSecret?: string | null
}

async function ping(
  payload: { findByID: Function; logger: { warn: Function; error: Function } },
  tenantId: string | number | null | undefined,
  collection: string,
  slug?: string | null,
) {
  if (!tenantId) return

  let tenant: TenantWithSite | null = null
  try {
    tenant = (await payload.findByID({
      collection: 'tenants',
      id: tenantId,
      depth: 0,
      overrideAccess: true,
      // revalidateSecret is field-access restricted; this hook runs server-side
      // and needs the raw value.
      showHiddenFields: true,
    })) as TenantWithSite
  } catch {
    return
  }

  if (!tenant?.siteUrl) return

  if (!tenant.revalidateSecret) {
    payload.logger.warn(
      `Tenant ${tenantId} has a siteUrl but no revalidateSecret — its site will not refresh until its cache expires.`,
    )
    return
  }

  const url = `${tenant.siteUrl.replace(/\/+$/, '')}/api/revalidate`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-revalidate-secret': tenant.revalidateSecret,
      },
      body: JSON.stringify({ collection, slug }),
      signal: AbortSignal.timeout(4000),
    })

    if (!res.ok) {
      payload.logger.warn(`Revalidate for tenant ${tenantId} returned ${res.status} from ${url}`)
    }
  } catch (err) {
    // A site that is down, redeploying, or not yet provisioned is normal and
    // must never surface as a failed save.
    payload.logger.warn(`Revalidate for tenant ${tenantId} could not reach ${url}: ${String(err)}`)
  }
}

function tenantIdOf(doc: unknown): string | number | undefined {
  const t = (doc as { tenant?: unknown })?.tenant
  if (t && typeof t === 'object' && 'id' in t) return (t as { id: string | number }).id
  if (typeof t === 'string' || typeof t === 'number') return t
  return undefined
}

/** Attach to a tenant-scoped collection's `afterChange`. */
export const revalidateAfterChange =
  (collection: string): CollectionAfterChangeHook =>
  ({ doc, req }) => {
    const slug = (doc as { slug?: string | null })?.slug ?? null
    void ping(req.payload as never, tenantIdOf(doc), collection, slug)
    return doc
  }

/** Attach to a tenant-scoped collection's `afterDelete`, so removals propagate too. */
export const revalidateAfterDelete =
  (collection: string): CollectionAfterDeleteHook =>
  ({ doc, req }) => {
    const slug = (doc as { slug?: string | null })?.slug ?? null
    void ping(req.payload as never, tenantIdOf(doc), collection, slug)
    return doc
  }
