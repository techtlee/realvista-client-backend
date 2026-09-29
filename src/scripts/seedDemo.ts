// Must be first — payload.config reads env at module evaluation time.
import 'dotenv/config'

import { getPayload } from 'payload'
import sharp from 'sharp'

import config from '../payload.config'

/**
 * Seeds a browsable demo tenant.
 *
 * Exists so the whole pipeline — CMS → site → live page — can be seen working
 * before a real client is onboarded, and so theme work has realistic Czech
 * content to render instead of lorem ipsum. Re-running replaces the demo
 * tenant; it never touches any other tenant's data.
 *
 *   pnpm seed:demo
 */

const SLUG = 'demo-reality'

/** Placeholder photography: a tinted gradient with a caption baked in. */
async function placeholder(label: string, hue: number): Promise<Buffer> {
  const w = 1600
  const h = 1067

  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(${hue} 22% 34%)"/>
        <stop offset="100%" stop-color="hsl(${(hue + 40) % 360} 18% 62%)"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
          font-family="Helvetica, Arial, sans-serif" font-size="46"
          fill="rgba(255,255,255,0.82)" letter-spacing="1">${label}</text>
  </svg>`

  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer()
}

/** Payload stores rich text as a Lexical tree; this is the minimal valid shape. */
function lexical(text: string) {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr',
          children: [{ type: 'text', text, version: 1, format: 0 }],
        },
      ],
    },
  }
}

interface Listing {
  title: string
  transactionType: 'prodej' | 'pronajem'
  propertyType: 'byt' | 'dum' | 'pozemek'
  disposition?: string
  price: number
  usableArea: number
  city: string
  cityPart?: string
  region: string
  penb: string
  condition: string
  ownership: string
  features: string[]
  featured?: boolean
  description: string
  hue: number
}

const LISTINGS: Listing[] = [
  {
    title: 'Prodej bytu 3+kk, 78 m², Praha 6 — Dejvice',
    transactionType: 'prodej',
    propertyType: 'byt',
    disposition: '3-kk',
    price: 8_490_000,
    usableArea: 78,
    city: 'Praha',
    cityPart: 'Dejvice',
    region: 'praha',
    penb: 'C',
    condition: 'po-rekonstrukci',
    ownership: 'osobni',
    features: ['balkon', 'sklep', 'vytah', 'mhd-v-dosahu'],
    featured: true,
    description:
      'Světlý byt 3+kk po kompletní rekonstrukci v klidné části Dejvic. ' +
      'Orientace na jihozápad, balkon s výhledem do vnitrobloku, sklep. ' +
      'V docházkové vzdálenosti metro A, parky a občanská vybavenost.',
    hue: 210,
  },
  {
    title: 'Prodej rodinného domu 5+1, 182 m², Brno — Žabovřesky',
    transactionType: 'prodej',
    propertyType: 'dum',
    disposition: '5-1',
    price: 12_900_000,
    usableArea: 182,
    city: 'Brno',
    cityPart: 'Žabovřesky',
    region: 'jihomoravsky',
    penb: 'D',
    condition: 'dobry',
    ownership: 'osobni',
    features: ['zahrada', 'garaz', 'terasa', 'krb'],
    featured: true,
    description:
      'Prostorný rodinný dům se zahradou 420 m² a dvougaráží. ' +
      'Dvě podlaží, klidná ulice, výborná dostupnost do centra.',
    hue: 30,
  },
  {
    title: 'Pronájem bytu 2+kk, 54 m², Praha 8 — Karlín',
    transactionType: 'pronajem',
    propertyType: 'byt',
    disposition: '2-kk',
    price: 24_500,
    usableArea: 54,
    city: 'Praha',
    cityPart: 'Karlín',
    region: 'praha',
    penb: 'B',
    condition: 'novostavba',
    ownership: 'osobni',
    features: ['lodzie', 'vytah', 'parkovani', 'vybaveno'],
    featured: true,
    description:
      'Zařízený byt v novostavbě s lodžií a parkovacím stáním v garáži. ' +
      'Ihned k nastěhování.',
    hue: 160,
  },
  {
    title: 'Prodej bytu 1+kk, 32 m², Plzeň — Bory',
    transactionType: 'prodej',
    propertyType: 'byt',
    disposition: '1-kk',
    price: 2_950_000,
    usableArea: 32,
    city: 'Plzeň',
    cityPart: 'Bory',
    region: 'plzensky',
    penb: 'E',
    condition: 'dobry',
    ownership: 'druzstevni',
    features: ['sklep', 'mhd-v-dosahu'],
    description:
      'Kompaktní byt v cihlovém domě, vhodný jako investice nebo startovací bydlení.',
    hue: 280,
  },
  {
    title: 'Prodej bytu 4+1, 96 m², Ostrava — Poruba',
    transactionType: 'prodej',
    propertyType: 'byt',
    disposition: '4-1',
    price: 4_190_000,
    usableArea: 96,
    city: 'Ostrava',
    cityPart: 'Poruba',
    region: 'moravskoslezsky',
    penb: 'D',
    condition: 'pred-rekonstrukci',
    ownership: 'osobni',
    features: ['balkon', 'sklep', 'vytah'],
    description:
      'Prostorný byt s dispozicí 4+1 před rekonstrukcí. Velký potenciál, klidná lokalita.',
    hue: 340,
  },
  {
    title: 'Prodej pozemku 1 240 m², Říčany u Prahy',
    transactionType: 'prodej',
    propertyType: 'pozemek',
    price: 5_600_000,
    usableArea: 1240,
    city: 'Říčany',
    region: 'stredocesky',
    penb: 'EXEMPT',
    condition: 'dobry',
    ownership: 'osobni',
    features: [],
    description:
      'Stavební pozemek se všemi sítěmi na hranici, územním plánem určený k bydlení.',
    hue: 100,
  },
]

const POSTS = [
  {
    title: 'Jak správně určit cenu nemovitosti?',
    category: 'rady',
    excerpt:
      'Správné nastavení tržní ceny je klíčem k úspěchu. Přečtěte si, jaké faktory ' +
      'analyzuji a proč se nespoléhat jen na inzertní ceny.',
    body:
      'Inzertní ceny na realitních portálech nejsou ceny kupní. Rozdíl mezi nimi bývá ' +
      'v Praze pět až deset procent, u hůře prodejných nemovitostí i více. Při odhadu ' +
      'proto vycházím z reálně zrealizovaných obchodů v dané lokalitě, ze stavu ' +
      'nemovitosti a z toho, jak dlouho se srovnatelné nabídky drží na trhu.',
    hue: 24,
  },
  {
    title: 'Kdy se vyplatí prodávat a kdy raději počkat',
    category: 'trh',
    excerpt:
      'Načasování prodeje ovlivní výslednou cenu víc než samotná inzerce. ' +
      'Na co se dívat, než se rozhodnete.',
    body:
      'Sezónnost na českém realitním trhu je slabší, než se obecně tvrdí. Mnohem větší ' +
      'vliv má vývoj hypotečních sazeb a nabídka srovnatelných nemovitostí ve vašem ' +
      'okolí. Pokud v okruhu několika ulic visí pět podobných bytů, vyplatí se počkat.',
    hue: 140,
  },
  {
    title: 'Co všechno potřebujete k prodeji bytu',
    category: 'pravo',
    excerpt:
      'Průkaz energetické náročnosti, prohlášení vlastníka, potvrzení od SVJ. ' +
      'Kompletní seznam dokumentů na jednom místě.',
    body:
      'Nejčastější zdržení při prodeji nevzniká u kupujícího ani u banky, ale ' +
      'u chybějících dokumentů. Průkaz energetické náročnosti budovy je ze zákona ' +
      'povinný už při inzerci, a jeho zpracování trvá zpravidla dva až tři týdny.',
    hue: 44,
  },
]

const SERVICES = [
  {
    title: 'Prodej nemovitostí',
    icon: 'home',
    description: 'Od ocenění přes prezentaci až po předání klíčů. Vše na jednom místě.',
  },
  {
    title: 'Pronájem',
    icon: 'key',
    description: 'Prověření zájemci, smlouva na míru a předávací protokol.',
  },
  {
    title: 'Odhad ceny zdarma',
    icon: 'chart',
    description: 'Znám lokalitu i reálné kupní ceny. Odhad do tří pracovních dnů.',
  },
  {
    title: 'Hypoteční poradenství',
    icon: 'calculator',
    description: 'Spolupracuji s nezávislým poradcem, který porovná nabídky bank.',
  },
]

async function main() {
  const payload = await getPayload({ config: await config })

  // Scoped teardown: only the demo tenant, never anyone else's data.
  const existing = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: SLUG } },
    overrideAccess: true,
  })

  for (const t of existing.docs) {
    for (const collection of ['properties', 'posts', 'services', 'site-settings', 'media'] as const) {
      await payload.delete({
        collection,
        where: { tenant: { equals: t.id } },
        overrideAccess: true,
      })
    }

    /**
     * Users must go before the tenant.
     *
     * The plugin's cleanupAfterTenantDelete removes the tenant from any user
     * that references it by setting users_tenants.tenant_id to NULL — but that
     * column is NOT NULL, so the delete fails on a constraint violation. Any
     * tenant with a site service account hits this.
     *
     * The same ordering applies to real deprovisioning: revoke the service
     * account first, then delete the tenant.
     */
    await payload.delete({
      collection: 'users',
      where: { 'tenants.tenant': { equals: t.id } },
      overrideAccess: true,
    })

    await payload.delete({ collection: 'tenants', id: t.id, overrideAccess: true })
  }

  const tenant = await payload.create({
    collection: 'tenants',
    data: {
      name: 'Demo Reality',
      slug: SLUG,
      status: 'live',
      theme: { name: 'realvista', variant: 'indigo' },
      hosting: { platformSubdomain: 'demo.makleri.cz', siteUrl: 'http://localhost:3001' },
    },
    overrideAccess: true,
  })

  async function upload(name: string, label: string, hue: number) {
    const data = await placeholder(label, hue)
    return payload.create({
      collection: 'media',
      data: { alt: label, tenant: tenant.id },
      file: { name, data, mimetype: 'image/jpeg', size: data.length },
      overrideAccess: true,
    })
  }

  const agentPhoto = await upload('makler.jpg', 'Portrét makléře', 220)
  const heroImage = await upload('hero.jpg', 'Úvodní fotografie', 215)

  await payload.create({
    collection: 'site-settings',
    data: {
      tenant: tenant.id,
      siteName: 'Demo Reality',
      hero: {
        headline: 'Reality nejsou jen nemovitosti. Jsou to vaše další kroky.',
        subheadline:
          'Pomáhám lidem v Praze a okolí prodat i koupit bydlení bez zbytečného stresu.',
        ctaLabel: 'Nezávazná konzultace',
        ctaHref: '#kontakt',
        backgroundImage: heroImage.id,
      },
      about: {
        heading: 'O mně',
        body: undefined,
      },
      stats: [
        { value: '12 let', label: 'na trhu' },
        { value: '450+ mil. Kč', label: 'objem zrealizovaných obchodů' },
        { value: '150+', label: 'spokojených klientů' },
      ],
      agent: {
        name: 'Jan Novák',
        jobTitle: 'Realitní makléř',
        photo: agentPhoto.id,
        phone: '+420 777 123 456',
        email: 'jan.novak@demo-reality.cz',
        licenceNumber: 'RZ 2020/04412',
        certifications: [{ label: 'Člen ARK ČR' }, { label: 'Realitní zkouška dle zák. 39/2020 Sb.' }],
      },
      contact: {
        companyName: 'Demo Reality s.r.o.',
        ico: '12345678',
        dic: 'CZ12345678',
        address: 'Korunní 2569/108\n101 00 Praha 10',
        phone: '+420 777 123 456',
        email: 'info@demo-reality.cz',
        officeHours: 'Po–Pá 9:00–17:00, jinak po domluvě',
      },
      legal: {
        gdprConsentText:
          'Odesláním formuláře souhlasím se zpracováním osobních údajů za účelem ' +
          'vyřízení mé poptávky.',
      },
    },
    overrideAccess: true,
  })

  for (const [i, s] of SERVICES.entries()) {
    await payload.create({
      collection: 'services',
      data: { ...s, tenant: tenant.id, order: i } as never,
      overrideAccess: true,
    })
  }

  for (const [i, post] of POSTS.entries()) {
    const cover = await upload(`blog-${i}.jpg`, post.title, post.hue)
    const published = new Date()
    published.setDate(published.getDate() - i * 11)

    await payload.create({
      collection: 'posts',
      data: {
        tenant: tenant.id,
        title: post.title,
        excerpt: post.excerpt,
        category: post.category,
        coverImage: cover.id,
        publishedAt: published.toISOString(),
        body: lexical(post.body),
      } as never,
      overrideAccess: true,
    })
  }

  for (const l of LISTINGS) {
    const gallery = []
    for (const [i, room] of ['Obývací pokoj', 'Kuchyně', 'Ložnice', 'Koupelna'].entries()) {
      const m = await upload(
        `${l.city.toLowerCase()}-${l.usableArea}-${i}.jpg`,
        room,
        (l.hue + i * 18) % 360,
      )
      gallery.push({ image: m.id, alt: room })
    }

    await payload.create({
      collection: 'properties',
      data: {
        tenant: tenant.id,
        title: l.title,
        status: 'active',
        featured: l.featured ?? false,
        transactionType: l.transactionType,
        propertyType: l.propertyType,
        disposition: l.disposition,
        usableArea: l.usableArea,
        ownership: l.ownership,
        condition: l.condition,
        features: l.features,
        penb: { class: l.penb },
        price: {
          amount: l.price,
          period: l.transactionType === 'pronajem' ? 'mesic' : undefined,
        },
        address: {
          city: l.city,
          cityPart: l.cityPart,
          region: l.region,
        },
        gallery,
        description: lexical(l.description),
      } as never,
      overrideAccess: true,
    })
  }

  console.log(`Demo tenant seeded: ${tenant.name} (id ${tenant.id})`)
  console.log(`  ${LISTINGS.length} listings, ${SERVICES.length} services, ${POSTS.length} posts`)
  process.exit(0)
}

void main()
