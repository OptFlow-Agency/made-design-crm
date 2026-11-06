import type { Plugin } from 'payload'

import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { s3Storage } from '@payloadcms/storage-s3'

import { checkRole } from '@/access/utilities'

/**
 * One CRM, many client stores. Every collection listed here gets a `tenant` field and is
 * automatically filtered to the tenant(s) the signed-in user belongs to. Platform admins
 * (`roles` includes `admin`) see every tenant.
 */
export const plugins: Plugin[] = [
  multiTenantPlugin({
    tenantsSlug: 'tenants',
    // The Tenants list is the agency's directory of stores: platform admins must see every store there, not just the selected one.
    // Store admins stay limited to their own store by the plugin's access constraint (useTenantsCollectionAccess).
    useTenantsListFilter: false,
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
      stories: {},
      'content-sections': {},
      'shipping-zones': {},
      'store-settings': { isGlobal: true },
    },
  }),
  // Supabase Storage (S3-compatible). Enabled only when the bucket is configured, otherwise media stays on local disk.
  ...(process.env.S3_BUCKET
    ? [
        s3Storage({
          collections: { media: { generateFileURL: ({ filename, prefix }) => `${process.env.S3_PUBLIC_URL}/${[prefix, filename].filter(Boolean).join('/')}` } },
          bucket: process.env.S3_BUCKET,
          config: {
            endpoint: process.env.S3_ENDPOINT,
            region: process.env.S3_REGION || 'us-east-1',
            forcePathStyle: true,
            credentials: {
              accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
            },
          },
        }),
      ]
    : []),
]
