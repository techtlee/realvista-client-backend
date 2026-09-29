import type { CollectionConfig } from 'payload'

import {
  isPlatformAdmin,
  isPlatformAdminField,
  usersTenantRead,
  usersUpdate,
} from '../access/tenantScoped'

/**
 * Realtors and platform staff.
 *
 * ## The privilege-escalation landmine
 *
 * `update` has to allow `user.id === id`, otherwise a realtor cannot change
 * their own password or email. That self-update permission is exactly what makes
 * the field-level `access` on `platformRole` and `tenants` load-bearing:
 * without it, any realtor could
 *
 *     PATCH /api/users/<their own id>  { "platformRole": "platform-admin" }
 *
 * and own every client's data. Collection-level access would happily allow that
 * request — it is their own document. Only field-level access stops it.
 *
 * If you touch this file, `tests/int/tenant-isolation.int.spec.ts` must still pass.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: { cs: 'Uživatel', en: 'User' },
    plural: { cs: 'Uživatelé', en: 'Users' },
  },
  auth: {
    /**
     * Generated sites authenticate with an API key belonging to a read-only
     * service user that is a member of exactly one tenant. That is what keeps a
     * leaked env var on one client's site from reading another client's data —
     * defence in depth behind the server-side access functions.
     */
    useAPIKey: true,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'platformRole'],
    group: { cs: 'Platforma', en: 'Platform' },
  },
  access: {
    // A realtor may see co-tenant users (their colleagues), nobody else.
    read: usersTenantRead,
    // Accounts are created by provisioning, never self-service.
    create: isPlatformAdmin,
    delete: isPlatformAdmin,
    // Self-update is required for password and email changes.
    update: usersUpdate,
  },
  /**
   * Deliberately NO "first user becomes admin" hook.
   *
   * An earlier revision promoted whichever account was created into an empty
   * users table. It is a tempting convenience and it is a back door: truncate
   * or lose the users table and the next account silently becomes superuser
   * over every tenant. It also made the isolation suite pass vacuously, because
   * the seeded realtor came out as a platform admin.
   *
   * Bootstrap the first admin explicitly instead: `pnpm seed:admin`, which uses
   * the Local API with `overrideAccess: true`.
   */
  fields: [
    {
      name: 'name',
      type: 'text',
      label: { cs: 'Jméno a příjmení', en: 'Full name' },
    },
    {
      name: 'platformRole',
      type: 'select',
      required: true,
      defaultValue: 'client',
      label: { cs: 'Role na platformě', en: 'Platform role' },
      options: [
        { value: 'platform-admin', label: { cs: 'Správce platformy', en: 'Platform admin' } },
        { value: 'client', label: { cs: 'Klient', en: 'Client' } },
      ],
      // DO NOT REMOVE. See the file header.
      access: {
        create: isPlatformAdminField,
        update: isPlatformAdminField,
      },
      admin: { position: 'sidebar' },
    },
    // NOTE: the `tenants` array field is injected by @payloadcms/plugin-multi-tenant.
    // Its admin-only write lockdown lives in `tenantsArrayField.arrayFieldAccess`
    // in payload.config.ts — it is every bit as load-bearing as `platformRole`
    // above, just configured in a different file.
  ],
}
