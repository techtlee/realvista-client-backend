import { beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload, type TypedUser } from 'payload'

import config from '@/payload.config'

/**
 * The launch gate.
 *
 * One shared Payload instance serves every client, so a single sloppy `access`
 * function exposes 80 realtors' data at once and triggers GDPR notification
 * duties. This suite is the thing standing between that and production — if it
 * fails, nothing ships.
 *
 * Every assertion runs with `overrideAccess: false` and an explicit `user`,
 * which is what makes it meaningful: that is the same code path the REST and
 * GraphQL APIs take. The Local API's default (`overrideAccess: true`) bypasses
 * access control entirely and would make every test below pass vacuously.
 */

let payload: Payload

let tenantA: { id: number }
let tenantB: { id: number }
let userA: TypedUser
let userB: TypedUser
let mediaA: { id: number }
let mediaB: { id: number }

/**
 * A real JPEG at listing-photo dimensions.
 *
 * Payload 3 validates the uploaded buffer's actual type signature, and the
 * collection generates four Sharp derivatives, so a stub buffer is rejected.
 * Generating a genuine image here also means the upload pipeline
 * (resize, webp conversion, EXIF stripping) is exercised rather than mocked.
 */
let PHOTO: Buffer

async function makePhoto(): Promise<Buffer> {
  const sharp = (await import('sharp')).default
  return sharp({
    create: { width: 1200, height: 800, channels: 3, background: '#cccccc' },
  })
    .jpeg()
    .toBuffer()
}

function photoFile(name: string) {
  return { name, data: PHOTO, mimetype: 'image/jpeg', size: PHOTO.length }
}

async function wipe() {
  // Order matters: media and users reference tenants.
  await payload.delete({ collection: 'media', where: {}, overrideAccess: true })
  await payload.delete({ collection: 'users', where: {}, overrideAccess: true })
  await payload.delete({ collection: 'tenants', where: {}, overrideAccess: true })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  PHOTO = await makePhoto()
  await wipe()

  tenantA = await payload.create({
    collection: 'tenants',
    data: {
      name: 'Novák Reality',
      slug: 'novak-reality',
      status: 'live',
      theme: { name: 'realvista', variant: 'indigo' },
    },
    overrideAccess: true,
  })
  tenantB = await payload.create({
    collection: 'tenants',
    data: {
      name: 'Svoboda Nemovitosti',
      slug: 'svoboda-nemovitosti',
      status: 'live',
      theme: { name: 'realvista', variant: 'indigo' },
    },
    overrideAccess: true,
  })

  // Created with overrideAccess so the seeding itself isn't subject to the rules
  // under test. `platformRole: 'client'` is what every realtor gets.
  userA = (await payload.create({
    collection: 'users',
    data: {
      email: 'a@example.test',
      password: 'test-password-a',
      platformRole: 'client',
      tenants: [{ tenant: tenantA.id, role: 'owner' }],
    },
    overrideAccess: true,
  })) as unknown as TypedUser

  userB = (await payload.create({
    collection: 'users',
    data: {
      email: 'b@example.test',
      password: 'test-password-b',
      platformRole: 'client',
      tenants: [{ tenant: tenantB.id, role: 'owner' }],
    },
    overrideAccess: true,
  })) as unknown as TypedUser

  mediaA = await payload.create({
    collection: 'media',
    data: { alt: 'Fotka A', tenant: tenantA.id },
    file: photoFile('a.jpg'),
    overrideAccess: true,
  })
  mediaB = await payload.create({
    collection: 'media',
    data: { alt: 'Fotka B', tenant: tenantB.id },
    file: photoFile('b.jpg'),
    overrideAccess: true,
  })
}, 120_000)

