import type { Payload } from 'payload'

export interface ClientUserInput {
  tenantSlug: string
  email: string
  name: string
  password: string
  /** Overwrite the password of an existing account. Off by default. */
  resetPassword?: boolean
}

export interface ClientUserResult {
  userId: number | string
  tenantId: number | string
  tenantName: string
  action: 'created' | 'updated'
}

export class ClientUserError extends Error {}

/**
 * Creates or updates the realtor's login for one tenant, keyed by e-mail.
 *
 * An upsert rather than delete-and-recreate (the old behaviour): deleting the
 * user changed its id, dropped anything else attached to it, and reset a
 * password the realtor may already have changed. A re-run now only makes sure
 * the name and the owner membership are right. The password is set on create
 * and left alone afterwards unless `resetPassword` is asked for.
 */
export async function upsertClientUser(payload: Payload, input: ClientUserInput): Promise<ClientUserResult> {
  const tenants = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: input.tenantSlug } },
    overrideAccess: true,
  })
  const tenant = tenants.docs[0]
  if (!tenant) throw new ClientUserError(`No tenant with slug "${input.tenantSlug}".`)

  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: input.email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const found = existing.docs[0] as
    | { id: number | string; platformRole?: string; tenants?: { tenant: unknown; role?: string }[] }
    | undefined

  if (!found) {
    const user = await payload.create({
      collection: 'users',
      data: {
        email: input.email,
        password: input.password,
        name: input.name,
        platformRole: 'client',
        tenants: [{ tenant: tenant.id, role: 'owner' }],
      } as never,
      overrideAccess: true,
    })
    return { userId: user.id, tenantId: tenant.id, tenantName: tenant.name, action: 'created' }
  }

  // Never quietly turn a platform admin into a realtor.
  if (found.platformRole === 'platform-admin') {
    throw new ClientUserError(`${input.email} is a platform admin; refusing to make it a client login.`)
  }

  const idOf = (t: unknown) => (t && typeof t === 'object' && 'id' in t ? (t as { id: unknown }).id : t)
  const others = (found.tenants ?? [])
    .filter((m) => idOf(m.tenant) !== tenant.id)
    .map((m) => ({ tenant: idOf(m.tenant), role: m.role }))

  const user = await payload.update({
    collection: 'users',
    id: found.id,
    data: {
      name: input.name,
      platformRole: 'client',
      tenants: [...others, { tenant: tenant.id, role: 'owner' }],
      ...(input.resetPassword ? { password: input.password } : {}),
    } as never,
    overrideAccess: true,
  })
  return { userId: user.id, tenantId: tenant.id, tenantName: tenant.name, action: 'updated' }
}
