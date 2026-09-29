import { beforeAll, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload, type TypedUser } from 'payload'
import sharp from 'sharp'
import type { Exif } from 'sharp'

import config from '@/payload.config'
import { storageStatus } from '@/lib/storage'

/**
 * The upload pipeline: tenant namespacing, EXIF stripping, derivative
 * generation.
 *
 * These run against local disk storage — R2 credentials are not needed, because
 * everything asserted here happens in Payload before the storage adapter is
 * reached. The adapter only decides *where* the bytes land; the prefix, the
 * metadata stripping and the resizing are all upstream of it.
 */

let payload: Payload
let tenantA: { id: number }
let tenantB: { id: number }
let realtorA: TypedUser

const THEME = { name: 'realvista', variant: 'indigo' } as const

/** A JPEG carrying GPS EXIF, as a phone would produce. */
async function photoWithGps(): Promise<Buffer> {
  return sharp({
    create: { width: 1200, height: 900, channels: 3, background: '#b0c4de' },
  })
    // sharp writes a GPS IFD fine, but its `Exif` type only declares the
    // IFD0/IFD1/IFD2/IFD3 keys, so the GPS block needs the cast.
    .withExif({
      IFD0: { Make: 'Apple', Model: 'iPhone 15 Pro' },
      GPS: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '50/1 5/1 0/1',
        GPSLongitudeRef: 'E',
        GPSLongitude: '14/1 25/1 0/1',
      },
    } as unknown as Exif)
    .jpeg()
    .toBuffer()
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })

  await payload.delete({ collection: 'media', where: {}, overrideAccess: true })
  await payload.delete({
    collection: 'users',
    where: { email: { in: ['media-a@example.test'] } },
    overrideAccess: true,
  })
  await payload.delete({
    collection: 'tenants',
    where: { slug: { in: ['media-a', 'media-b'] } },
    overrideAccess: true,
  })

  tenantA = await payload.create({
    collection: 'tenants',
    data: { name: 'Media A', slug: 'media-a', status: 'live', theme: THEME },
    overrideAccess: true,
  })
  tenantB = await payload.create({
    collection: 'tenants',
    data: { name: 'Media B', slug: 'media-b', status: 'live', theme: THEME },
    overrideAccess: true,
  })
  realtorA = (await payload.create({
    collection: 'users',
    data: {
      email: 'media-a@example.test',
      password: 'media-password-a',
      platformRole: 'client',
      tenants: [{ tenant: tenantA.id, role: 'owner' }],
    },
    overrideAccess: true,
  })) as unknown as TypedUser
}, 120_000)

