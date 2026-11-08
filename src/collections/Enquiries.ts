import type { CollectionConfig } from 'payload'

import { tenantAccess, tenantBaseListFilter, tenantWrite } from '../access/tenantScoped'

/**
 * Poptávky — contact-form submissions from a client's own website.
 *
 * Submitted content is read-only in the admin: it is a record of what a member
 * of the public actually wrote, and a realtor editing it after the fact
 * destroys its value as evidence of consent. Only the handling fields are
 * editable. Deletion stays available — GDPR erasure requests are not optional.
 */
export const Enquiries: CollectionConfig = {
  slug: 'enquiries',
  labels: {
    singular: { cs: 'Poptávka', en: 'Enquiry' },
    plural: { cs: 'Poptávky', en: 'Enquiries' },
  },
  access: {
    ...tenantAccess,
    /**
     * Only the website may create an enquiry.
     *
     * A record of what a member of the public wrote is evidence of their
     * consent; a hand-typed one is not. Restricting creation to the site's API
     * key also removes a "create" button that would only ever confuse a realtor
     * — enquiries arrive, they are not authored.
     */
    create: (args) => {
      const user = args.req.user as { _strategy?: string; platformRole?: string } | undefined
      if (!user) return false
      if (user.platformRole === 'platform-admin') return true
      return user._strategy === 'api-key' ? tenantWrite(args) : false
    },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'phone', 'status', 'createdAt'],
    listSearchableFields: ['name', 'email', 'phone', 'message'],
    baseListFilter: tenantBaseListFilter,
    group: { cs: 'Obsah', en: 'Content' },
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, label: { cs: 'Jméno' }, admin: { readOnly: true } },
        { name: 'email', type: 'email', label: { cs: 'E-mail' }, admin: { readOnly: true } },
        { name: 'phone', type: 'text', label: { cs: 'Telefon' }, admin: { readOnly: true } },
      ],
    },
    {
      name: 'message',
      type: 'textarea',
      label: { cs: 'Zpráva' },
      admin: { readOnly: true },
    },
    {
      name: 'property',
      type: 'relationship',
      relationTo: 'properties',
      label: { cs: 'Týká se nemovitosti' },
      admin: { readOnly: true },
    },
    {
      name: 'consent',
      type: 'group',
      label: { cs: 'Souhlas se zpracováním' },
      admin: { readOnly: true },
      fields: [
        { name: 'given', type: 'checkbox', label: { cs: 'Souhlas udělen' } },
        {
          name: 'text',
          type: 'textarea',
          label: { cs: 'Znění souhlasu v okamžiku odeslání' },
          admin: {
            description: {
              cs: 'Ukládá se doslovně, aby bylo doložitelné, s čím přesně návštěvník souhlasil.',
            },
          },
        },
        { name: 'at', type: 'date', label: { cs: 'Datum souhlasu' } },
      ],
    },
    {
      name: 'source',
      type: 'text',
      label: { cs: 'Zdroj' },
      admin: { readOnly: true, description: { cs: 'Stránka, ze které byl formulář odeslán.' } },
    },

    // The only editable part: how the realtor is handling it.
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      label: { cs: 'Stav' },
      options: [
        { value: 'new', label: { cs: 'Nová' } },
        { value: 'contacted', label: { cs: 'Kontaktováno' } },
        { value: 'meeting', label: { cs: 'Domluvena schůzka' } },
        { value: 'closed', label: { cs: 'Uzavřeno' } },
        { value: 'spam', label: { cs: 'Spam' } },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'internalNote',
      type: 'textarea',
      label: { cs: 'Interní poznámka' },
      admin: { position: 'sidebar' },
    },
  ],
}
