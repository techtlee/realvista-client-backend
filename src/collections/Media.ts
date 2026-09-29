import type { CollectionConfig } from 'payload'

import { tenantAccess, tenantBaseListFilter, tenantIdsFor } from '../access/tenantScoped'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidateTenantSite'

/**
 * Resolves the tenant id a document belongs to, from the payload being written
 * or — when the multi-tenant plugin has not stamped it yet — from the single
 * tenant the acting user belongs to.
 */
function resolveTenantId(data: unknown, user: unknown): string | number | undefined {
  const raw = (data as { tenant?: unknown } | undefined)?.tenant

  if (raw && typeof raw === 'object' && 'id' in raw) {
    return (raw as { id: string | number }).id
  }
  if (typeof raw === 'string' || typeof raw === 'number') return raw

  const ids = tenantIdsFor(user)
  return ids.length === 1 ? ids[0] : undefined
}

/**
 * Uploads: property photos, logos, agent portraits, PENB scans.
 *
 * ## Two things here are not cosmetic
 *
 * **`withMetadata: false`** strips EXIF. Phone photos carry GPS coordinates, so
 * a photo taken inside a client's home leaks that address even when the listing
 * has `hideExactAddress` set. Sharp keeps metadata unless told otherwise.
 *
 * **Object keys must be tenant-prefixed** once the R2 adapter is wired. Rows in
 * this collection are tenant-scoped, but *file URLs are not* — without a prefix,
 * guessing another tenant's filename returns their image. The prefix goes in the
 * `s3Storage` adapter config in payload.config.ts, not here.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: { cs: 'Soubor', en: 'File' },
    plural: { cs: 'Média', en: 'Media' },
  },
  access: tenantAccess,
  admin: {
    baseListFilter: tenantBaseListFilter,
    group: { cs: 'Obsah', en: 'Content' },
  },
  hooks: {
    afterChange: [revalidateAfterChange('media')],
    afterDelete: [revalidateAfterDelete('media')],
    beforeValidate: [
      ({ data, req, operation }) => {
        if (operation !== 'create' || !data) return data

        /**
         * Namespace the object key by tenant.
         *
         * Rows in this collection are access-controlled, but object keys are a
         * flat namespace — without this, knowing or guessing a filename returns
         * another tenant's photo no matter what the access functions say.
         *
         * The storage adapter takes `prefix` per document from this field (the
         * collection-level `prefix` option is a static string and cannot vary
         * per row), so it must be set before the upload handler runs.
         */
        const tenantId = resolveTenantId(data, req?.user)
        if (tenantId !== undefined) {
          data.prefix = `tenants/${tenantId}`
        }
        return data
      },
    ],
  },
  upload: {
    // Derivatives are generated once at upload and stored alongside the original.
    // Generated sites therefore run with Vercel Image Optimization disabled —
    // paying twice to resize the same photo is pure waste.
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 768, height: 512, position: 'centre' },
      { name: 'hero', width: 1600, height: 900, position: 'centre' },
      { name: 'full', width: 2400 },
    ],
    formatOptions: {
      format: 'webp',
      options: { quality: 80 },
    },
    resizeOptions: { width: 2560, withoutEnlargement: true },
    withMetadata: false,
    focalPoint: true,
    crop: true,
    mimeTypes: ['image/*', 'application/pdf'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      localized: true,
      label: { cs: 'Popisek (alt text)', en: 'Alt text' },
      admin: {
        description: {
          cs: 'Krátký popis obrázku pro čtečky a vyhledávače.',
          en: 'Short description for screen readers and search engines.',
        },
      },
    },
  ],
}
