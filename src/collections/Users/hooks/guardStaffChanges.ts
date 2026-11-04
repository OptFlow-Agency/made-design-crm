import type { CollectionBeforeDeleteHook, CollectionBeforeValidateHook } from 'payload'
import { APIError, parseCookies } from 'payload'

import { tenantIdsOf } from '@/access/manageStaff'
import { checkRole } from '@/access/utilities'
import { MODULES } from '@/branding/config'
import { idOf as refId, isId } from '@/utilities/ids'

const PRIVILEGED = ['admin']
const MODULE_VALUES: string[] = MODULES.filter((m) => m !== 'overview')

/** A store admin can give a user the store-admin or staff role, nothing above that; anything else becomes staff. */
const sanitizeRoles = (roles: unknown) => (Array.isArray(roles) && roles.includes('tenant-admin') ? ['tenant-admin'] : ['staff'])
const cleanModules = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((m): m is string => MODULE_VALUES.includes(m)))] : [])
/** A module granted to manage doesn't also need to be listed as view-only. */
const applyModules = (data: Record<string, unknown>) => {
  const manage = cleanModules(data.manageModules)
  data.manageModules = manage
  data.viewModules = cleanModules(data.viewModules).filter((m) => !manage.includes(m))
}
const isPrivileged = (u: { roles?: string[] | null } | null | undefined) => Boolean(u?.roles?.some((r) => PRIVILEGED.includes(r)))

/**
 * Store admins can create and edit store staff, within limits:
 *  - roles are limited to store admin or staff (never a platform admin), and nobody can change their own role or permissions;
 *  - memberships only in tenants they have access to; memberships in tenants they can't see are left as they were.
 * This applies to editing their own account too, so nobody can add themselves to another store.
 */
export const guardStaffChanges: CollectionBeforeValidateHook = async ({ data, operation, originalDoc, req }) => {
  const actor = req.user
  if (!data || !actor || checkRole(['admin'], actor)) return data
  if (req.context?.skipStaffGuard) return data

  const isSelf = operation === 'update' && originalDoc?.id === actor.id
  if (isSelf) {
    // Your own account: name, email, password. Never your role, permissions or stores.
    // `data` is the whole document here, so "not allowed" means "put the stored value back", never "delete the key".
    const keep = data as Record<string, unknown>
    for (const key of ['roles', 'manageModules', 'viewModules']) keep[key] = (originalDoc as Record<string, unknown> | undefined)?.[key]
    keep.tenants = ((originalDoc?.tenants ?? []) as { tenant?: unknown }[]).map((r) => ({
      tenant: refId(r.tenant),
    }))
    return data
  }
  if (!checkRole(['tenant-admin'], actor)) throw new APIError('Only store admins can manage staff', 403)
  if (!isSelf && operation === 'update' && isPrivileged(originalDoc)) throw new APIError('You cannot edit this user', 403)

  const mine = tenantIdsOf(actor)
  const idOf = (r: { tenant?: unknown }) => refId(r.tenant) as string

  if (operation === 'create') {
    data.roles = sanitizeRoles(data.roles)
    applyModules(data)
    let rows = ((data.tenants ?? []) as { tenant?: unknown }[]).filter((r) => mine.includes(idOf(r)))
    if (!rows.length && !(data.tenants as unknown[] | undefined)?.length) {
      // Nothing chosen: use the store the editor is currently working in, or their only store.
      const selected = parseCookies(req.headers).get('payload-tenant') ?? ''
      const fallback = mine.includes(selected) ? selected : mine.length === 1 ? mine[0] : undefined
      if (fallback != null) rows = [{ tenant: fallback }]
    }
    if (!rows.length) throw new APIError('Assign the user to a store you manage', 400)
    data.tenants = rows.map((r) => ({ tenant: idOf(r) }))
    return data
  }

  if ('roles' in data) data.roles = sanitizeRoles(data.roles)
  if ('manageModules' in data || 'viewModules' in data) {
    data.manageModules ??= originalDoc?.manageModules
    data.viewModules ??= originalDoc?.viewModules
    applyModules(data)
  }

  if (data.tenants) {
    const submitted = (data.tenants as { tenant?: unknown }[])
    const kept = (originalDoc?.tenants ?? []).filter((r: { tenant?: unknown }) => !mine.includes(idOf(r))) // out of this user's reach
    const allowed = submitted.filter((r) => mine.includes(idOf(r)))
    data.tenants = [...kept.map((r: { tenant?: unknown }) => ({ tenant: idOf(r) })), ...allowed.map((r) => ({ tenant: idOf(r) }))]
  }
  return data
}

export const guardStaffDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const actor = req.user
  if (!actor || checkRole(['admin'], actor)) return
  const target = await req.payload.findByID({ collection: 'users', id, depth: 0, overrideAccess: true })
  if (isPrivileged(target)) throw new APIError('You cannot delete this user', 403)
}

/**
 * Creating a user while working inside a store (the "Filter by Tenant" selector) puts them in that store
 * when no store was chosen, for platform admins too. Platform-admin accounts stay tenant-less on purpose.
 */
export const defaultTenantFromSelection: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (operation !== 'create' || !data || !req.user || req.context?.skipStaffGuard) return data
  if ((data.tenants as unknown[] | undefined)?.length) return data
  if ((data.roles as string[] | undefined)?.includes('admin')) return data

  const selected = parseCookies(req.headers).get('payload-tenant')
  if (!isId(selected)) return data
  const exists = await req.payload.count({ collection: 'tenants', where: { id: { equals: selected } }, overrideAccess: true, req })
  if (exists.totalDocs > 0) data.tenants = [{ tenant: selected }]
  return data
}
