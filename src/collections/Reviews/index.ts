import type { CollectionConfig } from 'payload'

import { moduleAccess } from '@/access/modules'
import { idOf } from '@/utilities/ids'

export const Reviews: CollectionConfig = {
  slug: 'reviews',
  access: moduleAccess('reviews', { publicRead: { status: { equals: 'approved' } } }),
  admin: { group: 'Sales', useAsTitle: 'author', defaultColumns: ['author', 'rating', 'product', 'status', 'source'] },
  hooks: {
    // Only a linked order can make a review "verified"; the flag can't be ticked by hand.
    beforeChange: [({ data }) => ({ ...data, verifiedPurchase: Boolean(idOf(data.order)) })],
  },
  fields: [
    { name: 'title', type: 'text' },
    { name: 'author', type: 'text', required: true, admin: { description: 'e.g. "Salma B." — first name and initial.' } },
    { name: 'text', type: 'textarea', required: true },
    { name: 'rating', type: 'number', min: 1, max: 5 },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    { name: 'product', type: 'relationship', relationTo: 'products' },
    { name: 'order', type: 'relationship', relationTo: 'orders', admin: { description: 'Link a real order to mark it verified.' } },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'site',
      options: [
        { label: 'Site', value: 'site' },
        { label: 'Instagram', value: 'instagram' },
        { label: 'WhatsApp', value: 'whatsapp' },
        { label: 'Google', value: 'google' },
      ],
    },
    { name: 'verifiedPurchase', type: 'checkbox', defaultValue: false, admin: { readOnly: true, description: 'Set automatically when an order is linked.' } },
    { name: 'reply', type: 'textarea', admin: { description: 'Public reply from the store.' } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      admin: { position: 'sidebar' },
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Hidden', value: 'hidden' },
      ],
    },
  ],
}
