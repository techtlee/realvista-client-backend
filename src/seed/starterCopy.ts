import { z } from 'zod'

/**
 * Starter copy: the Czech text a new client's site launches with, before the
 * realtor writes their own.
 *
 * It is a separate, validated document (not strings inside the seed script) so
 * that `/create-website` can write the tone default to
 * `clients/<slug>/starter-copy.json`, let Claude personalise it, and check the
 * result with the same schema the seed applies (`cw copy validate`).
 *
 * Rules the schema enforces, each because getting it wrong is a real-client
 * problem rather than a style nit:
 *
 * - **No invented facts.** Client #1's prototype shipped "12 let", "180+
 *   prodaných", "4,9 / 5" and "od roku 2014". For anyone else those are claims
 *   the realtor never made. Stats therefore carry no digits at all, and the
 *   bio must keep a visible `[DOPLNIT]` until the realtor writes it.
 * - **Legal stays a draft.** Privacy and cookie texts must keep
 *   `[NÁVRH – před spuštěním nahradit]` so nobody mistakes them for reviewed text.
 * - **Vykání.** Czech realty copy addresses the reader formally in every tone;
 *   the tone changes the voice, not the grammatical person.
 * - **Facts come from the request, not the copy.** Names, e-mail, city and
 *   company are `{tokens}` filled in by the seed from the provisioning request,
 *   so personalised copy cannot drift from the CRM's data. City names are only
 *   ever used in the nominative ("Brno a okolí"), because declining an
 *   arbitrary Czech place name ("v Plzni", "v Brně") cannot be done reliably.
 */

export const DOPLNIT = '[DOPLNIT]'
export const NAVRH = '[NÁVRH – před spuštěním nahradit]'

/** Tokens the seed replaces. Anything else in `{braces}` is a validation error. */
export const STARTER_COPY_TOKENS = [
  'brand',
  'city',
  'company',
  'agentName',
  'agentTitle',
  'email',
  'phone',
] as const
export type StarterCopyToken = (typeof STARTER_COPY_TOKENS)[number]
export type StarterCopyTokens = Record<StarterCopyToken, string>

export const TONES = ['formal', 'friendly', 'neutral'] as const
export type Tone = (typeof TONES)[number]

export const SERVICE_ICONS = [
  'home',
  'key',
  'chart',
  'calculator',
  'document',
  'shield',
  'handshake',
  'camera',
] as const
export const POST_CATEGORIES = ['trh', 'rady', 'financovani', 'pravo', 'novinky'] as const

/**
 * Second-person singular (tykání) forms that should never reach a realtor's
 * site. Not exhaustive Czech morphology; it catches the forms copywriting
 * actually produces.
 */
const TYKANI = [
  'tvůj',
  'tvoje',
  'tvoji',
  'tvá',
  'tvé',
  'tvého',
  'tvému',
  'tvým',
  'tvých',
  'tobě',
  'tebe',
  'tebou',
  'máš',
  'chceš',
  'můžeš',
  'potřebuješ',
  'hledáš',
  'prodáváš',
  'kupuješ',
  'jsi',
  'napiš',
  'zavolej',
  'kontaktuj',
  'ozvi',
  'podívej',
  'neváhej',
]
const TYKANI_RE = new RegExp(`(?<!\\p{L})(${TYKANI.join('|')})(?!\\p{L})`, 'iu')
const TOKEN_RE = /\{([A-Za-z]+)\}/g

const text = (max: number) => z.string().trim().min(1).max(max)
const paragraphs = z.array(text(1200)).min(1).max(8)

