import type { CollectionConfig } from 'payload'

import { moduleAccess } from '@/access/modules'
import { normalizePhone } from '@/utilities/phone'
import { uniquePerTenant } from '@/utilities/tenantFields'

/**
 * CRM contact records. Not auth users: storefront checkout is guest-only, so a
 * customer is identified by phone number within a tenant and created/updated
 * automatically when an order is placed.
 */
export const Customers: CollectionConfig = {
  slug: 'customers',
  access: moduleAccess('customers'),
  admin: {
    group: 'Sales',
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'phone', 'city', 'ordersCount', 'totalSpent', 'lastOrderAt'],
  },
  fields: [
    {
      name: 'fullName',
      type: 'text',
      admin: { readOnly: true },
      hooks: {
        beforeChange: [
          ({ siblingData }) => [siblingData?.firstName, siblingData?.lastName].filter(Boolean).join(' ').trim(),
        ],
      },
    },
    {
      type: 'row',
      fields: [
        { name: 'firstName', type: 'text', required: true },
        { name: 'lastName', type: 'text', required: true },
      ],
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
      index: true,
      hooks: { beforeValidate: [({ value }) => (value ? normalizePhone(value) : value)] },
      validate: uniquePerTenant('customers', 'phone'),
    },
    { name: 'email', type: 'email' },
    {
      type: 'row',
      fields: [
        { name: 'city', type: 'text' },
        { name: 'address', type: 'textarea' },
      ],
    },
    { name: 'notes', type: 'textarea' },
    { name: 'tags', type: 'array', fields: [{ name: 'tag', type: 'text', required: true }] },
    { name: 'marketingConsent', type: 'checkbox', defaultValue: false },
    {
      name: 'blocked',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Flag customers with repeated refused deliveries.' },
    },
    {
      name: 'source',
      type: 'select',
      options: [
        { label: 'Storefront', value: 'store' },
        { label: 'Landing page', value: 'landing-page' },
        { label: 'WhatsApp', value: 'whatsapp' },
        { label: 'Instagram', value: 'instagram' },
        { label: 'Manual', value: 'manual' },
      ],
    },
    // Maintained by the Orders hooks.
    {
      type: 'row',
      fields: [
        { name: 'ordersCount', type: 'number', defaultValue: 0, admin: { readOnly: true } },
        { name: 'totalSpent', type: 'number', defaultValue: 0, admin: { readOnly: true } },
        { name: 'lastOrderAt', type: 'date', admin: { readOnly: true } },
      ],
    },
    { name: 'orders', type: 'join', collection: 'orders', on: 'customer', admin: { allowCreate: false } },
  ],
}
