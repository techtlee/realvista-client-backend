import { expect, test } from '@playwright/test'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'

import config from '../../src/payload.config.js'

/**
 * The isolation gate at the HTTP layer.
 *
 * The integration suite (tests/int/tenant-isolation.int.spec.ts) exercises the
 * same `access` functions through the Local API, which is faster and covers more
 * cases. This file exists because "the Local API runs the same code path" is an
 * assumption, and the thing actually exposed to the internet is REST, GraphQL,
 * and the media file route — so those get probed over real HTTP with a real
 * session cookie.
 *
 * The media file route matters most: `media` rows are tenant-scoped in the
 * database, but file URLs are a flat namespace. Without a guard, knowing or
 * guessing a filename returns another tenant's photo regardless of any `access`
 * function.
 */

const SERVER = 'http://localhost:3000'

const TENANT_A = 'e2e-isolation-a'
const TENANT_B = 'e2e-isolation-b'
const USER_A = { email: 'e2e-isolation-a@example.test', password: 'e2e-probe-password-a' }
const USER_B = { email: 'e2e-isolation-b@example.test', password: 'e2e-probe-password-b' }

let payload: Payload
let tenantAId: number
let tenantBId: number
let userAId: number
let mediaAId: number
let mediaBId: number
let mediaBFilename: string

async function cleanup() {
  const slugs = [TENANT_A, TENANT_B]

  const tenants = await payload.find({
    collection: 'tenants',
    where: { slug: { in: slugs } },
    pagination: false,
    overrideAccess: true,
  })
  const tenantIds = tenants.docs.map((t) => t.id)

  if (tenantIds.length > 0) {
    await payload.delete({
      collection: 'media',
      where: { tenant: { in: tenantIds } },
      overrideAccess: true,
    })
  }
  await payload.delete({
    collection: 'users',
    where: { email: { in: [USER_A.email, USER_B.email] } },
    overrideAccess: true,
  })
  await payload.delete({
    collection: 'tenants',
    where: { slug: { in: slugs } },
    overrideAccess: true,
  })
}

test.beforeAll(async () => {
  payload = await getPayload({ config })
  // Scoped to this spec's own fixtures so it never touches real dev data.
  await cleanup()

  const a = await payload.create({
    collection: 'tenants',
    data: {
      name: 'E2E Isolation A',
      slug: TENANT_A,
      status: 'live',
      theme: { name: 'realvista', variant: 'indigo' },
      revalidateSecret: 'e2e-secret-a',
    },
    overrideAccess: true,
  })
  const b = await payload.create({
    collection: 'tenants',
    data: {
      name: 'E2E Isolation B',
      slug: TENANT_B,
      status: 'live',
      theme: { name: 'realvista', variant: 'indigo' },
      revalidateSecret: 'e2e-secret-b',
    },
    overrideAccess: true,
  })
  tenantAId = a.id
  tenantBId = b.id

  const ua = await payload.create({
    collection: 'users',
    data: {
      ...USER_A,
      platformRole: 'client',
      tenants: [{ tenant: a.id, role: 'owner' }],
    },
    overrideAccess: true,
  })
  userAId = ua.id

  await payload.create({
    collection: 'users',
    data: {
      ...USER_B,
      platformRole: 'client',
      tenants: [{ tenant: b.id, role: 'owner' }],
    },
    overrideAccess: true,
  })

  const photo = await sharp({
    create: { width: 800, height: 600, channels: 3, background: '#dddddd' },
  })
    .jpeg()
    .toBuffer()

  const ma = await payload.create({
    collection: 'media',
    data: { alt: 'Fotka A', tenant: a.id },
    file: { name: 'e2e-iso-a.jpg', data: photo, mimetype: 'image/jpeg', size: photo.length },
    overrideAccess: true,
  })
  const mb = await payload.create({
    collection: 'media',
    data: { alt: 'Fotka B', tenant: b.id },
    file: { name: 'e2e-iso-b.jpg', data: photo, mimetype: 'image/jpeg', size: photo.length },
    overrideAccess: true,
  })

  mediaAId = ma.id
  mediaBId = mb.id
  mediaBFilename = mb.filename as string
})

test.afterAll(async () => {
  await cleanup()
})