describe('tenant namespacing of object keys', () => {
  it('prefixes the object key with the tenant', async () => {
    const data = await photoWithGps()
    const doc = await payload.create({
      collection: 'media',
      data: { alt: 'Fotka', tenant: tenantA.id },
      file: { name: 'dum-praha.jpg', data, mimetype: 'image/jpeg', size: data.length },
      overrideAccess: true,
    })

    expect((doc as { prefix?: string }).prefix).toBe(`tenants/${tenantA.id}`)
  })

  it('gives different tenants different prefixes for an identical filename', async () => {
    const data = await photoWithGps()

    const a = await payload.create({
      collection: 'media',
      data: { alt: 'A', tenant: tenantA.id },
      file: { name: 'stejny-nazev.jpg', data, mimetype: 'image/jpeg', size: data.length },
      overrideAccess: true,
    })
    const b = await payload.create({
      collection: 'media',
      data: { alt: 'B', tenant: tenantB.id },
      file: { name: 'stejny-nazev.jpg', data, mimetype: 'image/jpeg', size: data.length },
      overrideAccess: true,
    })

    const pa = (a as { prefix?: string }).prefix
    const pb = (b as { prefix?: string }).prefix

    expect(pa).toBeDefined()
    expect(pb).toBeDefined()
    // The whole point: identical filenames must not collide across tenants.
    expect(pa).not.toBe(pb)
  })

  it('refuses an upload with no tenant rather than writing an unnamespaced key', async () => {
    // Consistent with the orphaned-row assertion in the isolation suite: a
    // media row with no tenant would sit outside every realtor's filter AND
    // outside the key namespace, so it is rejected instead of being written
    // somewhere ambiguous.
    const data = await photoWithGps()

    await expect(
      payload.create({
        collection: 'media',
        data: { alt: 'Bez tenanta' },
        file: { name: 'odvozeny.jpg', data, mimetype: 'image/jpeg', size: data.length },
        user: realtorA,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})

describe('EXIF stripping', () => {
  /**
   * A realtor photographing the inside of a client's home carries the home's
   * GPS coordinates in the file. Publishing that leaks the address even when
   * the listing has `hideExactAddress` set — and Sharp preserves metadata
   * unless explicitly told not to.
   */
  it('the source fixture really does carry GPS, or this test proves nothing', async () => {
    const data = await photoWithGps()
    const meta = await sharp(data).metadata()

    expect(meta.exif).toBeDefined()
    expect(meta.exif!.length).toBeGreaterThan(0)
  })

  it('strips GPS from the stored derivative', async () => {
    const data = await photoWithGps()
    const doc = await payload.create({
      collection: 'media',
      data: { alt: 'S GPS', tenant: tenantA.id },
      file: { name: 'interier.jpg', data, mimetype: 'image/jpeg', size: data.length },
      overrideAccess: true,
    })

    const stored = await readStoredFile(doc as { filename?: string })
    const meta = await sharp(stored).metadata()

    // withMetadata: false — no EXIF block at all on the processed output.
    expect(meta.exif).toBeUndefined()
  })
})

describe('derivatives', () => {
  it('generates the four sizes the themes consume, as webp', async () => {
    const data = await photoWithGps()
    const doc = (await payload.create({
      collection: 'media',
      data: { alt: 'Velikosti', tenant: tenantA.id },
      file: { name: 'velky.jpg', data, mimetype: 'image/jpeg', size: data.length },
      overrideAccess: true,
    })) as { mimeType?: string; sizes?: Record<string, { width?: number | null }> }

    expect(doc.mimeType).toBe('image/webp')
    expect(Object.keys(doc.sizes ?? {}).sort()).toEqual(['card', 'full', 'hero', 'thumbnail'])
    expect(doc.sizes?.thumbnail?.width).toBe(400)
    expect(doc.sizes?.hero?.width).toBe(1600)
  })
})

describe('storage configuration', () => {
  it('reports R2 as unconfigured in the test environment', () => {
    // Guards the guard: if this ever reports configured during tests, the
    // production safety check below is not being exercised.
    const { configured } = storageStatus()
    expect(configured).toBe(false)
  })

  it('refuses to boot in production without object storage', async () => {
    const { storagePlugins } = await import('@/lib/storage')

    try {
      // Writing uploads to a serverless filesystem fails silently — the upload
      // appears to succeed and the file is gone after the next deploy. Better
      // to refuse to start.
      vi.stubEnv('NODE_ENV', 'production')
      expect(() => storagePlugins()).toThrow(/production/i)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('registers the storage plugin even when disabled, so the schema matches production', () => {
    const { configured } = storageStatus()
    expect(configured).toBe(false)

    // The prefix field must exist regardless, otherwise media documents have a
    // different shape in development than in production.
    const media = payload.config.collections.find((c) => c.slug === 'media')
    const hasPrefix = media?.fields.some((f) => 'name' in f && f.name === 'prefix')

    expect(hasPrefix).toBe(true)
  })
})

/** Reads a stored upload back off disk. */
async function readStoredFile(doc: { filename?: string }): Promise<Buffer> {
  const { readFile } = await import('node:fs/promises')
  const path = await import('node:path')

  const staticDir = path.resolve(process.cwd(), 'media')
  return readFile(path.join(staticDir, doc.filename as string))
}
