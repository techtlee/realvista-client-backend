import type { CollectionConfig } from 'payload'

import { isPlatformAdmin } from '../access/tenantScoped'

/**
 * Zájemci o web — the storefront pipeline: realtors who submitted the intake
 * form and want a website built.
 *
 * Platform-level, NOT tenant-scoped. A lead has no tenant yet — creating one is
 * the outcome of approving the lead. Access is platform staff only, so this
 * never appears in any realtor's admin panel.
 *
 * The public storefront writes here through a dedicated endpoint rather than by
 * being granted `create`, so the form cannot set `status` or `internalNote`.
 */
export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: {
    singular: { cs: 'Zájemce o web', en: 'Lead' },
    plural: { cs: 'Zájemci o web', en: 'Leads' },
  },
  access: {
    read: isPlatformAdmin,
    create: isPlatformAdmin,
    update: isPlatformAdmin,
    delete: isPlatformAdmin,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'companyName', 'email', 'status', 'createdAt'],
    listSearchableFields: ['name', 'email', 'companyName', 'ico'],
    group: { cs: 'Platforma', en: 'Platform' },
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, label: { cs: 'Jméno a příjmení' } },
        { name: 'email', type: 'email', required: true, label: { cs: 'E-mail' } },
        { name: 'phone', type: 'text', label: { cs: 'Telefon' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'ico', type: 'text', label: { cs: 'IČO' } },
        { name: 'companyName', type: 'text', label: { cs: 'Název firmy' } },
      ],
    },
    {
      name: 'aresVerified',
      type: 'checkbox',
      label: { cs: 'Údaje doplněny z ARES' },
      admin: {
        readOnly: true,
        description: { cs: 'Firma a adresa byly načteny podle IČO z registru ARES.' },
      },
    },

    {
      type: 'group',
      name: 'chosen',
      label: { cs: 'Vybraný vzhled' },
      fields: [
        {
          name: 'theme',
          type: 'text',
          label: { cs: 'Šablona' },
          admin: { description: { cs: 'Předvyplněno podle toho, na co zájemce klikl v galerii.' } },
        },
        { name: 'variant', type: 'text', label: { cs: 'Barevná varianta' } },
      ],
    },

    {
      type: 'group',
      name: 'domain',
      label: { cs: 'Doména' },
      fields: [
        {
          name: 'situation',
          type: 'select',
          label: { cs: 'Stav domény' },
          options: [
            { value: 'have-access', label: { cs: 'Mám doménu a přístup k ní' } },
            { value: 'have-no-access', label: { cs: 'Mám doménu, ale nemám k ní přístup' } },
            { value: 'none', label: { cs: 'Doménu zatím nemám' } },
          ],
        },
        { name: 'name', type: 'text', label: { cs: 'Doména' } },
        {
          name: 'registrar',
          type: 'select',
          label: { cs: 'Registrátor' },
          options: [
            { value: 'wedos', label: 'Wedos' },
            { value: 'forpsi', label: 'Forpsi' },
            { value: 'active24', label: 'Active24' },
            { value: 'websupport', label: 'Websupport' },
            { value: 'gransy', label: 'Gransy / Subreg' },
            { value: 'other', label: { cs: 'Jiný' } },
            { value: 'unknown', label: { cs: 'Nevím' } },
          ],
        },
        {
          name: 'emailOnDomain',
          type: 'select',
          label: { cs: 'Používáte e-mail na této doméně?' },
          options: [
            { value: 'yes', label: { cs: 'Ano' } },
            { value: 'no', label: { cs: 'Ne' } },
            { value: 'unknown', label: { cs: 'Nevím' } },
          ],
          admin: {
            description: {
              cs:
                'Rozhoduje o tom, zda lze měnit nameservery. Pokud na doméně běží e-mail, ' +
                'nastavujeme pouze A a CNAME záznamy — jinak hrozí výpadek pošty.',
            },
          },
        },
      ],
    },

    {
      name: 'portfolioSize',
      type: 'select',
      label: { cs: 'Kolik nemovitostí obvykle nabízíte?' },
      options: [
        { value: '1-5', label: '1–5' },
        { value: '6-20', label: '6–20' },
        { value: '20+', label: '20+' },
      ],
    },

    {
      name: 'consent',
      type: 'group',
      label: { cs: 'Souhlas se zpracováním' },
      admin: { readOnly: true },
      fields: [
        { name: 'given', type: 'checkbox', label: { cs: 'Souhlas udělen' } },
        { name: 'text', type: 'textarea', label: { cs: 'Znění souhlasu' } },
        { name: 'at', type: 'date', label: { cs: 'Datum souhlasu' } },
      ],
    },

    // ── Sales handling ──
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      label: { cs: 'Stav' },
      options: [
        { value: 'new', label: { cs: 'Nový' } },
        { value: 'contacted', label: { cs: 'Kontaktován' } },
        { value: 'qualified', label: { cs: 'Kvalifikován' } },
        { value: 'approved', label: { cs: 'Schváleno k realizaci' } },
        { value: 'provisioned', label: { cs: 'Web založen' } },
        { value: 'rejected', label: { cs: 'Zamítnuto' } },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      label: { cs: 'Vytvořený klient' },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: { cs: 'Vyplní se automaticky po založení webu.' },
      },
    },
    {
      name: 'internalNote',
      type: 'textarea',
      label: { cs: 'Interní poznámka' },
      admin: { position: 'sidebar' },
    },
  ],
}
