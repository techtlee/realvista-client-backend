import { readFileSync } from 'node:fs'

import type { Payload } from 'payload'
import { z } from 'zod'

import { trackRevalidatePings, type PingSummary } from './revalidatePings'
import {
  DOPLNIT,
  NAVRH,
  defaultStarterCopy,
  realtorTitle,
  renderStarterCopy,
  starterCopySchema,
  type StarterCopy,
} from './starterCopy'

/**
 * Seeds a client backend's single tenant from a `/create-website` provisioning
 * request: tenant, site settings, services, posts and three sample listings.
 *
 * Generalised from client #1's hand-written prototype. Nothing about the
 * client is invented: names and contact details come from the request,
 * everything only the realtor knows is a visible `[DOPLNIT]`, legal texts are
 * `[NÁVRH]` drafts, and the listings are titled "Ukázka – …".
 *
 * Re-runnable: the tenant is upserted by slug and its CONTENT is replaced.
 * Users (the realtor login, the site's API-key account) are never touched, so
 * a re-run does not invalidate the site key.
 */

// ─── Input ───────────────────────────────────────────────────────────────────

/** Same rule as the CRM's SITE_SLUG. */
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

/**
 * The parts of the provisioning JSON this seed reads. Deliberately loose:
 * `cw validate` runs the strict, catalog-aware schema from `@makleri/selection`
 * before this ever runs; here unknown keys are tolerated so the template does
 * not have to change for every additive selection key.
 */
const provisioningSchema = z.looseObject({
  schemaVersion: z.literal(1),
  theme: z.looseObject({ name: z.string().min(1), variant: z.string().min(1) }),
  modules: z.looseObject({ blog: z.boolean(), services: z.boolean() }),
  brand: z.looseObject({ name: z.string().trim().min(1), tagline: z.string().trim().optional() }),
  content: z.looseObject({ tone: z.enum(['formal', 'friendly', 'neutral']) }),
  domain: z.looseObject({ situation: z.string(), name: z.string().optional() }),
})

/** `provisioningRequestSchema` v1 (platform `@makleri/selection`, P3), loosely. */
export const provisioningRequestSchema = z.looseObject({
  requestVersion: z.literal(1),
  slug: z.string().regex(SLUG, 'Invalid slug (lowercase letters, digits and dashes).'),
  crm: z.looseObject({ leadId: z.number(), siteId: z.number() }).optional(),
  contact: z.looseObject({
    name: z.string().trim().min(1),
    email: z.email(),
    phone: z.string().trim().min(1).optional(),
  }),
  company: z
    .looseObject({
      name: z.string().trim().min(1).optional(),
      ico: z.string().trim().min(1).optional(),
      city: z.string().trim().min(1).optional(),
    })
    .optional(),
  provisioning: provisioningSchema,
})

export type ProvisioningRequest = z.output<typeof provisioningRequestSchema>

export interface ClientSiteInput {
  request: ProvisioningRequest
  copy: StarterCopy
  siteUrl: string
  revalidateSecret: string
  subdomainBase: string
}

export class SeedInputError extends Error {}

function readJson(path: string, what: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    throw new SeedInputError(`Cannot read ${what} from ${path}: ${(err as Error).message}`)
  }
}

function parse<T>(schema: z.ZodType<T>, value: unknown, what: string): T {
  const r = schema.safeParse(value)
  if (r.success) return r.data
  const issues = r.error.issues.map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n')
  throw new SeedInputError(`Invalid ${what}:\n${issues}`)
}

/**
 * Builds the input from the environment.
 *
 * Either `PROVISIONING_REQUEST` (the envelope, preferred), or the bare
 * `PROVISIONING_JSON` plus `TENANT_SLUG`, `CLIENT_NAME`, `CLIENT_EMAIL`
 * (optional `CLIENT_PHONE`, `COMPANY_NAME`, `COMPANY_ICO`, `COMPANY_CITY`).
 * `STARTER_COPY_JSON` is optional; the tone default is used without it.
 */
