import type { Plugin } from 'payload'

import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'

import { checkRole } from '@/access/utilities'

/**
 * One CRM, many client stores. Every collection listed here gets a `tenant` field and is
 * automatically filtered to the tenant(s) the signed-in user belongs to. Platform admins
 * (`roles` includes `admin`) see every tenant.
 */
export const plugins: Plugin[] = [
  multiTenantPlugin({
    tenantsSlug: 'tenants',
    // The memberships field is declared on Users (`tenants`), so it can be hidden from the form for everyone but platform admins.
    tenantsArrayField: { includeDefaultField: false },
    userHasAccessToAllTenants: (user) => checkRole(['admin'], user as never),
    collections: {
      media: {},
      categories: {},
      products: {},
      customers: {},
      orders: {},
      'promo-codes': {},
      offers: {},
      reviews: {},
      'shipping-zones': {},
      'store-settings': { isGlobal: true },
    },
  }),
]
