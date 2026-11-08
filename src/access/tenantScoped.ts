import type { Access, FieldAccess, Where } from 'payload'

/**
 * Tenant scoping for every collection a realtor can reach.
 *
 * ## Why this file exists
 *
 * `@payloadcms/plugin-multi-tenant` filters the admin UI, scopes relationship
 * dropdowns, and stamps `tenant` on create. It does **not** enforce access on
 * the REST or GraphQL API — Payload's docs are explicit that `filterOptions` and
 * write permissions operate independently.
 *
 * So the plugin alone gives you an admin panel that looks isolated while
 * `GET /api/properties` happily returns every realtor's listings. These
 * functions are the actual boundary; the plugin is a UX convenience on top.
 *
 * Every tenant-scoped collection must spread {@link tenantAccess} into its
 * `access` block. A collection that forgets is not "less strict" — it is fully
 * public to any authenticated realtor.
 */

/** Platform role on the user document. `client` is a realtor. */
export type PlatformRole = 'platform-admin' | 'client'

/** Role a user holds *within* one tenant. */
export type TenantRole = 'owner' | 'editor'

interface TenantMembership {
  tenant: string | number | { id: string | number }
  role?: TenantRole
}

interface ScopedUser {
  id: string | number
  platformRole?: PlatformRole
  tenants?: TenantMembership[] | null
}

/** Roles permitted to mutate content within a tenant. */
const WRITE_ROLES: readonly TenantRole[] = ['owner', 'editor']

/**
 * Tenant ids a user belongs to.
 *
 * `depth` varies by request, so a membership's `tenant` is sometimes an id and
 * sometimes a populated document. Normalising both shapes here is the reason
 * this helper exists rather than being inlined.
 */
export function tenantIdsFor(user: unknown): (string | number)[] {
  const memberships = (user as ScopedUser | undefined)?.tenants
  if (!Array.isArray(memberships)) return []

  return memberships
    .map((m) => (typeof m?.tenant === 'object' && m.tenant !== null ? m.tenant.id : m?.tenant))
    .filter((id): id is string | number => id !== undefined && id !== null && id !== '')
}

/** Tenant ids where the user's role permits writing. */
export function writableTenantIdsFor(user: unknown): (string | number)[] {
  const memberships = (user as ScopedUser | undefined)?.tenants
  if (!Array.isArray(memberships)) return []

  return memberships
    .filter((m) => WRITE_ROLES.includes((m?.role ?? 'editor') as TenantRole))
    .map((m) => (typeof m?.tenant === 'object' && m.tenant !== null ? m.tenant.id : m?.tenant))
    .filter((id): id is string | number => id !== undefined && id !== null && id !== '')
}

function isAdmin(user: unknown): boolean {
  return (user as ScopedUser | undefined)?.platformRole === 'platform-admin'
}

/** Collection-level: true only for platform admins. */
export const isPlatformAdmin: Access = ({ req: { user } }) => isAdmin(user)

/** Field-level: true only for platform admins. */
export const isPlatformAdminField: FieldAccess = ({ req: { user } }) => isAdmin(user)

/**
 * Read access for tenant-scoped content.
 *
 * Returns a `Where` for realtors, which Payload compiles into a SQL
 * `WHERE tenant IN (...)`. Anonymous requests get `false` — public site content
 * is served by the generated sites using a per-tenant API key, never anonymously.
 */
export const tenantRead: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdmin(user)) return true

  const ids = tenantIdsFor(user)
  if (ids.length === 0) return false

  return { tenant: { in: ids } } satisfies Where
}

/** Create / update / delete access for tenant-scoped content. */
export const tenantWrite: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdmin(user)) return true

  const ids = writableTenantIdsFor(user)
  if (ids.length === 0) return false

  return { tenant: { in: ids } } satisfies Where
}

/**
 * Read access for the `users` collection.
 *
 * Users are scoped by membership (`tenants.tenant`), not by a `tenant` column,
 * so this cannot reuse {@link tenantRead}. A realtor sees their colleagues on
 * the same tenant and nobody else; a user with no membership sees only
 * themselves, which keeps their own profile page working.
 */
export const usersTenantRead: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdmin(user)) return true

  const ids = tenantIdsFor(user)

  // Assigned through a typed local rather than returned inline: two object
  // literals in separate returns infer a union with optional-undefined keys,
  // which does not satisfy Where's index signature.
  const where: Where =
    ids.length === 0 ? { id: { equals: user.id } } : { 'tenants.tenant': { in: ids } }

  return where
}

/**
 * Update access for the `users` collection.
 *
 * Self-update must be allowed so realtors can change their own password. That
 * is precisely why `platformRole` and the `tenants` array carry field-level
 * access — see the header of src/collections/Users.ts.
 */
export const usersUpdate: Access = ({ req: { user }, id }) => {
  if (!user) return false
  if (isAdmin(user)) return true
  return user.id === id
}

/**
 * Spread into a tenant-scoped collection's `access` block.
 *
 * @example
 * ```ts
 * export const Properties: CollectionConfig = {
 *   slug: 'properties',
 *   access: tenantAccess,
 *   fields: [...],
 * }
 * ```
 */
export const tenantAccess = {
  read: tenantRead,
  create: tenantWrite,
  update: tenantWrite,
  delete: tenantWrite,
} as const

/**
 * Admin-panel list filter, mirroring {@link tenantRead}.
 *
 * Belt-and-braces: `access.read` already blocks foreign rows, but setting this
 * means the admin UI never *requests* them, so a realtor's list view can't show
 * a "1 of 4000 results" style count leaking the size of other tenants' data.
 */
export const tenantBaseListFilter = ({
  req: { user },
}: {
  req: { user?: unknown }
}): Where | null => {
  if (!user || isAdmin(user)) return null

  const ids = tenantIdsFor(user)
  // No memberships: match nothing rather than everything.
  if (ids.length === 0) return { id: { equals: '__no_tenant__' } }

  return { tenant: { in: ids } }
}

/**
 * Read access for the `tenants` collection itself.
 *
 * Realtors need their own tenant document — the admin panel reads the name and
 * site URL from it — but must not enumerate the client list.
 */
export const ownTenantsOnly: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdmin(user)) return true

  const ids = tenantIdsFor(user)
  if (ids.length === 0) return false

  return { id: { in: ids } }
}
