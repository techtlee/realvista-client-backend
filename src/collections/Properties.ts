import type { CollectionConfig } from 'payload'

import { tenantAccess, tenantBaseListFilter } from '../access/tenantScoped'
import {
  BUILDING_CONDITIONS,
  BUILDING_TYPES,
  CZ_REGIONS,
  DISPOSITIONS,
  ENERGY_CLASSES,
  HEATING_TYPES,
  LISTING_STATUSES,
  OWNERSHIP_TYPES,
  PROPERTY_FEATURES,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
  slugifyCzech,
} from '../lib/czech'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidateTenantSite'

/**
 * Nemovitosti — the realtor's daily tool.
 *
 * Listings are entered by hand (D2: no XML feed import), so this schema is the
 * product as much as the website is. Two consequences shape it:
 *
 *  - Every field a realtor must fill is a field they might abandon the form
 *    over. Conditional fields hide what does not apply — `disposition` on a
 *    plot of land, rent periods on a sale — so a typical listing shows roughly
 *    half of what is defined here.
 *  - The parts that protect the realtor legally are enforced, not suggested.
 *    See the PENB group.
 */
export const Properties: CollectionConfig = {
  slug: 'properties',
  labels: {
    singular: { cs: 'Nemovitost', en: 'Property' },
    plural: { cs: 'Nemovitosti', en: 'Properties' },
  },
  access: tenantAccess,
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'transactionType', 'disposition', 'price', 'status'],
    listSearchableFields: ['title', 'address.city', 'address.street', 'referenceId'],
    baseListFilter: tenantBaseListFilter,
    group: { cs: 'Obsah', en: 'Content' },
  },
  /**
   * History without a second publish state.
   *
   * `versions: { drafts: true }` adds Payload's own `_status` (draft/published),
   * whose Postgres enum is named `enum_properties_status` — exactly colliding
   * with the enum for the domain `status` field below, which silently replaced
   * the listing statuses with `draft, published`.
   *
   * Beyond the collision, two status concepts is the wrong model here: a realtor
   * should see one dropdown. "Rozpracovaný" already means "not on the site",
   * which is what a draft is, expressed in their own vocabulary. Version history
   * is still kept, so a bad edit can be rolled back.
   */
  versions: true,
  hooks: {
    afterChange: [revalidateAfterChange('properties')],
    afterDelete: [revalidateAfterDelete('properties')],
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        if (!data.slug && typeof data.title === 'string' && data.title.length > 0) {
          data.slug = slugifyCzech(data.title)
        }
        return data
      },
    ],
    beforeChange: [
      ({ data }) => {
        /**
         * A published listing must carry an energy class.
         *
         * Advertising a property without one is an offence under
         * zákon č. 406/2000 Sb., and the fine lands on the realtor, not on us.
         * Blocking at publish rather than at save lets them draft a listing
         * while the certificate is still being issued.
         */
        if (data?.status && data.status !== 'draft' && !data?.penb?.class) {
          throw new Error(
            'Nelze zveřejnit inzerát bez energetické třídy (PENB). ' +
              'Uvedení třídy je při inzerci povinné ze zákona č. 406/2000 Sb. ' +
              'Pokud průkaz zatím nemáte, zvolte „Průkaz se zpracovává“ nebo ponechte inzerát rozpracovaný.',
          )
        }
        return data
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        // ─────────────────────────── Základní ───────────────────────────
        {
          label: { cs: 'Základní údaje', en: 'Basics' },
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
              localized: true,
              label: { cs: 'Název inzerátu', en: 'Title' },
              admin: {
                description: {
                  cs: 'Např. „Prodej bytu 3+kk, 78 m², Praha 6 — Dejvice“',
                },
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'transactionType',
                  type: 'select',
                  required: true,
                  label: { cs: 'Typ nabídky' },
                  options: TRANSACTION_TYPES,
                },
                {
                  name: 'propertyType',
                  type: 'select',
                  required: true,
                  label: { cs: 'Druh nemovitosti' },
                  options: PROPERTY_TYPES,
                },
              ],
            },
            {
              name: 'disposition',
              type: 'select',
              label: { cs: 'Dispozice' },
              options: DISPOSITIONS,
              admin: {
                condition: (data) => ['byt', 'dum'].includes(data?.propertyType),
              },
            },
            {
              name: 'description',
              type: 'richText',
              localized: true,
              label: { cs: 'Popis nemovitosti' },
            },
          ],
        },

        // ─────────────────────────── Parametry ──────────────────────────
        {
          label: { cs: 'Parametry', en: 'Parameters' },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'usableArea',
                  type: 'number',
                  min: 0,
                  label: { cs: 'Užitná plocha (m²)' },
                  admin: { condition: (data) => data?.propertyType !== 'pozemek' },
                },
                {
                  name: 'floorArea',
                  type: 'number',
                  min: 0,
                  label: { cs: 'Podlahová plocha (m²)' },
                  admin: { condition: (data) => data?.propertyType !== 'pozemek' },
                },
                {
                  name: 'landArea',
                  type: 'number',
                  min: 0,
                  label: { cs: 'Plocha pozemku (m²)' },
                  admin: {
                    condition: (data) =>
                      ['pozemek', 'dum', 'chata', 'komercni'].includes(data?.propertyType),
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'floor',
                  type: 'number',
                  label: { cs: 'Podlaží' },
                  admin: { condition: (data) => data?.propertyType === 'byt' },
                },
                {
                  name: 'totalFloors',
                  type: 'number',
                  min: 0,
                  label: { cs: 'Počet podlaží v budově' },
                  admin: { condition: (data) => data?.propertyType !== 'pozemek' },
                },
                {
                  name: 'yearBuilt',
                  type: 'number',
                  label: { cs: 'Rok výstavby' },
                  admin: { condition: (data) => data?.propertyType !== 'pozemek' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'ownership',
                  type: 'select',
                  label: { cs: 'Vlastnictví' },
                  options: OWNERSHIP_TYPES,
                },
                {
                  name: 'buildingType',
                  type: 'select',
                  label: { cs: 'Konstrukce budovy' },
                  options: BUILDING_TYPES,
                  admin: { condition: (data) => data?.propertyType !== 'pozemek' },
                },
              ],
            },
            {
              name: 'condition',
              type: 'select',
              label: { cs: 'Stav objektu' },
              options: BUILDING_CONDITIONS,
              admin: { condition: (data) => data?.propertyType !== 'pozemek' },
            },
            {
              name: 'heating',
              type: 'select',
              label: { cs: 'Vytápění' },
              options: HEATING_TYPES,
              admin: { condition: (data) => data?.propertyType !== 'pozemek' },
            },
            {
              name: 'features',
              type: 'select',
              hasMany: true,
              label: { cs: 'Vybavení a vlastnosti' },
              options: PROPERTY_FEATURES,
            },
          ],
        },

        // ───────────────────────────── PENB ─────────────────────────────
        {
          label: { cs: 'PENB', en: 'Energy certificate' },
          description: {
            cs:
              'Průkaz energetické náročnosti budovy. Uvedení energetické třídy je ' +
              'při inzerci nemovitosti povinné ze zákona č. 406/2000 Sb.',
          },
          fields: [
            {
              type: 'group',
              name: 'penb',
              label: { cs: 'Energetická náročnost' },
              fields: [
                {
                  name: 'class',
                  type: 'select',
                  label: { cs: 'Energetická třída' },
                  options: ENERGY_CLASSES,
                  admin: {
                    description: {
                      cs: 'Bez vyplnění nelze inzerát zveřejnit.',
                    },
                  },
                },
                {
                  name: 'exemptionReason',
                  type: 'text',
                  label: { cs: 'Důvod zákonné výjimky' },
                  admin: {
                    condition: (_, sibling) => sibling?.class === 'EXEMPT',
                    description: {
                      cs: 'Např. památkově chráněný objekt, stavba do 50 m², rekreační objekt.',
                    },
                  },
                },
                {
                  name: 'energyKwhM2Year',
                  type: 'number',
                  min: 0,
                  label: { cs: 'Měrná spotřeba energie (kWh/m²·rok)' },
                },
                {
                  name: 'document',
                  type: 'upload',
                  relationTo: 'media',
                  label: { cs: 'Sken průkazu (PDF)' },
                },
              ],
            },
          ],
        },

        // ───────────────────────────── Cena ─────────────────────────────
        {
          label: { cs: 'Cena', en: 'Price' },
          fields: [
            {
              type: 'group',
              name: 'price',
              label: { cs: 'Cena' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'amount',
                      type: 'number',
                      min: 0,
                      label: { cs: 'Cena (Kč)' },
                      admin: { condition: (_, sibling) => !sibling?.onRequest },
                    },
                    {
                      name: 'onRequest',
                      type: 'checkbox',
                      label: { cs: 'Cena na vyžádání' },
                    },
                  ],
                },
                {
                  name: 'period',
                  type: 'select',
                  defaultValue: 'mesic',
                  label: { cs: 'Perioda nájmu' },
                  options: [
                    { value: 'mesic', label: { cs: 'za měsíc' } },
                    { value: 'rok', label: { cs: 'za rok' } },
                  ],
                  admin: { condition: (data) => data?.transactionType === 'pronajem' },
                },
                {
                  type: 'row',
                  admin: { condition: (data) => data?.transactionType === 'pronajem' },
                  fields: [
                    {
                      name: 'utilitiesAmount',
                      type: 'number',
                      min: 0,
                      label: { cs: 'Poplatky a energie (Kč/měs.)' },
                    },
                    {
                      name: 'deposit',
                      type: 'number',
                      min: 0,
                      label: { cs: 'Kauce (Kč)' },
                    },
                  ],
                },
                {
                  name: 'utilitiesIncluded',
                  type: 'checkbox',
                  label: { cs: 'Poplatky a energie jsou v ceně' },
                  admin: { condition: (data) => data?.transactionType === 'pronajem' },
                },
                {
                  name: 'commissionIncluded',
                  type: 'checkbox',
                  label: { cs: 'Provize je v ceně' },
                },
                {
                  name: 'note',
                  type: 'text',
                  localized: true,
                  label: { cs: 'Poznámka k ceně' },
                  admin: { description: { cs: 'Např. „cena k jednání“' } },
                },
              ],
            },
          ],
        },

        // ──────────────────────────── Lokalita ──────────────────────────
        {
          label: { cs: 'Lokalita', en: 'Location' },
          fields: [
            {
              type: 'group',
              name: 'address',
              label: { cs: 'Adresa' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'street', type: 'text', label: { cs: 'Ulice a č.p.' } },
                    { name: 'city', type: 'text', required: true, label: { cs: 'Město / obec' } },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'cityPart', type: 'text', label: { cs: 'Část obce' } },
                    { name: 'zip', type: 'text', label: { cs: 'PSČ' } },
                    {
                      name: 'region',
                      type: 'select',
                      label: { cs: 'Kraj' },
                      options: CZ_REGIONS,
                    },
                  ],
                },
                {
                  name: 'hideExactAddress',
                  type: 'checkbox',
                  label: { cs: 'Nezveřejňovat přesnou adresu' },
                  admin: {
                    description: {
                      cs: 'Na webu se zobrazí pouze město a část obce, mapa se posune na střed čtvrti.',
                    },
                  },
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'lat', type: 'number', label: { cs: 'Zeměpisná šířka' } },
                    { name: 'lng', type: 'number', label: { cs: 'Zeměpisná délka' } },
                  ],
                },
              ],
            },
          ],
        },

        // ───────────────────────────── Média ────────────────────────────
        {
          label: { cs: 'Fotografie', en: 'Media' },
          fields: [
            {
              name: 'gallery',
              type: 'array',
              label: { cs: 'Fotogalerie' },
              labels: {
                singular: { cs: 'Fotografie' },
                plural: { cs: 'Fotografie' },
              },
              admin: {
                description: {
                  cs: 'Přetažením změníte pořadí. První fotografie se použije jako hlavní.',
                },
                initCollapsed: false,
              },
              fields: [
                { name: 'image', type: 'upload', relationTo: 'media', required: true },
                { name: 'alt', type: 'text', localized: true, label: { cs: 'Popisek' } },
              ],
            },
            {
              name: 'floorPlan',
              type: 'upload',
              relationTo: 'media',
              label: { cs: 'Půdorys' },
            },
            {
              type: 'row',
              fields: [
                { name: 'virtualTour', type: 'text', label: { cs: 'Odkaz na virtuální prohlídku' } },
                { name: 'videoUrl', type: 'text', label: { cs: 'Odkaz na video (YouTube)' } },
              ],
            },
          ],
        },

        // ────────────────────────────── SEO ─────────────────────────────
        {
          label: { cs: 'SEO', en: 'SEO' },
          fields: [
            {
              type: 'group',
              name: 'seo',
              label: { cs: 'Vyhledávače' },
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  localized: true,
                  label: { cs: 'Titulek stránky' },
                  admin: { description: { cs: 'Nevyplněno → použije se název inzerátu.' } },
                },
                {
                  name: 'description',
                  type: 'textarea',
                  localized: true,
                  label: { cs: 'Popis pro vyhledávače' },
                  maxLength: 200,
                },
              ],
            },
          ],
        },
      ],
    },

    // ──────────────────────────── Sidebar ─────────────────────────────
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      label: { cs: 'Stav inzerátu' },
      options: LISTING_STATUSES,
      admin: { position: 'sidebar' },
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: { cs: 'Zvýraznit na úvodní stránce' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'slug',
      type: 'text',
      index: true,
      label: { cs: 'URL adresa' },
      admin: {
        position: 'sidebar',
        description: { cs: 'Generuje se z názvu. Po zveřejnění raději neměnit.' },
      },
    },
    {
      name: 'availableFrom',
      type: 'date',
      label: { cs: 'Volné od' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'referenceId',
      type: 'text',
      label: { cs: 'Interní číslo zakázky' },
      admin: { position: 'sidebar' },
    },
  ],
}
