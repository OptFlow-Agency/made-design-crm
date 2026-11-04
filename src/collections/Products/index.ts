import type { CollectionConfig } from 'payload'

import { moduleAccess } from '@/access/modules'
import { tenantSlugField } from '@/utilities/tenantFields'

export const Products: CollectionConfig = {
  slug: 'products',
  // Storefronts read the catalogue publicly; inactive products are hidden from non-staff.
  access: moduleAccess('products', { publicRead: { active: { equals: true } } }),
  admin: {
    group: 'Catalogue',
    useAsTitle: 'title',
    defaultColumns: ['title', 'price', 'compareAtPrice', 'categories', 'stock', 'active'],
  },
  defaultSort: 'sortOrder',
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            { name: 'description', type: 'textarea' },
            {
              name: 'gallery',
              type: 'array',
              minRows: 1,
              admin: { description: 'First image is the main photo, second is shown on hover.' },
              fields: [
                { name: 'image', type: 'upload', relationTo: 'media', required: true },
                { name: 'alt', type: 'text', admin: { description: 'Overrides the media alt text.' } },
              ],
            },
            {
              name: 'accentColor',
              type: 'text',
              admin: { description: 'Hex colour echoed behind the product photo, e.g. #a9c1d3.' },
            },
          ],
        },
        {
          label: 'Pricing & stock',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'price',
                  type: 'number',
                  required: true,
                  min: 0,
                  admin: { description: 'In the store currency. Orders always recompute from this value.' },
                },
                {
                  name: 'compareAtPrice',
                  type: 'number',
                  min: 0,
                  admin: { description: 'Crossed-out price. Leave empty when not discounted.' },
                  validate: (value: number | null | undefined, { siblingData }: { siblingData?: { price?: number } }) =>
                    value && siblingData?.price && value <= siblingData.price
                      ? 'Compare-at price must be higher than the price'
                      : true,
                },
              ],
            },
            { name: 'sku', type: 'text' },
            { name: 'trackInventory', type: 'checkbox', defaultValue: false },
            {
              name: 'stock',
              type: 'number',
              min: 0,
              admin: { condition: (data) => Boolean(data?.trackInventory) },
            },
            {
              name: 'variants',
              type: 'array',
              admin: { description: 'Optional sizes / colours when one product has several.' },
              fields: [
                { name: 'name', type: 'text', required: true },
                { name: 'sku', type: 'text' },
                { name: 'price', type: 'number', min: 0, admin: { description: 'Overrides the product price.' } },
                { name: 'stock', type: 'number', min: 0 },
                { name: 'image', type: 'upload', relationTo: 'media' },
              ],
            },
          ],
        },
        {
          name: 'seo',
          label: 'SEO',
          fields: [
            { name: 'title', type: 'text' },
            { name: 'description', type: 'textarea' },
          ],
        },
      ],
    },
    tenantSlugField('products'),
    { name: 'categories', type: 'relationship', relationTo: 'categories', hasMany: true, admin: { position: 'sidebar' } },
    { name: 'active', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
    { name: 'isNew', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'sortOrder', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
    {
      name: 'relatedProducts',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
      admin: { position: 'sidebar' },
    },
  ],
}
