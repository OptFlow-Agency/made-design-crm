import type { GlobalConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { brandingGroup } from '@/branding/fields'

/**
 * The platform itself: Made Design, the owner of this CRM. It is not a tenant.
 * Its brand styles the login page and what platform admins see while no store is selected.
 * Readable by anyone (the login page needs it); only platform admins can change it.
 */
export const PlatformSettings: GlobalConfig = {
  slug: 'platform-settings',
  access: { read: () => true, update: adminOnly },
  admin: { group: 'Platform', hidden: ({ user }) => !user?.roles?.includes('admin') },
  fields: [{ name: 'name', type: 'text', required: true, defaultValue: 'Made Design' }, brandingGroup('platform-media')],
}
