import type { CollectionConfig } from 'payload'

import { tenantAccess, tenantBaseListFilter } from '../access/tenantScoped'
import { slugifyCzech } from '../lib/czech'
import { assignTenantOnCreate } from '../hooks/assignTenantOnCreate'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidateTenantSite'

/** Blog — optional per site, toggled by a feature flag in the site config. */
export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: {
    singular: { cs: 'Článek', en: 'Post' },
    plural: { cs: 'Články', en: 'Posts' },
  },
  access: tenantAccess,
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'publishedAt', '_status'],
    listSearchableFields: ['title', 'excerpt'],
    baseListFilter: tenantBaseListFilter,
    group: { cs: 'Obsah', en: 'Content' },
  },
  versions: { drafts: true },
  defaultSort: '-publishedAt',
  hooks: {
    afterChange: [revalidateAfterChange('posts')],
    afterDelete: [revalidateAfterDelete('posts')],
    beforeValidate: [
      assignTenantOnCreate(),
      ({ data }) => {
        if (!data) return data
        if (!data.slug && typeof data.title === 'string' && data.title.length > 0) {
          data.slug = slugifyCzech(data.title)
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true, label: { cs: 'Titulek' } },
    {
      name: 'excerpt',
      type: 'textarea',
      localized: true,
      label: { cs: 'Perex' },
      maxLength: 300,
      admin: { description: { cs: 'Krátké shrnutí do výpisu článků.' } },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      label: { cs: 'Úvodní obrázek' },
    },
    { name: 'body', type: 'richText', localized: true, label: { cs: 'Obsah článku' } },
    {
      name: 'category',
      type: 'select',
      label: { cs: 'Rubrika' },
      options: [
        { value: 'trh', label: { cs: 'Realitní trh' } },
        { value: 'rady', label: { cs: 'Rady a tipy' } },
        { value: 'financovani', label: { cs: 'Financování a hypotéky' } },
        { value: 'pravo', label: { cs: 'Právo a daně' } },
        { value: 'novinky', label: { cs: 'Novinky' } },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: { cs: 'Datum publikování' },
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'slug',
      type: 'text',
      index: true,
      label: { cs: 'URL adresa' },
      admin: { position: 'sidebar' },
    },
    {
      type: 'group',
      name: 'seo',
      label: { cs: 'SEO' },
      admin: { position: 'sidebar' },
      fields: [
        { name: 'title', type: 'text', localized: true, label: { cs: 'Titulek stránky' } },
        {
          name: 'description',
          type: 'textarea',
          localized: true,
          maxLength: 200,
          label: { cs: 'Popis pro vyhledávače' },
        },
      ],
    },
  ],
}
