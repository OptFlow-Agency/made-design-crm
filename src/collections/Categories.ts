import type { CollectionConfig } from 'payload'

import { moduleAccess } from '@/access/modules'
import { tenantSlugField } from '@/utilities/tenantFields'

/** A storefront "collection" (e.g. Maison Sabra's Collection Bladi / Collection Z'man). */
export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Collection', plural: 'Collections' },
  access: moduleAccess('categories', { publicRead: true }),
  admin: {
    useAsTitle: 'title',
    group: 'Catalogue',
    defaultColumns: ['title', 'slug', 'active', 'sortOrder'],
  },
  defaultSort: 'sortOrder',
  fields: [
    { name: 'title', type: 'text', required: true },
    tenantSlugField('categories'),
    { name: 'description', type: 'textarea' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'active', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
    { name: 'sortOrder', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
