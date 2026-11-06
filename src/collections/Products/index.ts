import type { CollectionConfig } from 'payload'

import { moduleAccess } from '@/access/modules'
import { tenantSlugField } from '@/utilities/tenantFields'

/** Icon keys the storefront knows how to draw. A fixed list so admins can't inject markup. */
export const BENEFIT_ICONS = [
  { label: 'Handmade', value: 'hand' },
  { label: 'Gem / premium', value: 'gem' },
  { label: 'Leather', value: 'leather' },
  { label: 'Embroidery / sparkle', value: 'sparkle' },
  { label: 'Bag', value: 'bag' },
  { label: 'Chain / strap', value: 'chain' },
  { label: 'Colour palette', value: 'palette' },
  { label: 'Heritage / Morocco', value: 'heritage' },
  { label: 'Gift', value: 'gift' },
  { label: 'Delivery', value: 'truck' },
  { label: 'Returns', value: 'return' },
  { label: 'Shield / quality', value: 'shield' },
  { label: 'Heart', value: 'heart' },
  { label: 'Ruler / size', value: 'ruler' },
]

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
                { name: 'alt', type: 'text', admin: { description: 'Overrides the media alt text. Describe what the photo shows.' } },
                {
                  name: 'kind',
                  type: 'select',
                  defaultValue: 'front',
                  options: [
                    { label: 'Front', value: 'front' },
                    { label: 'Back', value: 'back' },
                    { label: 'Side', value: 'side' },
                    { label: 'Interior', value: 'interior' },
                    { label: 'Close-up (embroidery, texture, material)', value: 'detail' },
                    { label: 'Lifestyle (worn / carried)', value: 'lifestyle' },
                  ],
                },
              ],
            },
            {
              name: 'shortDescription',
              type: 'textarea',
              maxLength: 220,
              admin: { description: 'One or two lines shown next to the Add to Cart button.' },
            },
            {
              name: 'benefits',
              type: 'array',
              maxRows: 4,
              labels: { singular: 'Benefit', plural: 'Benefits' },
              admin: { description: 'Three to four reasons to choose this model, shown with an icon. Only claim what is true.' },
              fields: [
                { name: 'icon', type: 'select', defaultValue: 'sparkle', options: BENEFIT_ICONS },
                { name: 'title', type: 'text', required: true },
                { name: 'description', type: 'text' },
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
          label: 'Details & craft',
          fields: [
            {
              name: 'details',
              type: 'group',
              fields: [
                { name: 'materials', type: 'textarea', admin: { description: 'e.g. "Cuir pleine fleur, tissu berbère rayé, doublure coton".' } },
                {
                  type: 'row',
                  fields: [
                    { name: 'width', type: 'number', min: 0, admin: { description: 'cm' } },
                    { name: 'height', type: 'number', min: 0, admin: { description: 'cm' } },
                    { name: 'depth', type: 'number', min: 0, admin: { description: 'cm' } },
                    { name: 'strapDrop', type: 'number', min: 0, admin: { description: 'Strap drop, cm' } },
                  ],
                },
                { name: 'weight', type: 'number', min: 0, admin: { description: 'grams' } },
                { name: 'care', type: 'textarea', admin: { description: 'Care instructions.' } },
                { name: 'extra', type: 'array', labels: { singular: 'Detail', plural: 'Other details' }, fields: [
                  { name: 'label', type: 'text', required: true },
                  { name: 'value', type: 'text', required: true },
                ] },
              ],
            },
            {
              name: 'craftsmanship',
              type: 'group',
              admin: { description: 'Product-specific craft story. Hidden on the storefront until "Claims verified" is ticked.' },
              fields: [
                { name: 'title', type: 'text' },
                { name: 'story', type: 'textarea', admin: { description: 'Inspiration and making. Separate paragraphs with a blank line.' } },
                { name: 'image', type: 'upload', relationTo: 'media', admin: { description: 'Close-up of the material or finish.' } },
                {
                  name: 'brandStory',
                  type: 'relationship',
                  relationTo: 'stories',
                  admin: { description: 'Link to a longer brand story.' },
                },
                {
                  name: 'claimsVerified',
                  type: 'checkbox',
                  defaultValue: false,
                  admin: { description: 'Tick only once every claim about making, materials and origin has been checked.' },
                },
              ],
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
            {
              name: 'promotion',
              type: 'group',
              label: 'Scheduled promotion',
              admin: { description: 'A real, dated sale. While live, the sale price replaces the price and the regular price is crossed out.' },
              fields: [
                { name: 'salePrice', type: 'number', min: 0 },
                { name: 'label', type: 'text', admin: { description: 'Badge text, e.g. "Soldes d\'été".' } },
                {
                  type: 'row',
                  fields: [
                    { name: 'startsAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
                    {
                      name: 'endsAt',
                      type: 'date',
                      admin: { date: { pickerAppearance: 'dayAndTime' } },
                      validate: (value: Date | null | undefined, { siblingData }: { siblingData?: { startsAt?: string | null } }) =>
                        value && siblingData?.startsAt && new Date(value) <= new Date(siblingData.startsAt) ? 'The promotion must end after it starts' : true,
                    },
                  ],
                },
              ],
            },
            { name: 'sku', type: 'text' },
            { name: 'trackInventory', type: 'checkbox', defaultValue: false, admin: { description: 'Orders are blocked when stock runs out, and stock is deducted automatically.' } },
            {
              type: 'row',
              fields: [
                {
                  name: 'stock',
                  type: 'number',
                  min: 0,
                  admin: { condition: (data) => Boolean(data?.trackInventory), description: 'Ignored when variants carry their own stock.' },
                },
                {
                  name: 'lowStockThreshold',
                  type: 'number',
                  min: 0,
                  admin: { condition: (data) => Boolean(data?.trackInventory), description: 'Show "Only N left" at or below this. Empty = store default.' },
                },
              ],
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
                { name: 'colorHex', type: 'text', admin: { description: 'Swatch colour, e.g. #a9c1d3.' } },
                { name: 'image', type: 'upload', relationTo: 'media' },
                { name: 'active', type: 'checkbox', defaultValue: true },
              ],
            },
          ],
        },
        {
          name: 'seo',
          label: 'SEO',
          fields: [
            { name: 'title', type: 'text', admin: { description: 'French meta title (about 60 characters).' } },
            { name: 'description', type: 'textarea', admin: { description: 'French meta description (about 155 characters).' } },
            { name: 'titleEn', type: 'text', label: 'Meta title (English)' },
            { name: 'descriptionEn', type: 'textarea', label: 'Meta description (English)' },
            { name: 'image', type: 'upload', relationTo: 'media', label: 'Social share image', admin: { description: 'Defaults to the first gallery image.' } },
            { name: 'canonicalUrl', type: 'text', admin: { description: 'Only if this page duplicates another URL.' } },
            { name: 'noIndex', type: 'checkbox', defaultValue: false },
          ],
        },
      ],
    },
    tenantSlugField('products'),
    { name: 'categories', type: 'relationship', relationTo: 'categories', hasMany: true, admin: { position: 'sidebar' } },
    { name: 'active', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
    { name: 'isNew', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'featured', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar', description: 'Shown in featured selections.' } },
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
