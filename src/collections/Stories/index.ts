import type { CollectionConfig } from 'payload'

import { moduleAccess } from '@/access/modules'
import { tenantSlugField } from '@/utilities/tenantFields'

/** Brand content: craftsmanship stories, product inspiration and editorial / styling pieces. */
export const Stories: CollectionConfig = {
  slug: 'stories',
  labels: { singular: 'Story', plural: 'Stories' },
  access: moduleAccess('stories', { publicRead: { active: { equals: true } } }),
  admin: { group: 'Website', useAsTitle: 'title', defaultColumns: ['title', 'kind', 'verified', 'active', 'publishedAt'] },
  defaultSort: 'sortOrder',
  fields: [
    { name: 'title', type: 'text', required: true },
    tenantSlugField('stories'),
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'craftsmanship',
      options: [
        { label: 'Craftsmanship', value: 'craftsmanship' },
        { label: 'Inspiration', value: 'inspiration' },
        { label: 'Editorial / styling', value: 'editorial' },
        { label: 'Brand story', value: 'brand' },
      ],
    },
    { name: 'kicker', type: 'text', admin: { description: 'Short label above the title.' } },
    { name: 'excerpt', type: 'textarea', maxLength: 280 },
    { name: 'body', type: 'textarea', admin: { description: 'Separate paragraphs with a blank line.' } },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    {
      name: 'images',
      type: 'array',
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'caption', type: 'text' },
        { name: 'alt', type: 'text' },
      ],
    },
    { name: 'products', type: 'relationship', relationTo: 'products', hasMany: true, admin: { description: 'Products this story is about.' } },
    {
      name: 'verified',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Claims about making, materials and origin have been checked. Required to publish craftsmanship stories.' },
      validate: (value: boolean | null | undefined, { siblingData }: { siblingData?: { kind?: string; active?: boolean } }) =>
        siblingData?.active && siblingData?.kind === 'craftsmanship' && !value ? 'Verify the craftsmanship claims before publishing' : true,
    },
    { name: 'publishedAt', type: 'date', admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'active', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar', description: 'Published.' } },
    { name: 'sortOrder', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
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
  ],
}
