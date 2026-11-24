import type { CollectionConfig } from 'payload'

import { moduleAccess } from '@/access/modules'
import { uniquePerTenant } from '@/utilities/tenantFields'

export const PromoCodes: CollectionConfig = {
  slug: 'promo-codes',
  labels: { singular: 'Promo code', plural: 'Promo codes' },
  // Not publicly readable: storefronts validate codes through a server endpoint so the list can't be scraped.
  access: moduleAccess('promo-codes'),
  admin: {
    group: 'Sales',
    useAsTitle: 'code',
    defaultColumns: ['code', 'percent', 'secondItemOnly', 'showOnProduct', 'active', 'usageCount'],
  },
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      index: true,
      hooks: { beforeValidate: [({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value)] },
      validate: uniquePerTenant('promo-codes', 'code'),
    },
    { name: 'description', type: 'text' },
    { name: 'percent', type: 'number', required: true, min: 1, max: 100 },
    {
      name: 'secondItemOnly',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Discount applies to the second unit only (upsell: "2nd bag −25%").' },
    },
    {
      name: 'products',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      admin: { description: 'Leave empty to apply to every product.' },
    },
    { name: 'minSubtotal', type: 'number', min: 0, admin: { description: 'Minimum subtotal, e.g. 800.' } },
    {
      type: 'row',
      fields: [
        { name: 'startsAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'endsAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
      ],
    },
    { name: 'usageLimit', type: 'number', min: 1, admin: { description: 'Empty = unlimited.' } },
    { name: 'usageCount', type: 'number', defaultValue: 0, admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'showOnProduct',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Display this code and its percentage on the product pages it applies to. Unticked codes stay private.',
      },
    },
    { name: 'active', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
  ],
}
