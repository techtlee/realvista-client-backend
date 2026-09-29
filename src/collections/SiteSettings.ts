import type { CollectionConfig } from 'payload'

import { isPlatformAdmin, tenantBaseListFilter, tenantRead, tenantWrite } from '../access/tenantScoped'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidateTenantSite'

/**
 * Everything on the site that is not a listing or a blog post.
 *
 * A normal collection rather than a Payload `global`, because globals are not
 * tenant-scoped — one global would be shared by all 80 clients. The
 * one-row-per-tenant rule is enforced in the beforeChange hook below, and
 * `create` is restricted to platform staff so provisioning owns row creation.
 */
export const SiteSettings: CollectionConfig = {
  slug: 'site-settings',
  labels: {
    singular: { cs: 'Nastavení webu', en: 'Site settings' },
    plural: { cs: 'Nastavení webu', en: 'Site settings' },
  },
  access: {
    read: tenantRead,
    update: tenantWrite,
    // Seeded by provisioning; a realtor editing their site must never be able to
    // create a second settings row and silently split their own content.
    create: isPlatformAdmin,
    delete: isPlatformAdmin,
  },
  admin: {
    useAsTitle: 'siteName',
    baseListFilter: tenantBaseListFilter,
    group: { cs: 'Web', en: 'Site' },
  },
  hooks: {
    afterChange: [revalidateAfterChange('site-settings')],
    afterDelete: [revalidateAfterDelete('site-settings')],
    beforeChange: [
      async ({ operation, data, req }) => {
        if (operation !== 'create') return data
        if (!data?.tenant) return data

        const existing = await req.payload.count({
          collection: 'site-settings',
          where: { tenant: { equals: data.tenant } },
          overrideAccess: true,
        })

        if (existing.totalDocs > 0) {
          throw new Error('Tento klient už nastavení webu má. Upravte stávající záznam.')
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'siteName',
      type: 'text',
      required: true,
      label: { cs: 'Název webu' },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: { cs: 'Úvodní sekce' },
          fields: [
            {
              type: 'group',
              name: 'hero',
              label: { cs: 'Hlavní banner' },
              fields: [
                {
                  name: 'headline',
                  type: 'text',
                  localized: true,
                  label: { cs: 'Hlavní nadpis' },
                  admin: {
                    description: { cs: 'Např. „Reality nejsou jen nemovitosti. Jsou to vaše další kroky.“' },
                  },
                },
                { name: 'subheadline', type: 'textarea', localized: true, label: { cs: 'Podnadpis' } },
                {
                  type: 'row',
                  fields: [
                    { name: 'ctaLabel', type: 'text', localized: true, label: { cs: 'Text tlačítka' } },
                    { name: 'ctaHref', type: 'text', label: { cs: 'Odkaz tlačítka' } },
                  ],
                },
                {
                  name: 'backgroundImage',
                  type: 'upload',
                  relationTo: 'media',
                  label: { cs: 'Fotografie na pozadí' },
                },
              ],
            },
          ],
        },

        {
          label: { cs: 'Makléř' },
          fields: [
            {
              type: 'group',
              name: 'agent',
              label: { cs: 'Profil makléře' },
              fields: [
                { name: 'name', type: 'text', required: true, label: { cs: 'Jméno a příjmení' } },
                {
                  name: 'jobTitle',
                  type: 'text',
                  localized: true,
                  label: { cs: 'Pozice' },
                  admin: { description: { cs: 'Např. „Realitní makléř“' } },
                },
                {
                  name: 'photo',
                  type: 'upload',
                  relationTo: 'media',
                  label: { cs: 'Portrét' },
                  admin: {
                    description: {
                      cs: 'Na výšku, min. 1000 px na kratší straně, neutrální pozadí.',
                    },
                  },
                },
                { name: 'bio', type: 'richText', localized: true, label: { cs: 'O mně' } },
                {
                  type: 'row',
                  fields: [
                    { name: 'phone', type: 'text', label: { cs: 'Telefon' } },
                    { name: 'email', type: 'email', label: { cs: 'E-mail' } },
                  ],
                },
                {
                  name: 'licenceNumber',
                  type: 'text',
                  label: { cs: 'Číslo osvědčení realitního zprostředkovatele' },
                  admin: {
                    description: {
                      cs: 'Povinný údaj podle zákona č. 39/2020 Sb. o realitním zprostředkování.',
                    },
                  },
                },
                {
                  name: 'certifications',
                  type: 'array',
                  label: { cs: 'Certifikace a členství' },
                  fields: [{ name: 'label', type: 'text', localized: true, label: { cs: 'Název' } }],
                },
              ],
            },
          ],
        },

        {
          label: { cs: 'Čísla' },
          fields: [
            {
              name: 'stats',
              type: 'array',
              maxRows: 4,
              label: { cs: 'Pruh se statistikami' },
              admin: {
                description: { cs: 'Např. „12 let / na trhu“, „450+ mil. Kč / objem obchodů“.' },
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'value', type: 'text', label: { cs: 'Hodnota' } },
                    { name: 'label', type: 'text', localized: true, label: { cs: 'Popisek' } },
                  ],
                },
              ],
            },
          ],
        },

        {
          label: { cs: 'O nás' },
          fields: [
            {
              type: 'group',
              name: 'about',
              label: { cs: 'Sekce o nás' },
              fields: [
                { name: 'heading', type: 'text', localized: true, label: { cs: 'Nadpis' } },
                { name: 'body', type: 'richText', localized: true, label: { cs: 'Text' } },
                { name: 'image', type: 'upload', relationTo: 'media', label: { cs: 'Obrázek' } },
              ],
            },
          ],
        },

        {
          label: { cs: 'Kontakt' },
          fields: [
            {
              type: 'group',
              name: 'contact',
              label: { cs: 'Kontaktní údaje' },
              fields: [
                { name: 'companyName', type: 'text', label: { cs: 'Název firmy' } },
                {
                  type: 'row',
                  fields: [
                    { name: 'ico', type: 'text', label: { cs: 'IČO' } },
                    { name: 'dic', type: 'text', label: { cs: 'DIČ' } },
                  ],
                },
                { name: 'address', type: 'textarea', label: { cs: 'Adresa kanceláře' } },
                {
                  type: 'row',
                  fields: [
                    { name: 'phone', type: 'text', label: { cs: 'Telefon' } },
                    { name: 'email', type: 'email', label: { cs: 'E-mail' } },
                  ],
                },
                { name: 'officeHours', type: 'textarea', localized: true, label: { cs: 'Otevírací doba' } },
                { name: 'mapEmbed', type: 'text', label: { cs: 'Odkaz na mapu' } },
                {
                  type: 'group',
                  name: 'social',
                  label: { cs: 'Sociální sítě' },
                  fields: [
                    { name: 'facebook', type: 'text' },
                    { name: 'instagram', type: 'text' },
                    { name: 'linkedin', type: 'text' },
                    { name: 'youtube', type: 'text' },
                  ],
                },
              ],
            },
          ],
        },

        {
          label: { cs: 'Vzhled' },
          fields: [
            {
              type: 'group',
              name: 'branding',
              label: { cs: 'Značka' },
              fields: [
                { name: 'logo', type: 'upload', relationTo: 'media', label: { cs: 'Logo' } },
                {
                  name: 'logoInverse',
                  type: 'upload',
                  relationTo: 'media',
                  label: { cs: 'Logo pro tmavé pozadí' },
                },
                { name: 'favicon', type: 'upload', relationTo: 'media', label: { cs: 'Favicon' } },
              ],
            },
          ],
        },

        {
          label: { cs: 'Právní' },
          fields: [
            {
              type: 'group',
              name: 'legal',
              label: { cs: 'Právní texty' },
              fields: [
                {
                  name: 'privacyPolicy',
                  type: 'richText',
                  localized: true,
                  label: { cs: 'Zásady ochrany osobních údajů' },
                },
                {
                  name: 'cookieNotice',
                  type: 'richText',
                  localized: true,
                  label: { cs: 'Informace o cookies' },
                },
                {
                  name: 'gdprConsentText',
                  type: 'textarea',
                  localized: true,
                  label: { cs: 'Text souhlasu u kontaktního formuláře' },
                  admin: {
                    description: {
                      cs: 'Zobrazí se u zaškrtávacího políčka, které musí návštěvník potvrdit před odesláním.',
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
