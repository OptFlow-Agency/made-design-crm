import type { CollectionConfig } from 'payload'

import { moduleAccess } from '@/access/modules'

/** Store-level customer quotes for the storefront (home page, about page...). Unlike Reviews, they are not tied to a product. */
export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  access: moduleAccess('testimonials', { publicRead: { active: { equals: true } } }),
  admin: { group: 'Website', useAsTitle: 'author', defaultColumns: ['author', 'quote', 'rating', 'featured', 'active'] },
  defaultSort: 'sortOrder',
  fields: [
    { name: 'author', type: 'text', required: true, admin: { description: 'e.g. "Salma B." — first name and initial.' } },
    { name: 'role', type: 'text', admin: { description: 'Optional line under the name: a city, a job or "Verified customer".' } },
    { name: 'address', type: 'text', admin: { description: 'Where the customer lives or ships to (city, region...). Shown only if the storefront chooses to.' } },
    { name: 'quote', type: 'textarea', required: true, maxLength: 600 },
    { name: 'rating', type: 'number', min: 1, max: 5 },
    { name: 'photo', type: 'upload', relationTo: 'media', admin: { description: 'Portrait of the customer, or a photo of their order.' } },
    { name: 'link', type: 'text', admin: { description: 'Optional link to the original post (Instagram, Google...).' } },
    { name: 'featured', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar', description: 'Highlight on the home page.' } },
    { name: 'active', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar', description: 'Published on the storefront.' } },
    { name: 'sortOrder', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
