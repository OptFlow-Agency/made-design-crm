import type { CollectionBeforeDeleteHook, CollectionConfig, CollectionSlug } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { isStaff } from '@/access/isStaff'
import { brandingFields } from '@/branding/fields'
import { captureFirstAdmin, createFirstAdmin } from './hooks/firstAdmin'
import { slugify } from '@/utilities/slugify'

const TENANT_SCOPED: CollectionSlug[] = [
  'orders',
  'reviews',
  'offers',
  'promo-codes',
  'shipping-zones',
  'customers',
  'products',
  'categories',
  'media',
  'store-settings',
]

/**
 * The multi-tenant plugin cleans up in an `afterDelete` hook, but the tenant foreign keys are
 * `ON DELETE SET NULL`, so by then the rows no longer match the tenant and are orphaned.
 * Delete a store's data while it can still be found.
 */
const deleteTenantData: CollectionBeforeDeleteHook = async ({ id, req }) => {
  for (const collection of TENANT_SCOPED) {
    await req.payload.delete({ collection, where: { tenant: { equals: id } }, req })
  }

  // Staff rows referencing the tenant are NOT NULL, so detach them before the tenant row goes.
  const staff = await req.payload.find({
    collection: 'users',
    where: { 'tenants.tenant': { equals: id } },
    depth: 0,
    limit: 0,
    pagination: false,
    req,
  })
  for (const user of staff.docs) {
    await req.payload.update({
      collection: 'users',
      id: user.id,
      data: { tenants: (user.tenants ?? []).filter((row) => (typeof row.tenant === 'object' ? row.tenant.id : row.tenant) !== id) },
      req,
    })
  }
}

/**
 * One document per client store. Every other tenant-scoped collection points
 * here through the `tenant` field added by the multi-tenant plugin.
 */
export const Tenants: CollectionConfig = {
  slug: 'tenants',
  access: {
    // Only platform admins (the Made Design team) create tenants.
    create: adminOnly,
    delete: adminOnly,
    // Tenant admins can read their own tenant (plugin narrows this); storefronts resolve a tenant by domain.
    read: () => true,
    update: isStaff,
  },
  hooks: { beforeValidate: [captureFirstAdmin], afterChange: [createFirstAdmin], beforeDelete: [deleteTenantData] },
  admin: {
    group: 'Platform',
    // Limited staff (a store admin gave them specific areas) have no business in the stores list.
    hidden: ({ user }) => !user?.roles?.some((r: string) => r === 'admin' || r === 'tenant-admin'),
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'domain', 'status'],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Short identifier, e.g. `maisonsabra`.' },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            const source = value || data?.name
            return typeof source === 'string' ? slugify(source) : value
          },
        ],
      },
    },
    {
      name: 'domain',
      type: 'text',
      unique: true,
      index: true,
      admin: { description: 'Public storefront domain, e.g. `maisonsabra.ma`. Used to resolve the tenant.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Onboarding', value: 'onboarding' },
        { label: 'Suspended', value: 'suspended' },
      ],
      access: { update: adminOnlyFieldAccess },
    },
    {
      name: 'currency',
      type: 'select',
      required: true,
      defaultValue: 'MAD',
      options: [
        { label: 'Moroccan dirham (MAD)', value: 'MAD' },
        { label: 'Euro (EUR)', value: 'EUR' },
        { label: 'US dollar (USD)', value: 'USD' },
      ],
    },
    {
      name: 'locale',
      type: 'select',
      required: true,
      defaultValue: 'fr',
      options: [
        { label: 'Français', value: 'fr' },
        { label: 'العربية', value: 'ar' },
        { label: 'English', value: 'en' },
      ],
    },
    // First admin: only on the create form, never stored on the tenant (see captureFirstAdmin).
    ...(['adminName', 'adminEmail', 'adminPassword'] as const).map((name) => ({
      name,
      type: 'text' as const,
      virtual: true,
      access: { read: () => false, update: () => false },
      admin: {
        condition: (data: Record<string, unknown>) => !data?.id,
        description:
          name === 'adminName'
            ? 'First admin for this store: they can then manage the store and its staff themselves. Leave empty to add one later.'
            : name === 'adminPassword'
              ? 'Minimum 10 characters. Share it securely; the admin should change it after signing in.'
              : undefined,
      },
    })),
    ...brandingFields,
  ],
}
