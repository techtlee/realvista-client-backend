// Must be first — payload.config reads env at module evaluation time.
import 'dotenv/config'

import { readFile } from 'node:fs/promises'

import { getPayload } from 'payload'

import config from '../payload.config'

/**
 * Swaps the demo tenant's hero photo and agent portrait for the REALVISTA
 * Figma photography without reseeding: every other demo record stays as it
 * is. `pnpm seed:demo` uses the same files for a fresh demo.
 *
 *   pnpm exec tsx src/scripts/setDemoPhotos.ts
 */

const SLUG = 'demo-reality'

async function main() {
  const payload = await getPayload({ config: await config })
  const { docs: tenants } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: SLUG } },
    overrideAccess: true,
    limit: 1,
  })
  const tenant = tenants[0]
  if (!tenant) throw new Error(`No tenant "${SLUG}". Run pnpm seed:demo first.`)

  async function uploadAsset(file: string, alt: string) {
    const data = await readFile(new URL(`../seed/demo-assets/${file}`, import.meta.url))
    return payload.create({
      collection: 'media',
      data: { alt, tenant: tenant.id },
      file: { name: file, data, mimetype: 'image/png', size: data.length },
      overrideAccess: true,
    })
  }

  const agentPhoto = await uploadAsset('makler-portret.png', 'Portrét makléře')
  const heroImage = await uploadAsset('hero-makler.png', 'Makléř v moderním interiéru')

  const { docs: settings } = await payload.find({
    collection: 'site-settings',
    where: { tenant: { equals: tenant.id } },
    overrideAccess: true,
    limit: 1,
  })
  const current = settings[0]
  if (!current) throw new Error(`Tenant "${SLUG}" has no site settings.`)

  await payload.update({
    collection: 'site-settings',
    id: current.id,
    data: {
      hero: { ...current.hero, backgroundImage: heroImage.id },
      agent: { ...current.agent, photo: agentPhoto.id },
    },
    overrideAccess: true,
  })
  payload.logger.info(`Demo photos set: hero media ${heroImage.id}, agent media ${agentPhoto.id}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