export function clientSiteInputFromEnv(env: Record<string, string | undefined>): ClientSiteInput {
  const need = (k: string) => {
    const v = env[k]?.trim()
    if (!v) throw new SeedInputError(`Set ${k}.`)
    return v
  }

  let raw: unknown
  if (env.PROVISIONING_REQUEST) {
    raw = readJson(env.PROVISIONING_REQUEST, 'PROVISIONING_REQUEST')
  } else if (env.PROVISIONING_JSON) {
    const company = {
      name: env.COMPANY_NAME || undefined,
      ico: env.COMPANY_ICO || undefined,
      city: env.COMPANY_CITY || undefined,
    }
    raw = {
      requestVersion: 1,
      slug: need('TENANT_SLUG'),
      contact: { name: need('CLIENT_NAME'), email: need('CLIENT_EMAIL'), phone: env.CLIENT_PHONE || undefined },
      company: Object.values(company).some(Boolean) ? company : undefined,
      provisioning: readJson(env.PROVISIONING_JSON, 'PROVISIONING_JSON'),
    }
  } else {
    throw new SeedInputError('Set PROVISIONING_REQUEST (preferred) or PROVISIONING_JSON.')
  }

  const request = parse(provisioningRequestSchema, raw, 'provisioning request')
  if (env.TENANT_SLUG && env.TENANT_SLUG !== request.slug) {
    throw new SeedInputError(
      `TENANT_SLUG=${env.TENANT_SLUG} does not match the request's slug "${request.slug}".`,
    )
  }

  const tone = request.provisioning.content.tone
  const copy = env.STARTER_COPY_JSON
    ? parse(starterCopySchema, readJson(env.STARTER_COPY_JSON, 'STARTER_COPY_JSON'), 'starter copy')
    : defaultStarterCopy(tone)
  // The client chose the tone; copy written for another one (e.g. a stale
  // starter-copy.json after the CRM changed it) must not reach their site.
  if (copy.tone !== tone) {
    throw new SeedInputError(
      `Starter copy tone "${copy.tone}" does not match the request's content.tone "${tone}". ` +
        'Regenerate or edit the starter copy for the requested tone.',
    )
  }

  return {
    request,
    copy,
    siteUrl: need('SITE_URL'),
    revalidateSecret: need('REVALIDATE_SECRET'),
    subdomainBase: env.PLATFORM_SUBDOMAIN_BASE || 'realvista.cz',
  }
}

// ─── Places ──────────────────────────────────────────────────────────────────

export const DEFAULT_CITY = 'Praha'

/**
 * Region and centre for the cities a sample listing is most likely placed in.
 * Any other city still works: its listings just have no region or map pin,
 * because a guessed coordinate would put a pin in the wrong place.
 */
const CITIES: Record<string, { region: string; lat: number; lng: number }> = {
  praha: { region: 'praha', lat: 50.0755, lng: 14.4378 },
  brno: { region: 'jihomoravsky', lat: 49.1951, lng: 16.6068 },
  ostrava: { region: 'moravskoslezsky', lat: 49.8209, lng: 18.2625 },
  plzen: { region: 'plzensky', lat: 49.7384, lng: 13.3736 },
  liberec: { region: 'liberecky', lat: 50.7663, lng: 15.0543 },
  olomouc: { region: 'olomoucky', lat: 49.5938, lng: 17.2509 },
  'ceske budejovice': { region: 'jihocesky', lat: 48.9745, lng: 14.4743 },
  'hradec kralove': { region: 'kralovehradecky', lat: 50.2104, lng: 15.8327 },
  'usti nad labem': { region: 'ustecky', lat: 50.6607, lng: 14.0323 },
  pardubice: { region: 'pardubicky', lat: 50.0343, lng: 15.7812 },
  zlin: { region: 'zlinsky', lat: 49.2265, lng: 17.6707 },
  jihlava: { region: 'vysocina', lat: 49.3961, lng: 15.5912 },
  'karlovy vary': { region: 'karlovarsky', lat: 50.2319, lng: 12.872 },
  kladno: { region: 'stredocesky', lat: 50.1473, lng: 14.1029 },
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

export function placeOf(city: string) {
  return CITIES[fold(city)]
}

// ─── Content helpers ─────────────────────────────────────────────────────────

const escapeXml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!)

