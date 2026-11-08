import { readFileSync } from 'node:fs'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'

import config from '@/payload.config'
import {
  clientSiteInputFromEnv,
  placeOf,
  seedClientSite,
  SeedInputError,
  type ClientSiteInput,
  type ProvisioningRequest,
} from '@/seed/clientSite'
import {
  defaultStarterCopy,
  realtorTitle,
  starterCopySchema,
  TONES,
  type StarterCopy,
} from '@/seed/starterCopy'

/**
 * M1: the generic client seed. What matters is what a real client's site
 * would show on day one — the realtor's own name and contact, no facts nobody
 * gave us, visible placeholders, and a site that actually refreshes.
 */

const SLUG_PREFIX = 'cw2t-site-'
let payload: Payload
let site: Server
let siteUrl: string
const received: { body: string; secret: string | undefined }[] = []

const PROVISIONING = {
  schemaVersion: 1,
  capturedAt: '2026-11-01T10:00:00.000Z',
  theme: { name: 'realvista', variant: 'clay' },
  modules: { blog: true, services: true, listingMap: true, mortgageCalculator: false, references: false },
  sections: { home: ['hero', 'agent', 'listings'] },
  brand: { name: 'Králová Reality', tagline: 'Bydlení v Brně s klidem' },
  content: { tone: 'friendly', locale: 'cs-CZ' },
  domain: { situation: 'none', emailOnDomain: 'no' },
  plan: { tier: 'standard', billingPeriod: 'yearly' },
}

function request(over: Partial<ProvisioningRequest> = {}): ProvisioningRequest {
  return {
    requestVersion: 1,
    slug: `${SLUG_PREFIX}kralova`,
    crm: { leadId: 12, siteId: 3 },
    contact: { name: 'Jana Králová', email: 'jana@kralova-reality.cz', phone: '+420 777 123 456' },
    company: { name: 'Králová Reality s.r.o.', ico: '12345678', city: 'Brno' },
    provisioning: structuredClone(PROVISIONING) as ProvisioningRequest['provisioning'],
    ...over,
  }
}

function input(req: ProvisioningRequest, copy?: StarterCopy): ClientSiteInput {
  return {
    request: req,
    copy: copy ?? defaultStarterCopy(req.provisioning.content.tone),
    siteUrl,
    revalidateSecret: 'test-revalidate-secret',
    subdomainBase: 'realvista.cz',
  }
}

async function cleanup() {
  const tenants = await payload.find({
    collection: 'tenants',
    where: { slug: { like: SLUG_PREFIX } },
    limit: 100,
    overrideAccess: true,
  })
  for (const t of tenants.docs) {
    for (const collection of ['properties', 'posts', 'services', 'site-settings', 'media'] as const) {
      await payload.delete({ collection, where: { tenant: { equals: t.id } }, overrideAccess: true })
    }
    await payload.delete({ collection: 'users', where: { 'tenants.tenant': { equals: t.id } }, overrideAccess: true })
    await payload.delete({ collection: 'tenants', id: t.id, overrideAccess: true })
  }
}

const settingsOf = async (tenantId: number | string) =>
  (
    await payload.find({
      collection: 'site-settings',
      where: { tenant: { equals: tenantId } },
      overrideAccess: true,
      depth: 0,
    })
  ).docs

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  // A stand-in for the client site: records revalidate pings and answers
  // slowly, so a seed that exits without waiting would be caught.
  site = createServer((req, res) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      setTimeout(() => {
        received.push({ body, secret: req.headers['x-revalidate-secret'] as string | undefined })
        res.writeHead(200, { 'content-type': 'application/json' }).end('{"revalidated":true}')
      }, 200)
    })
  })
  await new Promise<void>((r) => site.listen(0, '127.0.0.1', r))
  siteUrl = `http://127.0.0.1:${(site.address() as AddressInfo).port}`
  await cleanup()
})

