import type { CollectionConfig } from 'payload'

import { isPlatformAdmin, ownTenantsOnly } from '../access/tenantScoped'

/**
 * One row per client site. The tenant root that every other collection hangs off.
 *
 * Realtors can read their own tenant (the admin UI needs the name and site URL)
 * but can never create, edit, or delete one — provisioning owns this collection.
 */
export const Tenants: CollectionConfig = {
  slug: 'tenants',
  labels: {
    singular: { cs: 'Klient', en: 'Tenant' },
    plural: { cs: 'Klienti', en: 'Tenants' },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'status', 'domain', 'theme'],
    group: { cs: 'Platforma', en: 'Platform' },
    hidden: ({ user }) => (user as { platformRole?: string } | undefined)?.platformRole !== 'platform-admin',
  },
  access: {
    read: ownTenantsOnly,
    create: isPlatformAdmin,
    update: isPlatformAdmin,
    delete: isPlatformAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: { cs: 'Název', en: 'Name' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: { cs: 'Identifikátor', en: 'Slug' },
      admin: {
        description: {
          cs: 'Používá se v názvu repozitáře a subdomény. Po vytvoření neměnit.',
          en: 'Used in the repo name and subdomain. Do not change after creation.',
        },
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'provisioning',
      label: { cs: 'Stav', en: 'Status' },
      options: [
        { value: 'provisioning', label: { cs: 'Zakládá se', en: 'Provisioning' } },
        { value: 'awaiting-dns', label: { cs: 'Čeká na DNS', en: 'Awaiting DNS' } },
        { value: 'live', label: { cs: 'Spuštěno', en: 'Live' } },
        { value: 'suspended', label: { cs: 'Pozastaveno', en: 'Suspended' } },
        { value: 'cancelled', label: { cs: 'Zrušeno', en: 'Cancelled' } },
      ],
    },

    {
      type: 'group',
      name: 'theme',
      label: { cs: 'Vzhled', en: 'Theme' },
      fields: [
        {
          name: 'name',
          type: 'select',
          required: true,
          defaultValue: 'realvista',
          label: { cs: 'Šablona', en: 'Theme' },
          options: [{ value: 'realvista', label: 'REALVISTA' }],
        },
        {
          name: 'variant',
          type: 'select',
          required: true,
          defaultValue: 'indigo',
          label: { cs: 'Barevná varianta', en: 'Color variant' },
          options: [
            { value: 'indigo', label: { cs: 'Indigová', en: 'Indigo' } },
            { value: 'crimson', label: { cs: 'Červená', en: 'Crimson' } },
            { value: 'clay', label: { cs: 'Hnědá', en: 'Clay' } },
            { value: 'mono', label: { cs: 'Černobílá', en: 'Mono' } },
          ],
        },
      ],
    },

    {
      type: 'group',
      name: 'hosting',
      label: { cs: 'Hosting', en: 'Hosting' },
      fields: [
        {
          name: 'domain',
          type: 'text',
          label: { cs: 'Vlastní doména', en: 'Custom domain' },
          admin: { description: { cs: 'Bez protokolu, např. novakreality.cz', en: 'No protocol' } },
        },
        {
          name: 'platformSubdomain',
          type: 'text',
          label: { cs: 'Subdoména platformy', en: 'Platform subdomain' },
          admin: {
            description: {
              cs: 'Vždy se přiděluje při zakládání, aby web běžel i než se nastaví DNS.',
              en: 'Always attached at provisioning so the site works before DNS is set.',
            },
          },
        },
        {
          name: 'siteUrl',
          type: 'text',
          label: { cs: 'Adresa webu', en: 'Site URL' },
          admin: {
            readOnly: true,
            description: {
              cs: 'Cíl pro revalidaci obsahu. Nastavuje provisioning.',
              en: 'Revalidation target. Set by provisioning.',
            },
          },
        },
        { name: 'githubRepo', type: 'text', label: { cs: 'GitHub repozitář', en: 'GitHub repo' } },
        { name: 'vercelProjectId', type: 'text', label: { cs: 'Vercel projekt', en: 'Vercel project' } },
      ],
    },

    {
      name: 'revalidateSecret',
      type: 'text',
      label: { cs: 'Revalidační tajemství', en: 'Revalidate secret' },
      access: {
        // Never expose to a realtor: it authenticates cache purges on their site.
        read: ({ req: { user } }) =>
          (user as { platformRole?: string } | undefined)?.platformRole === 'platform-admin',
        create: () => false,
        update: () => false,
      },
      admin: { readOnly: true, position: 'sidebar' },
    },

    {
      name: 'ring',
      type: 'select',
      defaultValue: 'stable',
      label: { cs: 'Rollout ring', en: 'Rollout ring' },
      admin: {
        position: 'sidebar',
        description: {
          cs: 'Řídí, jak rychle na web dorazí aktualizace šablony.',
          en: 'Controls how fast theme updates reach this site.',
        },
      },
      options: [
        { value: 'canary', label: 'canary' },
        { value: 'stable', label: 'stable' },
        { value: 'frozen', label: 'frozen' },
      ],
    },

    {
      name: 'provisioningLog',
      type: 'array',
      label: { cs: 'Průběh zakládání', en: 'Provisioning log' },
      admin: {
        readOnly: true,
        description: {
          cs: 'Každý krok se zapisuje, aby šlo po chybě navázat místo opakování od začátku.',
          en: 'Each step is recorded so a failure resumes rather than restarts.',
        },
      },
      fields: [
        { name: 'step', type: 'text' },
        { name: 'status', type: 'select', options: ['ok', 'failed', 'skipped'] },
        { name: 'at', type: 'date' },
        { name: 'detail', type: 'textarea' },
      ],
    },
  ],
}
