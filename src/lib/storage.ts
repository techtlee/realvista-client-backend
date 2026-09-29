import { s3Storage } from '@payloadcms/storage-s3'
import type { Plugin } from 'payload'

/**
 * Object storage for uploads.
 *
 * Cloudflare R2 rather than S3 or Vercel Blob, because egress is the whole cost
 * of an image-heavy product: at ~80 clients R2 is roughly $2/month against ~$76
 * on S3. More importantly R2 charges nothing for egress at all, so one client's
 * listing going viral cannot produce a surprise bill.
 *
 * Returns an empty plugin list when R2 is not configured, so local development
 * and CI run against disk without credentials. Never silently fall back to disk
 * in production — see the guard below.
 */

const REQUIRED_VARS = [
  'R2_BUCKET',
  'R2_ENDPOINT',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
] as const

function r2ConfigStatus(): { configured: boolean; missing: string[] } {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v])
  return { configured: missing.length === 0, missing }
}

export function storagePlugins(): Plugin[] {
  const { configured, missing } = r2ConfigStatus()

  // Disk storage is fine for development, and catastrophic in production:
  // serverless filesystems are ephemeral, so uploads would vanish between
  // deploys with no error to notice.
  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error(
      `Object storage is not configured but NODE_ENV is production. ` +
        `Missing: ${missing.join(', ')}. ` +
        `Uploads would be written to an ephemeral filesystem and lost on the next deploy.`,
    )
  }

  return [
    s3Storage({
      /**
       * The plugin is always registered, and merely disabled when R2 is not
       * configured, rather than omitted.
       *
       * Omitting it would also omit the `prefix` field it injects, so the
       * collection schema — and the shape of every media document — would
       * differ between development and production. Bugs that only appear in
       * production are exactly the ones this project cannot afford.
       */
      enabled: configured,
      alwaysInsertFields: true,

      collections: {
        // `prefix` is set per document by the beforeValidate hook in
        // collections/Media.ts — the option here would be a single static
        // string shared by every tenant.
        media: true,
      },
      bucket: process.env.R2_BUCKET ?? 'unconfigured',

      /**
       * Presigned PUT straight from the browser to R2.
       *
       * Not optional: without it every upload is proxied through the Node
       * server and dies at Vercel's 4.5 MB request body limit. A photo from a
       * current iPhone is 3–6 MB, so realtors would hit this constantly.
       */
      clientUploads: true,

      config: {
        endpoint: process.env.R2_ENDPOINT,
        // R2 ignores region but the S3 client requires one.
        region: 'auto',
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID ?? 'unconfigured',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? 'unconfigured',
        },
      },
    }),
  ]
}

/** Exposed for diagnostics and tests. */
export const storageStatus = r2ConfigStatus
