import { postgresAdapter } from '@payloadcms/db-postgres'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { cs } from '@payloadcms/translations/languages/cs'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { isPlatformAdminField } from './access/tenantScoped'
import { Enquiries } from './collections/Enquiries'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { Properties } from './collections/Properties'
import { Services } from './collections/Services'
import { SiteSettings } from './collections/SiteSettings'
import { Tenants } from './collections/Tenants'
import { Users } from './collections/Users'
import { storagePlugins } from './lib/storage'
import { migrations } from './migrations'
import type { Config } from './payload-types'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: '— Makléři',
    },
  },

  /**
   * Order drives the admin nav. Content first, because that is what a realtor
   * opens the panel to do; the platform collections are for platform admins and
   * several are hidden from clients entirely.
   */
  collections: [
    // Per-tenant content
    Properties,
    Posts,
    Services,
    Enquiries,
    Media,
    SiteSettings,
    // Platform
    Tenants,
    Users,
  ],

  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },

  /**
   * Development keeps schema push: edit a collection, the dev database follows.
   *
   * Production never pushes. Every schema change ships as a migration in
   * src/migrations (`pnpm migrate:create <name>` after changing a collection),
   * and `prodMigrations` runs the pending ones when the server boots. Schema
   * push against a database holding real client data is a silent DROP COLUMN
   * waiting to happen.
   */
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
    migrationDir: path.resolve(dirname, 'migrations'),
    push: process.env.NODE_ENV !== 'production',
    prodMigrations: migrations,
  }),

  sharp,

  /**
   * Czech is the admin default. Payload ships a complete `cs` translation
   * (packages/translations/src/languages/cs.ts), so the chrome — auth screens,
   * validation errors, date pickers — is Czech out of the box. Field labels are
   * authored in Czech per-collection.
   */
  i18n: {
    /**
     * Czech only — `en` is deliberately NOT listed.
     *
     * Payload picks the admin language from the request's Accept-Language
     * header and only falls back to `fallbackLanguage` when nothing matches.
     * With `en` supported, a realtor running an English-language Windows or
     * Chrome install gets an English admin panel no matter what the fallback
     * says. Listing only `cs` makes Czech unconditional.
     *
     * Adding a locale here is a one-line change when a client needs it.
     */
    supportedLanguages: { cs },
    fallbackLanguage: 'cs',
  },

  /**
   * One locale today, but enabled from day one on purpose.
   *
   * Payload stores localized values in separate `_locales` tables. Turning
   * localization on later would be a data migration across every site; turning
   * a second locale on now is one line in this array. D7 in the plan.
   */
  localization: {
    locales: [
      { code: 'cs', label: { cs: 'Čeština', en: 'Czech' } },
    ],
    defaultLocale: 'cs',
    fallback: true,
  },

  plugins: [
    /**
     * Admin-UI convenience only: it scopes the tenant selector, filters list
     * views, and stamps `tenant` on create.
     *
     * It is NOT the security boundary — see src/access/tenantScoped.ts. Every
     * collection listed here must also carry its own `access` block.
     */
    multiTenantPlugin<Config>({
      tenantsSlug: 'tenants',
      /**
       * Every tenant-scoped collection must be listed here AND carry its own
       * `access` block. The plugin handles the admin UI (tenant selector, list
       * filtering, stamping `tenant` on create); the access functions are the
       * actual boundary. A collection missing from this list still enforces
       * access but loses the UI scoping; one missing its `access` block is
       * wide open on the API.
       */
      collections: {
        'site-settings': { isGlobal: true },
        properties: {},
        posts: {},
        services: {},
        enquiries: {},
        media: {},
      },
      userHasAccessToAllTenants: (user) =>
        (user as { platformRole?: string })?.platformRole === 'platform-admin',

      tenantsArrayField: {
        includeDefaultField: true,
        arrayFieldName: 'tenants',
        arrayTenantFieldName: 'tenant',

        /**
         * The second half of the escalation lockdown described in
         * src/collections/Users.ts.
         *
         * `users.update` allows self-update so realtors can change their own
         * password. Without these two access rules a realtor could PATCH their
         * own document to grant themselves another tenant's data — the same
         * breach as self-promoting to admin, one step removed.
         */
        arrayFieldAccess: {
          create: isPlatformAdminField,
          update: isPlatformAdminField,
        },
        tenantFieldAccess: {
          create: isPlatformAdminField,
          update: isPlatformAdminField,
        },

        rowFields: [
          {
            name: 'role',
            type: 'select',
            required: true,
            defaultValue: 'owner',
            label: { cs: 'Role', en: 'Role' },
            options: [
              { value: 'owner', label: { cs: 'Vlastník', en: 'Owner' } },
              { value: 'editor', label: { cs: 'Editor', en: 'Editor' } },
            ],
          },
        ],
      },

      i18n: {
        translations: {
          cs: {
            'assign-tenant-button-label': 'Přiřadit klienta',
            'assign-tenant-modal-title': 'Přiřadit „{{title}}“',
            'field-assignedTenant-label': 'Přiřazený klient',
            'nav-tenantSelector-label': 'Filtrovat podle klienta',
          },
        },
      },
    }),

    // R2 when configured; disk in development. Throws in production if unset.
    ...storagePlugins(),
  ],
})
