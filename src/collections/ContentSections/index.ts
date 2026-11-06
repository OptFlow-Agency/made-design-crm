import type { CollectionConfig } from 'payload'

import { moduleAccess } from '@/access/modules'

/**
 * Homepage / page sections, banners and calls to action. Each can be published, hidden, scheduled
 * (start and end dates) and reordered without touching storefront code.
 */
export const ContentSections: CollectionConfig = {
  slug: 'content-sections',
  labels: { singular: 'Content section', plural: 'Content sections' },
  // The storefront reads through the /content endpoint, which also applies the schedule.
  access: moduleAccess('content-sections', { publicRead: { active: { equals: true } } }),
  admin: { group: 'Website', useAsTitle: 'name', defaultColumns: ['name', 'placement', 'type', 'active', 'startsAt', 'endsAt', 'sortOrder'] },
  defaultSort: 'sortOrder',
  fields: [
    { name: 'name', type: 'text', required: true, admin: { description: 'Internal name, not shown to visitors.' } },
    {
      type: 'row',
      fields: [
        {
          name: 'placement',
          type: 'select',
          required: true,
          defaultValue: 'home',
          options: [
            { label: 'Homepage', value: 'home' },
            { label: 'Shop page', value: 'shop' },
            { label: 'Collection pages', value: 'collection' },
            { label: 'Product pages', value: 'product' },
            { label: 'Cart / checkout', value: 'checkout' },
            { label: 'Every page (site-wide)', value: 'global' },
          ],
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'banner',
          options: [
            { label: 'Hero', value: 'hero' },
            { label: 'Banner', value: 'banner' },
            { label: 'Call to action', value: 'cta' },
            { label: 'Text block', value: 'text' },
            { label: 'Announcement bar', value: 'announcement' },
            { label: 'Featured products', value: 'featured-products' },
            { label: 'Story / craftsmanship', value: 'story' },
          ],
        },
      ],
    },
    { name: 'kicker', type: 'text' },
    { name: 'heading', type: 'text' },
    { name: 'body', type: 'textarea' },
    {
      type: 'row',
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media' },
        { name: 'imageMobile', type: 'upload', relationTo: 'media', admin: { description: 'Optional portrait crop for phones.' } },
      ],
    },
    {
      name: 'cta',
      type: 'group',
      label: 'Button',
      fields: [
        { name: 'label', type: 'text' },
        { name: 'href', type: 'text', admin: { description: 'Path ("/boutique") or full URL.' } },
      ],
    },
    { name: 'products', type: 'relationship', relationTo: 'products', hasMany: true, admin: { condition: (d) => d?.type === 'featured-products' } },
    { name: 'collection', type: 'relationship', relationTo: 'categories', admin: { condition: (d) => d?.type === 'featured-products' || d?.placement === 'collection' } },
    { name: 'story', type: 'relationship', relationTo: 'stories', admin: { condition: (d) => d?.type === 'story' } },
    {
      type: 'row',
      fields: [
        { name: 'startsAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' }, description: 'Empty = live immediately.' } },
        {
          name: 'endsAt',
          type: 'date',
          admin: { date: { pickerAppearance: 'dayAndTime' }, description: 'Empty = never ends.' },
          validate: (value: Date | null | undefined, { siblingData }: { siblingData?: { startsAt?: string | null } }) =>
            value && siblingData?.startsAt && new Date(value) <= new Date(siblingData.startsAt) ? 'Must end after it starts' : true,
        },
      ],
    },
    { name: 'active', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar', description: 'Untick to hide without deleting.' } },
    { name: 'sortOrder', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