export const starterCopySchema = z
  .strictObject({
    copyVersion: z.literal(1),
    tone: z.enum(TONES),
    hero: z.strictObject({
      headline: text(140),
      /** Used only when the provisioning request has no `brand.tagline`. */
      subheadline: text(300),
      ctaLabel: text(40),
    }),
    about: z.strictObject({ heading: text(80), paragraphs }),
    agent: z.strictObject({
      jobTitle: text(80),
      bio: paragraphs,
    }),
    stats: z
      .array(z.strictObject({ value: text(30), label: text(60) }))
      .max(4)
      .superRefine((stats, ctx) => {
        stats.forEach((s, i) => {
          if (/\d/.test(s.value) || /\d/.test(s.label)) {
            ctx.addIssue({
              code: 'custom',
              path: [i],
              message: `Stats must not contain numbers (no invented facts); use "${DOPLNIT}" and let the realtor fill it in.`,
            })
          }
        })
      }),
    services: z
      .array(
        z.strictObject({
          title: text(80),
          icon: z.enum(SERVICE_ICONS),
          description: text(300),
        }),
      )
      .max(8),
    posts: z
      .array(
        z.strictObject({
          title: text(140),
          category: z.enum(POST_CATEGORIES),
          excerpt: text(300),
          body: paragraphs,
        }),
      )
      .max(6),
    contact: z.strictObject({ officeHours: text(200) }),
    legal: z.strictObject({
      privacyPolicy: paragraphs,
      cookieNotice: paragraphs,
      gdprConsentText: text(400),
    }),
  })
  .superRefine((copy, ctx) => {
    if (!copy.agent.bio.some((p) => p.includes(DOPLNIT))) {
      ctx.addIssue({
        code: 'custom',
        path: ['agent', 'bio'],
        message: `The bio must keep a visible "${DOPLNIT}" until the realtor writes it (no invented facts).`,
      })
    }
    for (const key of ['privacyPolicy', 'cookieNotice'] as const) {
      if (!copy.legal[key][0]?.startsWith(NAVRH)) {
        ctx.addIssue({
          code: 'custom',
          path: ['legal', key, 0],
          message: `Legal text must start with "${NAVRH}".`,
        })
      }
    }
    for (const { path, value } of strings(copy)) {
      const ty = TYKANI_RE.exec(value)
      if (ty) {
        ctx.addIssue({
          code: 'custom',
          path,
          message: `Uses tykání ("${ty[1]}"); REALVISTA copy always uses vykání.`,
        })
      }
      for (const [, name] of value.matchAll(TOKEN_RE)) {
        if (!(STARTER_COPY_TOKENS as readonly string[]).includes(name!)) {
          ctx.addIssue({
            code: 'custom',
            path,
            message: `Unknown token {${name}}. Allowed: ${STARTER_COPY_TOKENS.map((t) => `{${t}}`).join(', ')}.`,
          })
        }
      }
    }
  })

export type StarterCopy = z.output<typeof starterCopySchema>

function* strings(value: unknown, path: (string | number)[] = []): Generator<{ path: (string | number)[]; value: string }> {
  if (typeof value === 'string') yield { path, value }
  else if (Array.isArray(value)) for (const [i, v] of value.entries()) yield* strings(v, [...path, i])
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) yield* strings(v, [...path, k])
}

/** Replace `{tokens}` everywhere in the copy. Unknown tokens were rejected by the schema. */
export function renderStarterCopy(copy: StarterCopy, tokens: StarterCopyTokens): StarterCopy {
  const fill = (v: unknown): unknown => {
    if (typeof v === 'string') return v.replace(TOKEN_RE, (_, name: StarterCopyToken) => tokens[name] ?? `{${name}}`)
    if (Array.isArray(v)) return v.map(fill)
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)]))
    return v
  }
  return fill(copy) as StarterCopy
}

/**
 * "Realitní makléřka" for a woman's name, else "Realitní makléř".
 *
 * Czech female surnames end in -ová or -á almost without exception; a wrong
 * guess is a visible title the realtor corrects in the admin, while always
 * using the masculine form would be wrong for half the clients.
 */
