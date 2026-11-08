import { mkdtempSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'

import config from '@/payload.config'
import { mintSiteKey, parseSiteKeyEnv, SiteKeyError, writeSecretFile, writeSiteKeyFile } from '@/seed/siteKey'

/** M3: `seed:site-key` needs an explicit probe URL and can keep the key off stdout. */

const SLUG = 'cw2t-key'
let payload: Payload
let tenantId: number | string
// Stands in for the running backend: answers like it does without a key.
let backend: Server
let probeUrl: string
let deadUrl: string

async function cleanup() {
  await payload.delete({ collection: 'users', where: { email: { equals: `site+${SLUG}@makleri.internal` } }, overrideAccess: true })
  await payload.delete({ collection: 'tenants', where: { slug: { equals: SLUG } }, overrideAccess: true })
}

const authAs = async (apiKey: string) =>
  (await payload.auth({ headers: new Headers({ Authorization: `users API-Key ${apiKey}` }) })).user

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await cleanup()
  tenantId = (await payload.create({ collection: 'tenants', data: { name: 'CW2 Key', slug: SLUG } as never, overrideAccess: true })).id

  backend = createServer((_req, res) => res.writeHead(403).end())
  await new Promise<void>((r) => backend.listen(0, '127.0.0.1', r))
  probeUrl = `http://127.0.0.1:${(backend.address() as AddressInfo).port}`
  // A port that was free a moment ago and has nothing listening now.
  const tmp = createServer()
  await new Promise<void>((r) => tmp.listen(0, '127.0.0.1', r))
  deadUrl = `http://127.0.0.1:${(tmp.address() as AddressInfo).port}`
  await new Promise((r) => tmp.close(r))
})

afterAll(async () => {
  await cleanup()
  await new Promise((r) => backend.close(r))
})

describe('parseSiteKeyEnv', () => {
  it('requires CMS_PROBE_URL instead of silently probing :3000', () => {
    expect(() => parseSiteKeyEnv({ TENANT_SLUG: 'x' })).toThrow(/CMS_PROBE_URL/)
    expect(() => parseSiteKeyEnv({ TENANT_SLUG: 'x', CMS_PROBE_URL: 'localhost:3211' })).toThrow(SiteKeyError)
    expect(() => parseSiteKeyEnv({ CMS_PROBE_URL: 'http://localhost:3211' })).toThrow(/TENANT_SLUG/)
  })

  it('normalises the URL and resolves SITE_KEY_OUT to an absolute path', () => {
    const e = parseSiteKeyEnv({ TENANT_SLUG: 'x', CMS_PROBE_URL: 'http://localhost:3211/', SITE_KEY_OUT: 'key.env' })
    expect(e.probeUrl).toBe('http://localhost:3211')
    expect(e.out).toBe(join(process.cwd(), 'key.env'))
    expect(parseSiteKeyEnv({ TENANT_SLUG: 'x', CMS_PROBE_URL: 'http://a.b' }).out).toBeUndefined()
  })
})

describe('writeSecretFile', () => {
  it('writes atomically with mode 0600 and replaces an existing file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cw2-key-'))
    const path = join(dir, 'site-key.env')
    writeFileSync(path, 'old', { mode: 0o644 })
    writeSecretFile(path, 'CMS_API_KEY=abc\n')
    expect(readFileSync(path, 'utf8')).toBe('CMS_API_KEY=abc\n')
    expect(statSync(path).mode & 0o777).toBe(0o600)
    expect(readdirSync(dir)).toEqual(['site-key.env'])
  })

  it('refuses a relative path', () => {
    expect(() => writeSecretFile('relative.env', 'x')).toThrow(SiteKeyError)
  })
})

describe('SITE_KEY_OUT', () => {
  it('accepts a path relative to the cwd and writes only the key, mode 0600', () => {
    // The production plan runs `SITE_KEY_OUT=.env.site-key.production.local
    // pnpm seed:site-key` from the backend directory.
    const backendDir = mkdtempSync(join(tmpdir(), 'cw2-backend-'))
    const cwd = process.cwd()
    process.chdir(backendDir)
    try {
      const env = parseSiteKeyEnv({
        TENANT_SLUG: SLUG,
        CMS_PROBE_URL: 'http://localhost:4120',
        SITE_KEY_OUT: '.env.site-key.production.local',
      })
      const expected = join(realpathSync(backendDir), '.env.site-key.production.local')
      expect(realpathSync(dirname(env.out!))).toBe(dirname(expected))

      const key = '3f1c2a9e-0b7d-4e5f-8a6b-1c2d3e4f5a6b'
      writeSiteKeyFile(env.out!, key)
      const raw = readFileSync(expected)
      expect(raw.toString('utf8')).toBe(key)
      expect(raw.length).toBe(key.length)
      expect(statSync(expected).mode & 0o777).toBe(0o600)
      expect(readdirSync(backendDir)).toEqual(['.env.site-key.production.local'])
    } finally {
      process.chdir(cwd)
    }
  })

  it('stays key-only and 0600 when it replaces an older file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cw2-backend-'))
    const path = join(dir, '.env.site-key.production.local')
    writeFileSync(path, 'CMS_API_KEY=old-key\n', { mode: 0o644 })
    writeSiteKeyFile(path, 'new-key')
    expect(readFileSync(path, 'utf8')).toBe('new-key')
    expect(statSync(path).mode & 0o777).toBe(0o600)
  })
})

describe('mintSiteKey', () => {
  it('mints a key that authenticates as a tenant editor, and a re-mint revokes the old one', async () => {
    const first = await mintSiteKey(payload, SLUG, probeUrl)
    expect(first.tenantId).toBe(tenantId)
    const u1 = await authAs(first.apiKey)
    expect(u1?.email).toBe(`site+${SLUG}@makleri.internal`)

    const second = await mintSiteKey(payload, SLUG, probeUrl)
    expect(second.apiKey).not.toBe(first.apiKey)
    expect((await authAs(second.apiKey))?.id).toBe(second.userId)
    expect(await authAs(first.apiKey)).toBeNull()

    const accounts = await payload.count({ collection: 'users', where: { email: { equals: `site+${SLUG}@makleri.internal` } }, overrideAccess: true })
    expect(accounts.totalDocs).toBe(1)
  })

  it('keeps the old key when nothing answers at the probe URL', async () => {
    const current = await mintSiteKey(payload, SLUG, probeUrl)
    await expect(mintSiteKey(payload, SLUG, deadUrl)).rejects.toThrow(/Nothing answers.*left in place/)
    expect((await authAs(current.apiKey))?.id).toBe(current.userId)
  })

  it('names an unknown tenant', async () => {
    await expect(mintSiteKey(payload, 'cw2t-nope', probeUrl)).rejects.toThrow(/cw2t-nope/)
  })
})