async function placeholderImage(label: string, hue: number): Promise<Buffer> {
  const sharp = (await import('sharp')).default
  const w = 1600
  const h = 1067
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue} 22% 34%)"/>
      <stop offset="100%" stop-color="hsl(${(hue + 40) % 360} 18% 62%)"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
          font-family="Helvetica, Arial, sans-serif" font-size="46"
          fill="rgba(255,255,255,0.82)">${escapeXml(label)}</text>
  </svg>`
  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer()
}

export function lexical(...paragraphs: string[]) {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: paragraphs.map((text) => ({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: [{ type: 'text', text, version: 1, format: 0 }],
      })),
    },
  }
}

const SAMPLE_NOTE = 'Ukázkový inzerát. Před spuštěním webu ho smažte nebo nahraďte skutečnou nabídkou.'

/** Three sample listings. Prices are illustrative and the titles say so. */
function sampleListings(city: string) {
  return [
    {
      title: `Ukázka – Prodej bytu 3+kk, 74 m², ${city}`,
      transactionType: 'prodej',
      propertyType: 'byt',
      disposition: '3-kk',
      price: 6_900_000,
      usableArea: 74,
      penb: 'C',
      condition: 'po-rekonstrukci',
      features: ['balkon', 'sklep', 'vytah'],
      description: 'Světlý byt 3+kk s balkonem, sklepem a výtahem.',
      hue: 30,
      slug: 'byt-3kk-74',
    },
    {
      title: `Ukázka – Prodej rodinného domu 4+1, 140 m², ${city}`,
      transactionType: 'prodej',
      propertyType: 'dum',
      disposition: '4-1',
      price: 11_500_000,
      usableArea: 140,
      penb: 'D',
      condition: 'dobry',
      features: ['zahrada', 'garaz', 'terasa'],
      description: 'Rodinný dům se zahradou, garáží a terasou.',
      hue: 20,
      slug: 'dum-4-1-140',
    },
    {
      title: `Ukázka – Pronájem bytu 2+kk, 52 m², ${city}`,
      transactionType: 'pronajem',
      propertyType: 'byt',
      disposition: '2-kk',
      price: 18_500,
      usableArea: 52,
      penb: 'B',
      condition: 'novostavba',
      features: ['lodzie', 'vytah', 'parkovani'],
      description: 'Byt v novostavbě s lodžií a parkovacím stáním.',
      hue: 45,
      slug: 'byt-2kk-52',
    },
  ] as const
}

// ─── Seed ────────────────────────────────────────────────────────────────────

export interface SeedSummary {
  tenantId: number | string
  tenantName: string
  slug: string
  city: string
  listings: number
  services: number
  posts: number
  /** Where the realtor still has to write something before go-live. */
  todos: { doplnit: string[]; navrh: string[] }
  pings: PingSummary
}

/** Paths of every string in `value` that contains `marker`. */
function markerPaths(value: unknown, marker: string, path = ''): string[] {
  if (typeof value === 'string') return value.includes(marker) ? [path] : []
  if (Array.isArray(value)) {
    const hits = value.flatMap((v, i) => markerPaths(v, marker, `${path}[${i}]`))
    // Report an array once ("stats"), not once per row.
    return hits.length ? [path] : []
  }
  if (value && typeof value === 'object') {
    // A rich-text field is one thing to the realtor, not a tree of nodes.
    if ('root' in value) return JSON.stringify(value).includes(marker) ? [path] : []
    return Object.entries(value).flatMap(([k, v]) => markerPaths(v, marker, path ? `${path}.${k}` : k))
  }
  return []
}

export async function seedClientSite(
  payload: Payload,
  input: ClientSiteInput,
  opts: { awaitRevalidate?: { quietMs?: number; timeoutMs?: number } } = {},
): Promise<SeedSummary> {
  const { request } = input
  const p = request.provisioning
  const slug = request.slug
  const city = request.company?.city ?? DEFAULT_CITY
  const place = placeOf(city)
  const companyName = request.company?.name ?? p.brand.name

  const copy = renderStarterCopy(input.copy, {
    brand: p.brand.name,
    city,
    company: request.company?.ico ? `${companyName}, IČO ${request.company.ico}` : companyName,
    agentName: request.contact.name,
    agentTitle: realtorTitle(request.contact.name),
    email: request.contact.email,
    phone: request.contact.phone ?? DOPLNIT,
  })

  const pings = trackRevalidatePings(input.siteUrl)
  try {
    // 1. Tenant: upsert by slug, so a re-run never creates a duplicate.
    const tenantData = {
      name: p.brand.name,
      slug,
      status: 'provisioning' as const,
      theme: { name: p.theme.name, variant: p.theme.variant },
      hosting: {
        domain: p.domain.situation !== 'none' ? p.domain.name : undefined,
        platformSubdomain: `${slug}.${input.subdomainBase}`,
        siteUrl: input.siteUrl,
      },
      revalidateSecret: input.revalidateSecret,
    }
    const found = await payload.find({
      collection: 'tenants',
      where: { slug: { equals: slug } },
      overrideAccess: true,
    })
    const tenant = found.docs[0]
      ? await payload.update({
          collection: 'tenants',
          id: found.docs[0].id,
          data: tenantData as never,
          overrideAccess: true,
        })
      : await payload.create({ collection: 'tenants', data: tenantData as never, overrideAccess: true })

    // 2. Content: replaced wholesale. Users are left alone on purpose.
    for (const collection of ['properties', 'posts', 'services', 'site-settings', 'media'] as const) {
      await payload.delete({ collection, where: { tenant: { equals: tenant.id } }, overrideAccess: true })
    }

    const upload = async (name: string, label: string, hue: number) => {
      const data = await placeholderImage(label, hue)
      return payload.create({
        collection: 'media',
        data: { alt: label, tenant: tenant.id },
        file: { name, data, mimetype: 'image/jpeg', size: data.length },
        overrideAccess: true,
      })
    }

    const hero = await upload('hero.jpg', 'Úvodní fotografie', 25)
    const portrait = await upload('makler.jpg', 'Portrét makléře', 30)

    const settings = {
      tenant: tenant.id,
      siteName: p.brand.name,
      hero: {
        headline: copy.hero.headline,
        subheadline: p.brand.tagline || copy.hero.subheadline,
        ctaLabel: copy.hero.ctaLabel,
        ctaHref: '#kontakt',
        backgroundImage: hero.id,
      },
      about: { heading: copy.about.heading, body: lexical(...copy.about.paragraphs) },
      stats: copy.stats,
      agent: {
        name: request.contact.name,
        jobTitle: copy.agent.jobTitle,
        photo: portrait.id,
        bio: lexical(...copy.agent.bio),
        phone: request.contact.phone ?? DOPLNIT,
        email: request.contact.email,
        licenceNumber: DOPLNIT,
      },
      contact: {
        companyName,
        ico: request.company?.ico,
        address: request.company?.city
          ? `${DOPLNIT} ulice a číslo popisné\n${request.company.city}`
          : `${DOPLNIT} adresa kanceláře`,
        phone: request.contact.phone ?? DOPLNIT,
        email: request.contact.email,
        officeHours: copy.contact.officeHours,
      },
      legal: {
        privacyPolicy: lexical(...copy.legal.privacyPolicy),
        cookieNotice: lexical(...copy.legal.cookieNotice),
        gdprConsentText: copy.legal.gdprConsentText,
      },
    }
    await payload.create({ collection: 'site-settings', data: settings as never, overrideAccess: true })

    const services = p.modules.services ? copy.services : []
    for (const [i, s] of services.entries()) {
      await payload.create({
        collection: 'services',
        data: { ...s, tenant: tenant.id, order: i } as never,
        overrideAccess: true,
      })
    }

    const posts = p.modules.blog ? copy.posts : []
    for (const [i, post] of posts.entries()) {
      const cover = await upload(`blog-${i}.jpg`, post.title, 25 + i * 60)
      const published = new Date()
      published.setDate(published.getDate() - i * 9)
      await payload.create({
        collection: 'posts',
        data: {
          tenant: tenant.id,
          title: post.title,
          excerpt: post.excerpt,
          category: post.category,
          coverImage: cover.id,
          publishedAt: published.toISOString(),
          body: lexical(...post.body),
        } as never,
        overrideAccess: true,
      })
    }

    const listings = sampleListings(city)
    for (const l of listings) {
      const gallery = []
      for (const [i, room] of ['Obývací pokoj', 'Kuchyně', 'Ložnice'].entries()) {
        const m = await upload(`ukazka-${l.slug}-${i}.jpg`, `Ukázka – ${room}`, (l.hue + i * 18) % 360)
        gallery.push({ image: m.id, alt: room })
      }
      await payload.create({
        collection: 'properties',
        data: {
          tenant: tenant.id,
          title: l.title,
          status: 'active',
          featured: true,
          transactionType: l.transactionType,
          propertyType: l.propertyType,
          disposition: l.disposition,
          usableArea: l.usableArea,
          ownership: 'osobni',
          condition: l.condition,
          features: [...l.features],
          penb: { class: l.penb },
          price: { amount: l.price, period: l.transactionType === 'pronajem' ? 'mesic' : undefined },
          address: {
            city,
            // A sample has no real address; never show a precise pin for it.
            hideExactAddress: true,
            ...(place ?? {}),
          },
          gallery,
          description: lexical(l.description, SAMPLE_NOTE),
        } as never,
        overrideAccess: true,
      })
    }

    const summary = await pings.settle(opts.awaitRevalidate)
    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      slug,
      city,
      listings: listings.length,
      services: services.length,
      posts: posts.length,
      todos: {
        doplnit: [
          ...markerPaths(settings, DOPLNIT),
          ...(posts.some((x) => x.body.some((b) => b.includes(DOPLNIT))) ? ['posts'] : []),
          'properties (3 × Ukázka)',
        ],
        navrh: markerPaths(settings, NAVRH.slice(0, 6)),
      },
      pings: summary,
    }
  } finally {
    pings.restore()
  }
}
