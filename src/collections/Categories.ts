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
    { name: 'heroImage', type: 'upload', relationTo: 'media', admin: { description: 'Wide banner for the collection page.' } },
    {
      name: 'featuredProducts',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      admin: { description: 'Shown first on the collection page, in this order.' },
    },
    {
      name: 'seo',
      type: 'group',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'titleEn', type: 'text', label: 'Meta title (English)' },
        { name: 'descriptionEn', type: 'textarea', label: 'Meta description (English)' },
      ],
    },
    { name: 'featured', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar', description: 'Featured on the homepage.' } },
    { name: 'seasonal', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'seasonLabel', type: 'text', admin: { position: 'sidebar', condition: (data) => Boolean(data?.seasonal), description: 'e.g. "Été 2027".' } },
    { name: 'active', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
    { name: 'sortOrder', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
