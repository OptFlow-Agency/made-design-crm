import type { CollectionConfig } from 'payload'

import { moduleAccess } from '@/access/modules'

/** Landing-page bundles and post-order upsells (Maison Sabra's "Duo Signature" and 2nd-bag upsell). */
export const Offers: CollectionConfig = {
  slug: 'offers',
  access: moduleAccess('offers', { publicRead: { active: { equals: true } } }),
  admin: { group: 'Sales', useAsTitle: 'title', defaultColumns: ['title', 'type', 'quantity', 'discountPercent', 'active'] },
  defaultSort: 'sortOrder',
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'bundle',
      options: [
        { label: 'Bundle (chosen before ordering)', value: 'bundle' },
        { label: 'Upsell (offered after ordering)', value: 'upsell' },
      ],
    },
    { name: 'quantity', type: 'number', min: 1, defaultValue: 1, admin: { description: 'Units in the offer.' } },
    { name: 'discountPercent', type: 'number', min: 0, max: 100, defaultValue: 0 },
    {
      name: 'promoCode',
      type: 'relationship',
      relationTo: 'promo-codes',
      admin: { description: 'Code sent with the order so the server recomputes the same discount.' },
    },
    { name: 'badge', type: 'text', admin: { description: 'e.g. "Recommandé".' } },
    { name: 'defaultSelected', type: 'checkbox', defaultValue: false },
    {
      name: 'triggerOffer',
      type: 'relationship',
      relationTo: 'offers',
      admin: { condition: (data) => data?.type === 'upsell', description: 'Upsell shows after this offer is ordered.' },
    },
    {
      name: 'durationSeconds',
      type: 'number',
      min: 0,
      admin: { condition: (data) => data?.type === 'upsell', description: 'Countdown length, e.g. 300.' },
    },
    { name: 'products', type: 'relationship', relationTo: 'products', hasMany: true, admin: { description: 'Empty = any product.' } },
    { name: 'active', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
    { name: 'sortOrder', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
