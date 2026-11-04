import type { Access } from 'payload'

import { checkRole } from '@/access/utilities'

/**
 * Anyone who can sign in to the CRM: platform admins and tenant admins.
 * The multi-tenant plugin narrows tenant admins to their own tenants on top of this.
 */
export const isStaff: Access = ({ req: { user } }) =>
  Boolean(user && checkRole(['admin', 'tenant-admin'], user))