afterAll(async () => {
  // Leave nothing behind: the isolation suite later wipes tenants wholesale.
  await cleanup()
  await new Promise((r) => site.close(r))
})

describe('starter copy', () => {
  it.each(TONES)('the %s default is valid', (tone) => {
    expect(() => defaultStarterCopy(tone)).not.toThrow()
  })

  it('rejects numbers in stats (no invented facts)', () => {
    const copy = defaultStarterCopy('formal')
    copy.stats[0] = { value: '12 let', label: 'na realitním trhu' }
    const r = starterCopySchema.safeParse(copy)
    expect(r.success).toBe(false)
    expect(r.error!.issues[0]!.path).toEqual(['stats', 0])
  })

  it('rejects numbers anywhere outside posts and legal', () => {
    const about = defaultStarterCopy('formal')
    about.about.paragraphs[0] = 'Od roku 2010 prodáváme byty a domy.'
    const a = starterCopySchema.safeParse(about)
    expect(a.success).toBe(false)
    expect(a.error!.issues.map((i) => i.path.join('.'))).toContain('about.paragraphs.0')
    expect(a.error!.issues[0]!.message).toMatch(/No numbers outside posts\/legal/)

    const hours = defaultStarterCopy('friendly')
    hours.contact.officeHours = 'Po–Pá 9–17'
    const h = starterCopySchema.safeParse(hours)
    expect(h.error!.issues.map((i) => i.path.join('.'))).toEqual(['contact.officeHours'])

    // Tokens are not digits, and posts/legal are exempt.
    const ok = defaultStarterCopy('neutral')
    ok.contact.officeHours = `${'[DOPLNIT]'} volejte na {phone}`
    ok.posts[0]!.body[0] = 'Průkaz energetické náročnosti platí 10 let.'
    ok.legal.privacyPolicy[1] = 'Údaje uchováváme nejdéle 12 měsíců.'
    expect(starterCopySchema.safeParse(ok).success).toBe(true)
  })

  it('rejects a bio without [DOPLNIT]', () => {
    const copy = defaultStarterCopy('neutral')
    copy.agent.bio = ['Na realitním trhu působím od roku 2014.']
    expect(starterCopySchema.safeParse(copy).success).toBe(false)
  })

  it('rejects legal text that is not marked as a draft', () => {
    const copy = defaultStarterCopy('neutral')
    copy.legal.cookieNotice = ['Tento web používá pouze technicky nezbytné cookies.']
    const r = starterCopySchema.safeParse(copy)
    expect(r.error!.issues.map((i) => i.path.join('.'))).toContain('legal.cookieNotice.0')
  })

  it('rejects tykání', () => {
    const copy = defaultStarterCopy('friendly')
    copy.hero.ctaLabel = 'Ozvi se nám'
    copy.about.paragraphs = ['Hledáš nové bydlení? Tvůj makléř pomůže.']
    const r = starterCopySchema.safeParse(copy)
    expect(r.error!.issues.map((i) => i.message).join(' ')).toMatch(/tykání/)
    expect(r.error!.issues).toHaveLength(2)
  })

  it('rejects unknown tokens and unknown keys', () => {
    const copy = defaultStarterCopy('formal') as Record<string, unknown> & StarterCopy
    copy.hero.headline = 'Reality {mesto}'
    expect(starterCopySchema.safeParse(copy).success).toBe(false)
    expect(starterCopySchema.safeParse({ ...defaultStarterCopy('formal'), extra: 1 }).success).toBe(false)
  })

  it('picks the feminine job title for a Czech female surname', () => {
    expect(realtorTitle('Jana Králová')).toBe('Realitní makléřka')
    expect(realtorTitle('Petra Malá')).toBe('Realitní makléřka')
    expect(realtorTitle('Jan Novák')).toBe('Realitní makléř')
  })
})

