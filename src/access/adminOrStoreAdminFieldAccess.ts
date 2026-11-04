import type { FieldAccess } from 'payload'

import { checkRole } from '@/access/utilities'

/** Platform admins and store admins. The Users guard hook decides what a store admin may actually set. */
export const adminOrStoreAdminFieldAccess: FieldAccess = ({ req: { user } }) => Boolean(user && checkRole(['admin', 'tenant-admin'], user))
