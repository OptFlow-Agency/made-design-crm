import type { CollectionConfig } from 'payload'

import { moduleAccess } from '@/access/modules'

/** City-based delivery pricing ("frais selon la ville"). Unmatched cities fall back to StoreSettings. */
export const ShippingZones: CollectionConfig = {
  slug: 'shipping-zones',
  labels: { singular: 'Shipping zone', plural: 'Shipping zones' },
  access: moduleAccess('shipping-zones', { publicRead: true }),
  admin: { group: 'Store', useAsTitle: 'name', defaultColumns: ['name', 'cost', 'freeAbove', 'active'] },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'cities',
      type: 'array',
      minRows: 1,
      fields: [{ name: 'city', type: 'text', required: true }],
    },
    { name: 'cost', type: 'number', required: true, min: 0, defaultValue: 0 },
    { name: 'freeAbove', type: 'number', min: 0, admin: { description: 'Overrides the store-wide free shipping threshold.' } },
    { name: 'estimatedDelivery', type: 'text', admin: { description: 'e.g. "24–48h".' } },
    { name: 'cashOnDelivery', type: 'checkbox', defaultValue: true, admin: { description: 'Cash on delivery available in this zone.' } },
    { name: 'active', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
  ],
}