/** A request context authenticated as realtor A, with its own cookie jar. */
async function asRealtorA(playwright: typeof import('@playwright/test').request) {
  const ctx = await playwright.newContext({ baseURL: SERVER })
  const res = await ctx.post('/api/users/login', { data: USER_A })
  expect(res.status(), 'realtor A should be able to log in').toBe(200)
  return ctx
}

test.describe('REST', () => {
  test('list returns only the caller\'s tenant', async ({ playwright }) => {
    const ctx = await asRealtorA(playwright.request)
    const res = await ctx.get('/api/media?limit=100')

    expect(res.status()).toBe(200)
    const body = await res.json()

    expect(body.totalDocs).toBe(1)
    expect(body.docs.map((d: { id: unknown }) => d.id)).toEqual([mediaAId])
    await ctx.dispose()
  })

  test("by-id on another tenant's row is not found", async ({ playwright }) => {
    const ctx = await asRealtorA(playwright.request)
    const res = await ctx.get(`/api/media/${mediaBId}`)

    expect(res.status()).toBe(404)
    await ctx.dispose()
  })

  test('self-PATCH cannot escalate platformRole', async ({ playwright }) => {
    const ctx = await asRealtorA(playwright.request)
    const res = await ctx.patch(`/api/users/${userAId}`, {
      data: { platformRole: 'platform-admin' },
    })

    // Payload strips fields the caller may not write rather than erroring, so
    // the request succeeds and the value must be unchanged.
    const body = await res.json().catch(() => ({}))
    expect(body?.doc?.platformRole ?? 'client').toBe('client')

    const fresh = await payload.findByID({
      collection: 'users',
      id: userAId,
      overrideAccess: true,
    })
    expect(fresh.platformRole).toBe('client')
    await ctx.dispose()
  })

  test('anonymous cannot list media', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: SERVER })
    const res = await ctx.get('/api/media')

    expect(res.status()).toBeGreaterThanOrEqual(400)
    await ctx.dispose()
  })
})

test.describe('GraphQL', () => {
  test('allMedia returns only the caller\'s tenant', async ({ playwright }) => {
    const ctx = await asRealtorA(playwright.request)
    const res = await ctx.post('/api/graphql', {
      data: { query: '{ allMedia(limit: 100) { totalDocs docs { id alt } } }' },
    })

    const body = await res.json()
    expect(body.data.allMedia.totalDocs).toBe(1)
    expect(body.data.allMedia.docs.map((d: { id: unknown }) => d.id)).toEqual([mediaAId])
    await ctx.dispose()
  })

  test("direct id lookup of another tenant's row returns null", async ({ playwright }) => {
    const ctx = await asRealtorA(playwright.request)
    const res = await ctx.post('/api/graphql', {
      data: { query: `{ Media(id: ${mediaBId}) { id alt } }` },
    })

    const body = await res.json()
    expect(body.data?.Media).toBeNull()
    await ctx.dispose()
  })

  test('revalidateSecret is not readable, even on the caller\'s own tenant', async ({
    playwright,
  }) => {
    const ctx = await asRealtorA(playwright.request)
    const res = await ctx.post('/api/graphql', {
      data: { query: '{ Tenants { totalDocs docs { id name revalidateSecret } } }' },
    })

    const body = await res.json()
    const docs = body.data.Tenants.docs

    expect(body.data.Tenants.totalDocs).toBe(1)
    expect(docs[0].id).toBe(tenantAId)
    expect(docs[0].revalidateSecret).toBeNull()
    expect(tenantBId).toBeDefined()
    await ctx.dispose()
  })
})

test.describe('media files', () => {
  /**
   * Rows are scoped by `access`; filenames are a flat namespace. This is the
   * check that catches a leak no `access` function can prevent.
   */
  test("another tenant's file is not served to an authenticated realtor", async ({
    playwright,
  }) => {
    const ctx = await asRealtorA(playwright.request)
    const res = await ctx.get(`/api/media/file/${mediaBFilename}`)

    expect(res.status()).toBeGreaterThanOrEqual(400)
    await ctx.dispose()
  })

  test("another tenant's file is not served anonymously", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: SERVER })
    const res = await ctx.get(`/api/media/file/${mediaBFilename}`)

    expect(res.status()).toBeGreaterThanOrEqual(400)
    await ctx.dispose()
  })
})
