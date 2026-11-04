import type { Access, CollectionSlug, Where } from 'payload'

import { MODULES, MODULE_COLLECTIONS, type TenantModule } from '@/branding/config'

type StaffUser = { roles?: string[] | null; manageModules?: string[] | null; viewModules?: string[] | null }

/** Platform admins and store admins can do everything in their store. Everyone else ("staff") only what they were granted. */
export const hasFullAccess = (user: StaffUser | null | undefined) => Boolean(user?.roles?.some((r) => r === 'admin' || r === 'tenant-admin'))

const owner = Object.fromEntries(Object.entries(MODULE_COLLECTIONS).flatMap(([m, slugs]) => slugs.map((s) => [s, m]))) as Partial<Record<CollectionSlug, TenantModule>>

/** Modules whose holders may also *read* a collection, because their screens show its data (an order lists products, customers, ...). */
const ALSO_READABLE_BY: Partial<Record<CollectionSlug, TenantModule[]>> = {
  media: MODULES.filter((m) => m !== 'overview'),
  products: ['orders', 'promotions', 'website'],
  customers: ['orders'],
  'promo-codes': ['orders'],
  'shipping-zones': ['orders'],
}

/** Modules whose managers may also create, edit and delete a collection (images are uploaded from the product and content screens). */
const ALSO_WRITABLE_BY: Partial<Record<CollectionSlug, TenantModule[]>> = { media: ['products', 'website'] }

const manages = (user: StaffUser, m?: TenantModule) => Boolean(m && user.manageModules?.includes(m))
const views = (user: StaffUser, m?: TenantModule) => Boolean(m && (user.viewModules?.includes(m) || user.manageModules?.includes(m)))

export const canRead = (user: StaffUser, slug: CollectionSlug) =>
  hasFullAccess(user) || views(user, owner[slug]) || Boolean(ALSO_READABLE_BY[slug]?.some((m) => views(user, m)))

export const canWrite = (user: StaffUser, slug: CollectionSlug) =>
  hasFullAccess(user) || manages(user, owner[slug]) || Boolean(ALSO_WRITABLE_BY[slug]?.some((m) => manages(user, m)))

/** Navigation: the collections a user has no module for (display only; the access functions above are what is enforced). */
export function hiddenCollectionsFor(user: StaffUser | null | undefined, tenantModules: TenantModule[]): string[] {
  const hidden = new Set<string>()
  for (const [m, slugs] of Object.entries(MODULE_COLLECTIONS) as [Exclude<TenantModule, 'overview'>, CollectionSlug[]][]) {
    const offByTenant = tenantModules.length > 0 && !tenantModules.includes(m)
    const offByUser = Boolean(user) && !hasFullAccess(user) && !views(user!, m)
    if (offByTenant || offByUser) slugs.forEach((s) => hidden.add(s))
  }
  return [...hidden]
}

/**
 * Per-collection access for a store. Anonymous visitors get `publicRead` (what the storefront may see directly),
 * signed-in staff get what their role and modules allow. The multi-tenant plugin then limits everything to their store.
 */
export const moduleAccess = (slug: CollectionSlug, opts: { publicRead?: boolean | Where } = {}) => {
  const write: Access = ({ req: { user } }) => Boolean(user) && canWrite(user as StaffUser, slug)
  const read: Access = ({ req: { user } }) => (user ? canRead(user as StaffUser, slug) : (opts.publicRead ?? false))
  return { create: write, delete: write, read, update: write }
}
