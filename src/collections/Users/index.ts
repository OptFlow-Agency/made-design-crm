import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { adminOrStoreAdminFieldAccess } from '@/access/adminOrStoreAdminFieldAccess'
import { MODULE_LABELS, MODULES } from '@/branding/config'
import { canCreateStaff, deleteStaff, manageStaff } from '@/access/manageStaff'
import { checkRole } from '@/access/utilities'

import { defaultTenantFromSelection, guardStaffChanges, guardStaffDelete } from './hooks/guardStaffChanges'
import { ensureFirstUserIsAdmin } from './hooks/ensureFirstUserIsAdmin'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: ({ req: { user } }) => checkRole(['admin', 'tenant-admin', 'staff'], user),
    create: canCreateStaff,
    delete: deleteStaff,
    read: manageStaff,
    unlock: adminOnly,
    update: manageStaff,
  },
  admin: {
    group: 'Platform',
    hidden: ({ user }) => !user?.roles?.some((r: string) => r === 'admin' || r === 'tenant-admin'),
    defaultColumns: ['name', 'email', 'roles'],
    useAsTitle: 'name',
  },
  hooks: { beforeValidate: [defaultTenantFromSelection, guardStaffChanges], beforeDelete: [guardStaffDelete] },
  auth: {
    tokenExpiration: 1209600,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'roles',
      type: 'select',
      access: {
        create: adminOrStoreAdminFieldAccess,
        read: adminOrStoreAdminFieldAccess,
        update: adminOrStoreAdminFieldAccess,
      },
      // Least privilege: a user nobody has given a role to can sign in but cannot see anything.
      defaultValue: ['staff'],
      hasMany: true,
      hooks: {
        beforeChange: [ensureFirstUserIsAdmin],
      },
      options: [
        { label: 'Platform admin (Made Design: all stores)', value: 'admin' },
        { label: 'Store admin (everything in the store, manages its staff)', value: 'tenant-admin' },
        { label: 'Staff (only the areas you tick below)', value: 'staff' },
      ],
    },
    {
      // Which stores the user belongs to. Written by the sync/guard hooks and platform admins; the form only
      // shows it to platform admins. API-level access stays open because Payload wipes an array whose update access is
      // denied; `guardStaffChanges` is what limits store admins (see tests/int/first-admin.int.spec.ts).
      name: 'tenants',
      type: 'array',
      saveToJWT: true,
      access: { create: adminOrStoreAdminFieldAccess, update: adminOrStoreAdminFieldAccess },
      admin: { condition: (_data, _siblingData, { user }) => checkRole(['admin'], user as never) },
      fields: [{ name: 'tenant', type: 'relationship', relationTo: 'tenants', index: true, required: true, saveToJWT: true }],
    },
    ...(
      [
        ['manageModules', 'Can manage', 'View, create, edit and delete in these areas.'],
        ['viewModules', 'Can view only', 'See these areas but not change them.'],
      ] as const
    ).map(([name, label, description]) => ({
      name,
      label,
      type: 'select' as const,
      hasMany: true,
      options: MODULES.filter((m) => m !== 'overview').map((m) => ({ label: MODULE_LABELS[m], value: m })),
      access: { create: adminOrStoreAdminFieldAccess, update: adminOrStoreAdminFieldAccess },
      admin: {
        description,
        condition: (data: { roles?: string[] }) => !data?.roles?.some((r) => r === 'admin' || r === 'tenant-admin'),
      },
    })),
  ],
}
