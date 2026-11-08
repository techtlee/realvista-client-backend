import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'

import config from '@/payload.config'
import { ClientUserError, upsertClientUser } from '@/seed/clientUser'

/** M2: `seed:client` is an upsert by e-mail and takes the realtor's name. */

const SLUG = 'cw2t-user'
const OTHER = 'cw2t-user-other'
const EMAIL = 'realtor@cw2-user.test'
let payload: Payload
let tenantId: number | string
let otherId: number | string

async function cleanup() {
  for (const email of [EMAIL, 'admin@cw2-user.test']) {
    await payload.delete({ collection: 'users', where: { email: { equals: email } }, overrideAccess: true })
  }
  await payload.delete({ collection: 'tenants', where: { slug: { in: [SLUG, OTHER] } }, overrideAccess: true })
}

const login = async (password: string) =>
  payload.login({ collection: 'users', data: { email: EMAIL, password } }).then(
    () => true,
    () => false,
  )

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await cleanup()
  tenantId = (await payload.create({ collection: 'tenants', data: { name: 'CW2 User', slug: SLUG } as never, overrideAccess: true })).id
  otherId = (await payload.create({ collection: 'tenants', data: { name: 'CW2 Other', slug: OTHER } as never, overrideAccess: true })).id
})

afterAll(async () => {
  await cleanup()
})

describe('upsertClientUser', () => {
  let userId: number | string

  it('creates the realtor as tenant owner with the given name', async () => {
    const r = await upsertClientUser(payload, { tenantSlug: SLUG, email: EMAIL, name: 'Jana Králová', password: 'first-Password-123' })
    expect(r.action).toBe('created')
    userId = r.userId
    const u = await payload.findByID({ collection: 'users', id: userId, depth: 0, overrideAccess: true })
    expect(u).toMatchObject({ name: 'Jana Králová', platformRole: 'client' })
    expect(u.tenants).toEqual([expect.objectContaining({ tenant: tenantId, role: 'owner' })])
    expect(await login('first-Password-123')).toBe(true)
  })

  it('re-runs as an update: same id, name refreshed, password kept', async () => {
    const r = await upsertClientUser(payload, { tenantSlug: SLUG, email: EMAIL, name: 'Jana Králová Nová', password: 'second-Password-456' })
    expect(r).toMatchObject({ action: 'updated', userId })
    const u = await payload.findByID({ collection: 'users', id: userId, depth: 0, overrideAccess: true })
    expect(u.name).toBe('Jana Králová Nová')
    expect(u.tenants).toHaveLength(1)
    expect(await login('first-Password-123')).toBe(true)
    expect(await login('second-Password-456')).toBe(false)
    const count = await payload.count({ collection: 'users', where: { email: { equals: EMAIL } }, overrideAccess: true })
    expect(count.totalDocs).toBe(1)
  })

  it('resets the password only when asked', async () => {
    await upsertClientUser(payload, { tenantSlug: SLUG, email: EMAIL, name: 'Jana Králová', password: 'third-Password-789', resetPassword: true })
    expect(await login('third-Password-789')).toBe(true)
  })

  it('keeps memberships in other tenants', async () => {
    await payload.update({
      collection: 'users',
      id: userId,
      data: { tenants: [{ tenant: otherId, role: 'editor' }] } as never,
      overrideAccess: true,
    })
    await upsertClientUser(payload, { tenantSlug: SLUG, email: EMAIL, name: 'Jana Králová', password: 'unused-Password-1' })
    const u = await payload.findByID({ collection: 'users', id: userId, depth: 0, overrideAccess: true })
    expect(u.tenants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tenant: otherId, role: 'editor' }),
        expect.objectContaining({ tenant: tenantId, role: 'owner' }),
      ]),
    )
  })

  it('refuses to turn a platform admin into a client', async () => {
    await payload.create({
      collection: 'users',
      data: { email: 'admin@cw2-user.test', password: 'admin-Password-1', platformRole: 'platform-admin' } as never,
      overrideAccess: true,
    })
    await expect(
      upsertClientUser(payload, { tenantSlug: SLUG, email: 'admin@cw2-user.test', name: 'X', password: 'y-Password-1' }),
    ).rejects.toThrow(ClientUserError)
    const a = await payload.find({ collection: 'users', where: { email: { equals: 'admin@cw2-user.test' } }, overrideAccess: true })
    expect(a.docs[0]!.platformRole).toBe('platform-admin')
  })

  it('names an unknown tenant', async () => {
    await expect(
      upsertClientUser(payload, { tenantSlug: 'cw2t-nope', email: EMAIL, name: 'X', password: 'y-Password-1' }),
    ).rejects.toThrow(/cw2t-nope/)
  })
})