export function realtorTitle(contactName: string): string {
  const surname = contactName.trim().split(/\s+/).pop() ?? ''
  return /(ová|á)$/i.test(surname) ? 'Realitní makléřka' : 'Realitní makléř'
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const SHARED = {
  copyVersion: 1 as const,
  agent: {
    jobTitle: '{agentTitle}',
    bio: [
      `${DOPLNIT} Představte se svými slovy: jak dlouho se realitám věnujete, na jaké nemovitosti ` +
        'a lokality se specializujete a s čím klientům pomáháte.',
    ],
  },
  // No numbers: the realtor supplies real ones or deletes the strip.
  stats: [
    { value: DOPLNIT, label: 'let na realitním trhu' },
    { value: DOPLNIT, label: 'prodaných nemovitostí' },
    { value: DOPLNIT, label: 'spokojených klientů' },
  ],
  contact: { officeHours: `${DOPLNIT} otevírací doba, např. dny a hodiny, kdy jste k zastižení` },
  legal: {
    privacyPolicy: [
      `${NAVRH} Správcem osobních údajů je {company} (dále jen „správce“). Osobní údaje z kontaktního formuláře ` +
        'zpracováváme pouze za účelem vyřízení Vaší poptávky a nepředáváme je třetím stranám ' +
        'bez Vašeho souhlasu.',
      'Máte právo na přístup ke svým údajům, jejich opravu, výmaz a vznesení námitky. ' +
        'Kontaktujte nás na {email}.',
    ],
    cookieNotice: [
      `${NAVRH} Tento web používá pouze technicky nezbytné cookies. ` +
        'Analytické ani marketingové cookies nepoužíváme.',
    ],
    gdprConsentText:
      'Odesláním formuláře souhlasím se zpracováním osobních údajů za účelem vyřízení mé poptávky.',
  },
}

/** Evergreen advice; nothing about a specific market, client or number. */
const POSTS: StarterCopy['posts'] = [
  {
    title: 'Ukázka – Jak se připravit na prodej bytu',
    category: 'rady',
    excerpt: 'Dokumenty, které budete potřebovat, a kroky, které prodej usnadní.',
    body: [
      'Před zahájením inzerce si připravte průkaz energetické náročnosti budovy, výpis z katastru ' +
        'nemovitostí a potvrzení o bezdlužnosti od společenství vlastníků.',
      `${DOPLNIT} Toto je ukázkový článek. Před spuštěním webu ho nahraďte vlastním nebo smažte.`,
    ],
  },
  {
    title: 'Ukázka – Na co se zeptat při prohlídce nemovitosti',
    category: 'rady',
    excerpt: 'Otázky, které se vyplatí položit dřív, než podepíšete rezervační smlouvu.',
    body: [
      'Zeptejte se na výši záloh za služby, stav společných prostor, plánované opravy domu ' +
        'a na to, co přesně je součástí prodeje.',
      `${DOPLNIT} Toto je ukázkový článek. Před spuštěním webu ho nahraďte vlastním nebo smažte.`,
    ],
  },
]

const SERVICES: StarterCopy['services'] = [
  {
    title: 'Prodej nemovitostí',
    icon: 'home',
    description: 'Prezentace nemovitosti, prohlídky se zájemci a doprovod až po předání.',
  },
  {
    title: 'Pronájem',
    icon: 'key',
    description: 'Hledání nájemníků, nájemní smlouva a předávací protokol.',
  },
  {
    title: 'Ocenění nemovitosti',
    icon: 'chart',
    description: 'Odhad tržní ceny jako výchozí bod pro prodej nebo pronájem.',
  },
]

const BY_TONE: Record<Tone, Pick<StarterCopy, 'hero' | 'about'>> = {
  formal: {
    hero: {
      headline: 'Prodej a pronájem nemovitostí – {city} a okolí',
      subheadline: 'Spolehlivé zastoupení při prodeji, koupi i pronájmu nemovitosti.',
      ctaLabel: 'Domluvit konzultaci',
    },
    about: {
      heading: 'Naše realitní kancelář',
      paragraphs: [
        '{brand} zajišťuje prodej a pronájem bytů, rodinných domů a pozemků. ' +
          'Každou zakázku vedeme osobně a průběžně Vás informujeme o jejím postupu.',
      ],
    },
  },
  friendly: {
    hero: {
      headline: 'Pomůžeme Vám s prodejem i koupí bydlení – {city} a okolí',
      subheadline: 'Celým procesem Vás provedeme od prvního setkání až po předání klíčů.',
      ctaLabel: 'Ozvěte se nám',
    },
    about: {
      heading: 'Kdo jsme',
      paragraphs: [
        'Jsme {brand}. Prodáváme a pronajímáme byty, domy i pozemky a na každou otázku ' +
          'Vám rádi odpovíme.',
      ],
    },
  },
  neutral: {
    hero: {
      headline: 'Prodej a pronájem nemovitostí – {city} a okolí',
      subheadline: 'Prodej, pronájem a ocenění nemovitostí.',
      ctaLabel: 'Kontaktujte nás',
    },
    about: {
      heading: 'O nás',
      paragraphs: ['{brand}: prodej a pronájem bytů, domů a pozemků.'],
    },
  },
}

/** The tone default `cw copy init` writes and the seed uses when no copy file is given. */
export function defaultStarterCopy(tone: Tone): StarterCopy {
  return starterCopySchema.parse(
    structuredClone({ ...SHARED, tone, ...BY_TONE[tone], services: SERVICES, posts: POSTS }),
  )
}