describe('input from env', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cw2-seed-'))
  const reqPath = join(dir, 'provisioning-request.json')
  const jsonPath = join(dir, 'provisioning.json')
  writeFileSync(reqPath, JSON.stringify(request({ slug: 'svoboda-reality' })))
  writeFileSync(jsonPath, JSON.stringify(PROVISIONING))
  const base = { SITE_URL: 'http://localhost:3111', REVALIDATE_SECRET: 's' }

  it('reads the envelope', () => {
    const i = clientSiteInputFromEnv({ ...base, PROVISIONING_REQUEST: reqPath })
    expect(i.request.slug).toBe('svoboda-reality')
    expect(i.copy.tone).toBe('friendly')
  })

  it('builds the same envelope from a bare provisioning JSON and flags', () => {
    const i = clientSiteInputFromEnv({
      ...base,
      PROVISIONING_JSON: jsonPath,
      TENANT_SLUG: 'svoboda-reality',
      CLIENT_NAME: 'Jana Králová',
      CLIENT_EMAIL: 'jana@kralova-reality.cz',
    })
    expect(i.request.contact.name).toBe('Jana Králová')
    expect(i.request.company).toBeUndefined()
  })

  it('refuses a TENANT_SLUG that disagrees with the envelope', () => {
    expect(() =>
      clientSiteInputFromEnv({ ...base, PROVISIONING_REQUEST: reqPath, TENANT_SLUG: 'other' }),
    ).toThrow(SeedInputError)
  })

  it('names what is missing', () => {
    expect(() => clientSiteInputFromEnv({ ...base })).toThrow(/PROVISIONING_REQUEST/)
    expect(() => clientSiteInputFromEnv({ PROVISIONING_REQUEST: reqPath })).toThrow(/SITE_URL/)
    expect(() =>
      clientSiteInputFromEnv({ ...base, PROVISIONING_JSON: jsonPath, TENANT_SLUG: 'x' }),
    ).toThrow(/CLIENT_NAME/)
  })

  it('reports invalid envelope fields by path', () => {
    const bad = join(dir, 'bad.json')
    writeFileSync(bad, JSON.stringify(request({ slug: 'Bad Slug', contact: { name: 'X', email: 'nope' } })))
    expect(() => clientSiteInputFromEnv({ ...base, PROVISIONING_REQUEST: bad })).toThrow(
      /slug:[\s\S]*contact\.email:/,
    )
  })

  it('refuses starter copy written for a different tone', () => {
    // The envelope asks for "friendly".
    const copyPath = join(dir, 'formal-copy.json')
    writeFileSync(copyPath, JSON.stringify(defaultStarterCopy('formal')))
    expect(() =>
      clientSiteInputFromEnv({ ...base, PROVISIONING_REQUEST: reqPath, STARTER_COPY_JSON: copyPath }),
    ).toThrow(/"formal".*"friendly"/)

    const okPath = join(dir, 'friendly-copy.json')
    writeFileSync(okPath, JSON.stringify(defaultStarterCopy('friendly')))
    expect(
      clientSiteInputFromEnv({ ...base, PROVISIONING_REQUEST: reqPath, STARTER_COPY_JSON: okPath }).copy.tone,
    ).toBe('friendly')
  })

  it('validates a starter copy file', () => {
    const copyPath = join(dir, 'starter-copy.json')
    const copy = defaultStarterCopy('friendly')
    copy.stats[1]!.value = '180+'
    writeFileSync(copyPath, JSON.stringify(copy))
    expect(() =>
      clientSiteInputFromEnv({ ...base, PROVISIONING_REQUEST: reqPath, STARTER_COPY_JSON: copyPath }),
    ).toThrow(/stats\.1/)
  })
})

