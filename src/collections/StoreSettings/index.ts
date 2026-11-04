import type { CollectionConfig } from 'payload'

import { moduleAccess } from '@/access/modules'

/** One document per tenant (registered with `isGlobal` in the multi-tenant plugin). */
export const StoreSettings: CollectionConfig = {
  slug: 'store-settings',
  labels: { singular: 'Store settings', plural: 'Store settings' },
  access: moduleAccess('store-settings', { publicRead: true }),
  admin: { group: 'Store', useAsTitle: 'storeName' },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Brand',
          fields: [
            { name: 'storeName', type: 'text', required: true },
            { name: 'tagline', type: 'text' },
            { name: 'description', type: 'textarea' },
            { name: 'logo', type: 'upload', relationTo: 'media' },
            { name: 'ogImage', type: 'upload', relationTo: 'media' },
            { name: 'announcement', type: 'text', admin: { description: 'Top-of-site announcement bar.' } },
          ],
        },
        {
          label: 'Contact',
          fields: [
            { name: 'phone', type: 'text' },
            { name: 'whatsapp', type: 'text', admin: { description: 'International format without "+", e.g. 212612345678.' } },
            { name: 'email', type: 'email' },
            { name: 'instagram', type: 'text' },
            { name: 'facebook', type: 'text' },
            { name: 'tiktok', type: 'text' },
          ],
        },
        {
          label: 'Shipping',
          fields: [
            {
              name: 'defaultShippingCost',
              type: 'number',
              min: 0,
              defaultValue: 0,
              admin: { description: 'Used when no shipping zone matches the order city.' },
            },
            {
              name: 'freeShippingFrom',
              type: 'number',
              min: 0,
              admin: { description: 'Subtotal from which delivery is free. Empty = never.' },
            },
            { name: 'deliveryDelay', type: 'text', admin: { description: 'e.g. "2 à 4 jours ouvrés selon la ville".' } },
          ],
        },
        {
          label: 'Tracking & policies',
          fields: [
            { name: 'metaPixelId', type: 'text' },
            { name: 'tiktokPixelId', type: 'text' },
            { name: 'googleAnalyticsId', type: 'text' },
            {
              name: 'policies',
              type: 'group',
              fields: [
                { name: 'delivery', type: 'text' },
                { name: 'returns', type: 'text' },
                { name: 'terms', type: 'text' },
                { name: 'privacy', type: 'text' },
              ],
            },
          ],
        },
      ],
    },
  ],
}
