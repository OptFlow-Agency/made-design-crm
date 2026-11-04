import type { CollectionConfig } from 'payload'

import path from 'path'
import { fileURLToPath } from 'url'

import { adminOnly } from '@/access/adminOnly'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/** Logos for the platform itself (Made Design). Not tenant-scoped; only platform admins can upload. */
export const PlatformMedia: CollectionConfig = {
  slug: 'platform-media',
  labels: { singular: 'Platform logo', plural: 'Platform logos' },
  access: { create: adminOnly, delete: adminOnly, read: () => true, update: adminOnly },
  admin: { group: 'Platform', hidden: ({ user }) => !user?.roles?.includes('admin') },
  fields: [{ name: 'alt', type: 'text', required: true }],
  upload: {
    staticDir: path.resolve(dirname, '../../public/platform-media'),
    adminThumbnail: ({ doc }) => (doc?.url as string) ?? null,
  },
}