describe('seedClientSite', { timeout: 90_000 }, () => {
  let tenantId: number | string

  it('seeds the realtor from the request, with placeholders instead of invented facts', async () => {
    received.length = 0
    const s = await seedClientSite(payload, input(request()))
    tenantId = s.tenantId

    expect(s).toMatchObject({ city: 'Brno', listings: 3, services: 3, posts: 2 })

    const tenant = await payload.findByID({ collection: 'tenants', id: tenantId, overrideAccess: true, showHiddenFields: true })
    expect(tenant).toMatchObject({
      name: 'Králová Reality',
      theme: { variant: 'clay' },
      hosting: { platformSubdomain: `${SLUG_PREFIX}kralova.realvista.cz`, siteUrl },
      revalidateSecret: 'test-revalidate-secret',
    })

    const [settings] = await settingsOf(tenantId)
    expect(settings).toBeDefined()
    expect(settings!.agent).toMatchObject({
      name: 'Jana Králová',
      jobTitle: 'Realitní makléřka',
      email: 'jana@kralova-reality.cz',
      phone: '+420 777 123 456',
      licenceNumber: '[DOPLNIT]',
    })
    expect(settings!.contact).toMatchObject({ companyName: 'Králová Reality s.r.o.', ico: '12345678' })
    expect(settings!.hero!.subheadline).toBe('Bydlení v Brně s klidem')
    expect(settings!.hero!.headline).toContain('Brno a okolí')

    const stats = settings!.stats ?? []
    expect(stats.length).toBeGreaterThan(0)
    for (const st of stats) {
      expect(st.value).toBe('[DOPLNIT]')
      expect(`${st.value} ${st.label}`).not.toMatch(/\d/)
    }
    expect(JSON.stringify(settings!.agent!.bio)).toContain('[DOPLNIT]')
    expect(JSON.stringify(settings!.legal!.privacyPolicy)).toContain('[NÁVRH – před spuštěním nahradit]')
    expect(JSON.stringify(settings!.legal!.privacyPolicy)).toContain('Králová Reality s.r.o., IČO 12345678')
    expect(JSON.stringify(settings!.legal!.cookieNotice)).toContain('[NÁVRH')
    // "s.r.o." must not end a sentence and become "s.r.o.."
    expect(JSON.stringify(settings!.legal)).not.toMatch(/\.\./)

    // Client #1's facts must not leak into anyone else's site.
    const everything = JSON.stringify(settings)
    for (const leaked of ['Novák', 'Plzeň', 'Plzni', 'Americká', '600 000 111', 'novak-test', '2014', '4,9', '180+', '12 let']) {
      expect(everything).not.toContain(leaked)
    }

    expect(s.todos.doplnit).toEqual(expect.arrayContaining(['stats', 'agent.bio', 'agent.licenceNumber', 'contact.address', 'contact.officeHours']))
    expect(s.todos.navrh).toEqual(['legal.privacyPolicy', 'legal.cookieNotice'])
  })

  it('places three "Ukázka" listings in the company city', async () => {
    const props = await payload.find({
      collection: 'properties',
      where: { tenant: { equals: tenantId } },
      overrideAccess: true,
      depth: 0,
    })
    expect(props.docs).toHaveLength(3)
    for (const p of props.docs) {
      expect(p.title).toMatch(/^Ukázka – .*, Brno$/)
      expect(p.status).toBe('active')
      expect(p.address).toMatchObject({ city: 'Brno', region: 'jihomoravsky', hideExactAddress: true })
      expect(p.gallery).toHaveLength(3)
    }
    const posts = await payload.find({ collection: 'posts', where: { tenant: { equals: tenantId } }, overrideAccess: true })
    for (const p of posts.docs) expect(p.title).toMatch(/^Ukázka – /)
  })

  it('waits for every revalidate ping before returning', async () => {
    // The site answers each ping after 200 ms; every one must have landed.
    expect(received.length).toBeGreaterThan(0)
    expect(received.every((r) => r.secret === 'test-revalidate-secret')).toBe(true)
    const collections = new Set(received.map((r) => (JSON.parse(r.body) as { collection: string }).collection))
    expect(collections).toEqual(new Set(['media', 'site-settings', 'services', 'posts', 'properties']))
  })

  it('re-runs as an upsert: one tenant, content replaced, users untouched', async () => {
    const realtor = await payload.create({
      collection: 'users',
      data: {
        email: 'realtor-rerun@cw2.test',
        password: 'x-not-a-real-password-1',
        platformRole: 'client',
        tenants: [{ tenant: tenantId, role: 'owner' }],
      } as never,
      overrideAccess: true,
    })

    received.length = 0
    const s = await seedClientSite(payload, input(request()))
    expect(s.tenantId).toBe(tenantId)
    expect(s.pings).toMatchObject({ pending: 0, failed: 0 })
    expect(received.length).toBe(s.pings.sent)

    const tenants = await payload.find({ collection: 'tenants', where: { slug: { equals: `${SLUG_PREFIX}kralova` } }, overrideAccess: true })
    expect(tenants.totalDocs).toBe(1)
    expect(await settingsOf(tenantId)).toHaveLength(1)
    const props = await payload.count({ collection: 'properties', where: { tenant: { equals: tenantId } }, overrideAccess: true })
    expect(props.totalDocs).toBe(3)
    const still = await payload.findByID({ collection: 'users', id: realtor.id, overrideAccess: true })
    expect(still.email).toBe('realtor-rerun@cw2.test')
  })

  it('defaults to Praha, drops switched-off modules, and keeps placeholders without a phone', async () => {
    const req = request({
      slug: `${SLUG_PREFIX}bez-mesta`,
      contact: { name: 'Petr Dvořák', email: 'petr@example.cz' },
      company: undefined,
    })
    req.provisioning.modules.blog = false
    req.provisioning.modules.services = false
    req.provisioning.content.tone = 'formal'
    delete (req.provisioning.brand as { tagline?: string }).tagline

    const s = await seedClientSite(payload, input(req))
    expect(s).toMatchObject({ city: 'Praha', services: 0, posts: 0, listings: 3 })

    const [settings] = await settingsOf(s.tenantId)
    expect(settings!.agent).toMatchObject({ name: 'Petr Dvořák', jobTitle: 'Realitní makléř', phone: '[DOPLNIT]' })
    expect(settings!.contact!.companyName).toBe('Králová Reality')
    expect(settings!.contact!.address).toBe('[DOPLNIT] adresa kanceláře')
    expect(settings!.hero!.subheadline).toBe(defaultStarterCopy('formal').hero.subheadline)

    const props = await payload.find({ collection: 'properties', where: { tenant: { equals: s.tenantId } }, overrideAccess: true, depth: 0 })
    expect(props.docs.map((p) => p.address.city)).toEqual(['Praha', 'Praha', 'Praha'])
    expect(props.docs[0]!.address.region).toBe('praha')
  })

  it('an unknown city gets no guessed region or map pin', async () => {
    expect(placeOf('Plzeň')?.region).toBe('plzensky')
    expect(placeOf('  ceske   BUDEJOVICE ')?.region).toBe('jihocesky')
    expect(placeOf('Horní Dolní')).toBeUndefined()
  })
})

describe('realvista-template.json (M4)', () => {
  const manifest = JSON.parse(readFileSync('realvista-template.json', 'utf8')) as {
    template: string
    templateApiVersion: number
    scripts: string[]
    contracts: Record<string, unknown>
  }
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> }

  it('declares the template and every script exists', () => {
    expect(manifest.template).toBe('realvista-client-backend')
    expect(manifest.templateApiVersion).toBe(1)
    for (const s of manifest.scripts) {
      expect(pkg.scripts[s], s).toBeDefined()
      expect(manifest.contracts[s], s).toBeDefined()
    }
  })

  it('dev and start take the port from PORT', () => {
    expect(pkg.scripts.dev).toContain('--port ${PORT:-3000}')
    expect(pkg.scripts.start).toContain('--port ${PORT:-3000}')
  })
})
