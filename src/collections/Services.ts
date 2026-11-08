import type { CollectionConfig } from 'payload'

import { tenantAccess, tenantBaseListFilter } from '../access/tenantScoped'
import { assignTenantOnCreate } from '../hooks/assignTenantOnCreate'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidateTenantSite'

/** Služby — what the realtor offers, rendered as the services section. */
export const Services: CollectionConfig = {
  slug: 'services',
  labels: {
    singular: { cs: 'Služba', en: 'Service' },
    plural: { cs: 'Služby', en: 'Services' },
  },
  access: tenantAccess,
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'order'],
    baseListFilter: tenantBaseListFilter,
    group: { cs: 'Obsah', en: 'Content' },
  },
  defaultSort: 'order',
  hooks: {
    afterChange: [revalidateAfterChange('services')],
    afterDelete: [revalidateAfterDelete('services')],
    beforeValidate: [assignTenantOnCreate()],
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true, label: { cs: 'Název' } },
    { name: 'description', type: 'textarea', localized: true, label: { cs: 'Popis' } },
    {
      name: 'icon',
      type: 'select',
      label: { cs: 'Ikona' },
      // A fixed set rather than free text: the theme ships these icons, and a
      // typo'd name would render an empty box on the live site.
      options: [
        { value: 'home', label: { cs: 'Dům' } },
        { value: 'key', label: { cs: 'Klíč' } },
        { value: 'chart', label: { cs: 'Graf' } },
        { value: 'calculator', label: { cs: 'Kalkulačka' } },
        { value: 'document', label: { cs: 'Dokument' } },
        { value: 'shield', label: { cs: 'Štít' } },
        { value: 'handshake', label: { cs: 'Podání ruky' } },
        { value: 'camera', label: { cs: 'Fotoaparát' } },
      ],
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: { cs: 'Pořadí' },
      admin: { position: 'sidebar' },
    },
  ],
}
