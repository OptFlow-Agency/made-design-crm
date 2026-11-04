import type { Access, Where } from 'payload'

import { checkRole } from '@/access/utilities'
import { idOf } from '@/utilities/ids'

type Row = { tenant?: unknown }

export const tenantIdsOf = (user: { tenants?: Row[] | null } | null | undefined) =>
  (user?.tenants ?? []).map((r) => idOf(r.tenant)).filter((id): id is string => id != null)

/**
 * Staff management. Platform admins manage everyone. Store admins can see and manage the
 * users that belong to a store they have access to (plus their own account). The privileged-role and
 * tenant-membership rules are enforced again in `guardStaffChanges`, which is the authoritative check.
 */
export const manageStaff: Access = ({ req: { user } }) => {
  if (!user) return false
  if (checkRole(['admin'], user)) return true
  if (checkRole(['staff'], user) && !checkRole(['tenant-admin'], user)) return { id: { equals: user.id } } // limited staff: own account only
  if (!checkRole(['tenant-admin'], user)) return false
  const ids = tenantIdsOf(user)
  const scope: Where = { or: [{ id: { equals: user.id } }, { 'tenants.tenant': { in: ids.length ? ids : ['none'] } }] }
  return scope
}

/** Creating staff is allowed for platform admins and store admins (limited by the guard hook). */
export const canCreateStaff: Access = ({ req: { user } }) => Boolean(user && checkRole(['admin', 'tenant-admin'], user))

/** Deleting staff: same scope as `manageStaff`, but never your own account. */
export const deleteStaff: Access = async (args) => {
  const user = args.req.user
  if (!user) return false
  if (checkRole(['admin'], user)) return true
  const scope = await manageStaff(args)
  if (!scope || scope === true) return false
  const own: Where = { and: [scope, { id: { not_equals: user.id } }] }
  return own
}
