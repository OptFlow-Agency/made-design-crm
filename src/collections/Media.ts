import type { CollectionConfig } from 'payload'

import path from 'path'
import { fileURLToPath } from 'url'

import { moduleAccess } from '@/access/modules'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Media: CollectionConfig = {
  admin: {
    group: 'Catalogue',
  },
  slug: 'media',
  access: moduleAccess('media', { publicRead: true }),
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    staticDir: path.resolve(dirname, '../../public/media'),
    // Storefronts serve responsive variants (the Maison Sabra site uses 480 / 800 / 1000 wide).
    imageSizes: [
      { name: 'thumb', width: 480 },
      { name: 'medium', width: 800 },
    ],
    adminThumbnail: 'thumb',
  },
}