describe('tenant isolation — reads', () => {
  it('a realtor listing media sees only their own tenant', async () => {
    const result = await payload.find({
      collection: 'media',
      user: userA,
      overrideAccess: false,
      pagination: false,
    })

    expect(result.docs).toHaveLength(1)
    expect(result.docs[0]?.id).toBe(mediaA.id)
    // Guards against a leak that shows the size of other tenants' data even
    // when the rows themselves are filtered out.
    expect(result.totalDocs).toBe(1)
  })

  it("a realtor cannot read another tenant's media by id", async () => {
    await expect(
      payload.findByID({
        collection: 'media',
        id: mediaB.id,
        user: userA,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('an anonymous request is refused outright', async () => {
    // Payload throws Forbidden rather than returning an empty page, which is
    // the stricter of the two behaviours: no row count, no pagination metadata,
    // nothing to probe. Generated sites read through a per-tenant API key, so
    // nothing legitimate depends on anonymous access.
    await expect(
      payload.find({
        collection: 'media',
        overrideAccess: false,
        pagination: false,
      }),
    ).rejects.toThrow()
  })

  it('a realtor sees only their own tenant record', async () => {
    const result = await payload.find({
      collection: 'tenants',
      user: userA,
      overrideAccess: false,
      pagination: false,
    })

    expect(result.docs).toHaveLength(1)
    expect(result.docs[0]?.id).toBe(tenantA.id)
  })

  it("a realtor cannot read another tenant's user accounts", async () => {
    const result = await payload.find({
      collection: 'users',
      user: userA,
      overrideAccess: false,
      pagination: false,
    })

    const emails = result.docs.map((d) => d.email)
    expect(emails).toContain('a@example.test')
    expect(emails).not.toContain('b@example.test')
  })
})

describe('orphaned rows', () => {
  /**
   * The tenant column is nullable in Postgres and the plugin's own types omit
   * `required` from the tenant field overrides, which looks like it should allow
   * a tenant-less row that every realtor could see.
   *
   * It does not: the plugin validates tenant assignment in a beforeChange field
   * hook, so the row is rejected before it reaches the database. Asserted here
   * because the schema alone suggests otherwise, and a future plugin upgrade
   * that relaxed this would be a silent cross-tenant leak.
   */
  it('a row with no tenant cannot be created at all', async () => {
    await expect(
      payload.create({
        collection: 'media',
        data: { alt: 'Sirotek' },
        file: photoFile('orphan.jpg'),
        overrideAccess: true,
      }),
    ).rejects.toThrow(/neplatn|invalid/i)
  })
})

describe('tenant isolation — writes', () => {
  it("a realtor cannot update another tenant's media", async () => {
    await expect(
      payload.update({
        collection: 'media',
        id: mediaB.id,
        data: { alt: 'uneseno' },
        user: userA,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it("a realtor cannot delete another tenant's media", async () => {
    await expect(
      payload.delete({
        collection: 'media',
        id: mediaB.id,
        user: userA,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('a realtor cannot create content under another tenant', async () => {
    const created = await payload
      .create({
        collection: 'media',
        data: { alt: 'podvrh', tenant: tenantB.id },
        file: photoFile('x.jpg'),
        user: userA,
        overrideAccess: false,
      })
      .catch(() => null)

    // Either the create is rejected outright, or the plugin re-stamps the row
    // onto the caller's own tenant. Both are safe; silently landing in tenant B
    // is not.
    if (created) {
      const tenantId =
        typeof created.tenant === 'object' && created.tenant !== null
          ? (created.tenant as { id: string | number }).id
          : created.tenant
      expect(tenantId).not.toBe(tenantB.id)
    }
  })
})

describe('privilege escalation', () => {
  /**
   * The specific breach the architecture is most exposed to.
   *
   * `users.update` must allow `user.id === id` so a realtor can change their own
   * password. That makes these two fields the whole attack surface — if either
   * assertion fails, any realtor can take over every client's data with one
   * PATCH to their own user document.
   *
   * Payload strips fields the caller may not write rather than throwing, so
   * these assert the resulting state, not that an error was raised.
   */
  it('a realtor cannot promote themselves to platform admin', async () => {
    await payload
      .update({
        collection: 'users',
        id: userA.id,
        data: { platformRole: 'platform-admin' },
        user: userA,
        overrideAccess: false,
      })
      .catch(() => null)

    const after = await payload.findByID({
      collection: 'users',
      id: userA.id,
      overrideAccess: true,
    })

    expect(after.platformRole).toBe('client')
  })

  it('a realtor cannot grant themselves access to another tenant', async () => {
    await payload
      .update({
        collection: 'users',
        id: userA.id,
        data: {
          tenants: [
            { tenant: tenantA.id, role: 'owner' },
            { tenant: tenantB.id, role: 'owner' },
          ],
        },
        user: userA,
        overrideAccess: false,
      })
      .catch(() => null)

    const after = await payload.findByID({
      collection: 'users',
      id: userA.id,
      overrideAccess: true,
      depth: 0,
    })

    const grantedTenantIds = (after.tenants ?? []).map((t) =>
      typeof t.tenant === 'object' && t.tenant !== null
        ? (t.tenant as { id: string | number }).id
        : t.tenant,
    )

    expect(grantedTenantIds).toContain(tenantA.id)
    expect(grantedTenantIds).not.toContain(tenantB.id)
  })

  it('a realtor cannot create a new tenant', async () => {
    await expect(
      payload.create({
        collection: 'tenants',
        data: { name: 'Podvržený', slug: 'podvrzeny', status: 'live', theme: { name: 'realvista', variant: 'indigo' }, },
        user: userA,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('a realtor cannot create another user account', async () => {
    await expect(
      payload.create({
        collection: 'users',
        data: {
          email: 'evil@example.test',
          password: 'x',
          platformRole: 'platform-admin',
          tenants: [{ tenant: tenantB.id, role: 'owner' }],
        },
        user: userA,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it("the revalidate secret is never readable by a realtor", async () => {
    await payload.update({
      collection: 'tenants',
      id: tenantA.id,
      data: { revalidateSecret: 'super-secret-value' },
      overrideAccess: true,
    })

    const asRealtor = await payload.findByID({
      collection: 'tenants',
      id: tenantA.id,
      user: userA,
      overrideAccess: false,
    })

    expect(asRealtor.revalidateSecret).toBeUndefined()
  })
})

describe('platform admin', () => {
  it('sees every tenant', async () => {
    const admin = (await payload.create({
      collection: 'users',
      data: {
        email: 'admin@example.test',
        password: 'test-password-admin',
        platformRole: 'platform-admin',
      },
      overrideAccess: true,
    })) as unknown as TypedUser

    const result = await payload.find({
      collection: 'media',
      user: admin,
      overrideAccess: false,
      pagination: false,
    })

    expect(result.docs.map((d) => d.id).sort()).toEqual([mediaA.id, mediaB.id].sort())
    expect(userB.id).toBeDefined()
  })
})

/**
 * Every tenant-scoped collection, not just the one that was convenient to test.
 *
 * The failure mode this guards against: someone adds a collection, forgets its
 * `access` block, and the plugin's admin-UI filtering makes it *look* isolated
 * while the REST API serves every tenant's rows. Driving the checks from a list
 * means a new collection is covered the moment it is added here — and the
 * registry test below makes forgetting to add it fail the build.
 */
const TENANT_COLLECTIONS = [
  {
    slug: 'properties' as const,
    seed: (tenant: number) => ({
      title: 'Testovací nemovitost',
      transactionType: 'prodej',
      propertyType: 'byt',
      status: 'draft',
      address: { city: 'Praha' },
      tenant,
    }),
  },
  {
    slug: 'posts' as const,
    seed: (tenant: number) => ({ title: 'Testovací článek', tenant }),
  },
  {
    slug: 'services' as const,
    seed: (tenant: number) => ({ title: 'Testovací služba', tenant }),
  },
  {
    slug: 'enquiries' as const,
    seed: (tenant: number) => ({ name: 'Testovací poptávka', tenant }),
  },
  {
    slug: 'site-settings' as const,
    seed: (tenant: number) => ({
      siteName: 'Testovací web',
      agent: { name: 'Testovací makléř' },
      tenant,
    }),
  },
]

describe.each(TENANT_COLLECTIONS)('tenant isolation — $slug', ({ slug, seed }) => {
  let ownId: number
  let foreignId: number

  beforeAll(async () => {
    await payload.delete({ collection: slug, where: {}, overrideAccess: true })

    const own = await payload.create({
      collection: slug,
      data: seed(tenantA.id) as never,
      overrideAccess: true,
    })
    const foreign = await payload.create({
      collection: slug,
      data: seed(tenantB.id) as never,
      overrideAccess: true,
    })
    ownId = own.id as number
    foreignId = foreign.id as number
  })

  it('list returns only the caller’s tenant', async () => {
    const result = await payload.find({
      collection: slug,
      user: userA,
      overrideAccess: false,
      pagination: false,
    })

    expect(result.docs.map((d) => d.id)).toEqual([ownId])
    expect(result.totalDocs).toBe(1)
  })

  it('by-id on a foreign row is refused', async () => {
    await expect(
      payload.findByID({ collection: slug, id: foreignId, user: userA, overrideAccess: false }),
    ).rejects.toThrow()
  })

  it('update of a foreign row is refused', async () => {
    await expect(
      payload.update({
        collection: slug,
        id: foreignId,
        data: {} as never,
        user: userA,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('delete of a foreign row is refused', async () => {
    await expect(
      payload.delete({ collection: slug, id: foreignId, user: userA, overrideAccess: false }),
    ).rejects.toThrow()
  })

  it('anonymous access is refused', async () => {
    await expect(
      payload.find({ collection: slug, overrideAccess: false, pagination: false }),
    ).rejects.toThrow()
  })
})

/**
 * Create is the one operation where a `Where` returned from access cannot
 * filter anything: there is no existing row to match. Payload does not apply
 * `tenant in [...]` to the incoming data, so what stops a realtor (or a site's
 * API key) from writing into another tenant is the plugin's validation on the
 * `tenant` field, which checks the value against the caller's memberships.
 * These tests pin that down strictly — rejected, not re-stamped.
 */
describe('tenant isolation — create into a foreign tenant', () => {
  /** What `req.user` looks like when a request authenticates with `users API-Key …`. */
  const apiKeyUser = () => ({ ...userA, collection: 'users', _strategy: 'api-key' }) as TypedUser

  const REALTOR_CREATABLE = TENANT_COLLECTIONS.filter(
    // site-settings: platform admins only; enquiries: API key only (below).
    (c) => c.slug !== 'site-settings' && c.slug !== 'enquiries',
  )

  it.each(REALTOR_CREATABLE)('$slug: a realtor of A cannot create a row for B', async ({ slug, seed }) => {
    await expect(
      payload.create({
        collection: slug,
        data: seed(tenantB.id) as never,
        user: userA,
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    const { totalDocs } = await payload.count({
      collection: slug,
      where: { tenant: { equals: tenantB.id } },
      overrideAccess: true,
    })
    expect(totalDocs).toBeLessThanOrEqual(1) // only the row seeded above
  })

  it("media: a realtor of A cannot upload into B's library", async () => {
    await expect(
      payload.create({
        collection: 'media',
        data: { alt: 'podvrh', tenant: tenantB.id },
        file: photoFile('foreign.jpg'),
        user: userA,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it("enquiries: tenant A's site API key cannot create an enquiry for tenant B", async () => {
    const before = await payload.count({
      collection: 'enquiries',
      where: { tenant: { equals: tenantB.id } },
      overrideAccess: true,
    })

    await expect(
      payload.create({
        collection: 'enquiries',
        data: { name: 'Podvržená poptávka', tenant: tenantB.id },
        user: apiKeyUser(),
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    const after = await payload.count({
      collection: 'enquiries',
      where: { tenant: { equals: tenantB.id } },
      overrideAccess: true,
    })
    expect(after.totalDocs).toBe(before.totalDocs)
  })

  it("enquiries: tenant A's site API key can create an enquiry for A", async () => {
    const doc = await payload.create({
      collection: 'enquiries',
      data: { name: 'Poptávka z webu', tenant: tenantA.id },
      user: apiKeyUser(),
      overrideAccess: false,
    })
    expect(doc.tenant).toMatchObject({ id: tenantA.id })
  })

  it('enquiries: with one membership and no tenant sent, the key’s tenant is filled in', async () => {
    const doc = await payload.create({
      collection: 'enquiries',
      data: { name: 'Poptávka bez tenantu' } as never,
      user: apiKeyUser(),
      overrideAccess: false,
    })
    expect(doc.tenant).toMatchObject({ id: tenantA.id })
  })

  it('enquiries: a realtor logged in normally cannot create one at all', async () => {
    await expect(
      payload.create({
        collection: 'enquiries',
        data: { name: 'Ručně psaná', tenant: tenantA.id },
        user: userA,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})

describe('collection registry', () => {
  /**
   * Catches the actual mistake: adding a tenant-scoped collection and forgetting
   * to cover it above. Any new collection carrying a `tenant` field must either
   * appear in TENANT_COLLECTIONS or be explicitly acknowledged here.
   */
  const COVERED = new Set<string>([
    ...TENANT_COLLECTIONS.map((c) => c.slug),
    'media', // covered individually above, including the file-URL namespace
  ])

  const NOT_TENANT_SCOPED = new Set<string>([
    'tenants',
    'users',
    'payload-kv',
    'payload-locked-documents',
    'payload-preferences',
    'payload-migrations',
  ])

  it('every collection with a tenant field is covered by an isolation test', () => {
    const uncovered = payload.config.collections
      .filter((c) => c.fields.some((f) => 'name' in f && f.name === 'tenant'))
      .map((c) => c.slug)
      .filter((s) => !COVERED.has(s) && !NOT_TENANT_SCOPED.has(s))

    expect(uncovered).toEqual([])
  })

  it('every known collection is classified', () => {
    const unclassified = payload.config.collections
      .map((c) => c.slug)
      .filter((s) => !COVERED.has(s) && !NOT_TENANT_SCOPED.has(s))

    expect(unclassified).toEqual([])
  })
})

describe('PENB publish guard', () => {
  /**
   * Stating an energy class when advertising a property is required by
   * zákon č. 406/2000 Sb., and the fine lands on the realtor. The guard blocks
   * at publish rather than at save, so a listing can be drafted while the
   * certificate is still being issued.
   */
  const base = {
    title: 'Byt s PENB',
    transactionType: 'prodej',
    propertyType: 'byt',
    address: { city: 'Brno' },
    tenant: 0,
  }

  it('allows a draft without an energy class', async () => {
    const doc = await payload.create({
      collection: 'properties',
      data: { ...base, tenant: tenantA.id, status: 'draft' } as never,
      overrideAccess: true,
    })

    expect(doc.id).toBeDefined()
    await payload.delete({ collection: 'properties', id: doc.id, overrideAccess: true })
  })

  it('refuses to publish without an energy class', async () => {
    await expect(
      payload.create({
        collection: 'properties',
        data: { ...base, tenant: tenantA.id, status: 'active' } as never,
        overrideAccess: true,
      }),
    ).rejects.toThrow(/PENB|energetick/i)
  })

  it('publishes once an energy class is set', async () => {
    const doc = await payload.create({
      collection: 'properties',
      data: {
        ...base,
        tenant: tenantA.id,
        status: 'active',
        penb: { class: 'C' },
      } as never,
      overrideAccess: true,
    })

    expect(doc.status).toBe('active')
    await payload.delete({ collection: 'properties', id: doc.id, overrideAccess: true })
  })

  it('accepts PENDING so a realtor is not forced to invent a class', async () => {
    const doc = await payload.create({
      collection: 'properties',
      data: {
        ...base,
        tenant: tenantA.id,
        status: 'active',
        penb: { class: 'PENDING' },
      } as never,
      overrideAccess: true,
    })

    expect(doc.status).toBe('active')
    await payload.delete({ collection: 'properties', id: doc.id, overrideAccess: true })
  })
})

describe('Czech slug generation', () => {
  it('strips diacritics rather than dropping the letters', async () => {
    const doc = await payload.create({
      collection: 'properties',
      data: {
        title: 'Prodej bytu 3+kk, Plzeň — Úslavská u Přehrady',
        transactionType: 'prodej',
        propertyType: 'byt',
        status: 'draft',
        address: { city: 'Plzeň' },
        tenant: tenantA.id,
      } as never,
      overrideAccess: true,
    })

    expect(doc.slug).toBe('prodej-bytu-3-kk-plzen-uslavska-u-prehrady')
    await payload.delete({ collection: 'properties', id: doc.id, overrideAccess: true })
  })
})
