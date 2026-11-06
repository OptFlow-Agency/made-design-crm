import type { CollectionConfig } from 'payload'

import { moduleAccess } from '@/access/modules'

import { adjustStock } from './hooks/adjustStock'
import { prepareOrder } from './hooks/prepareOrder'
import { linkCustomer, refreshCustomerStats } from './hooks/syncCustomer'
import { trackStatus } from './hooks/trackStatus'

export const ORDER_STATUSES = [
  { label: 'New', value: 'new' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Returned', value: 'returned' },
]

/**
 * Cash-on-delivery guest orders. Storefronts create orders through a server endpoint
 * (Local API, `overrideAccess: true`) so prices are always recomputed here, never trusted.
 */
export const Orders: CollectionConfig = {
  slug: 'orders',
  access: moduleAccess('orders'),
  admin: {
    group: 'Sales',
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'firstName', 'lastName', 'city', 'total', 'status', 'createdAt'],
  },
  defaultSort: '-createdAt',
  hooks: {
    beforeChange: [prepareOrder, linkCustomer, trackStatus],
    afterChange: [refreshCustomerStats, adjustStock],
  },
  fields: [
    { name: 'orderNumber', type: 'number', index: true, admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      index: true,
      options: ORDER_STATUSES,
      admin: { position: 'sidebar', components: { Cell: '@/collections/Orders/components/StatusCell#StatusCell' } },
    },
    { name: 'customer', type: 'relationship', relationTo: 'customers', index: true, admin: { position: 'sidebar' } },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Delivery',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'firstName', type: 'text', required: true },
                { name: 'lastName', type: 'text', required: true },
              ],
            },
            { name: 'phone', type: 'text', required: true, index: true },
            { name: 'email', type: 'email' },
            {
              type: 'row',
              fields: [
                { name: 'city', type: 'text', required: true },
                { name: 'address', type: 'textarea', required: true },
              ],
            },
            { name: 'customerNotes', type: 'textarea' },
          ],
        },
        {
          label: 'Items & totals',
          fields: [
            {
              name: 'items',
              type: 'array',
              required: true,
              minRows: 1,
              admin: { components: { RowLabel: '@/collections/Orders/components/ItemRowLabel#ItemRowLabel' } },
              fields: [
                { name: 'product', type: 'relationship', relationTo: 'products', required: true },
                { name: 'variantName', type: 'text' },
                { name: 'productName', type: 'text', admin: { readOnly: true, description: 'Snapshot at order time.' } },
                { name: 'productImage', type: 'text', admin: { readOnly: true, components: { Field: '@/collections/Orders/components/ItemImage#ItemImage' } } },
                {
                  type: 'row',
                  fields: [
                    { name: 'quantity', type: 'number', required: true, min: 1, defaultValue: 1 },
                    { name: 'unitPrice', type: 'number', min: 0, admin: { description: 'Filled from the catalogue on creation.' } },
                    { name: 'lineTotal', type: 'number', admin: { readOnly: true } },
                  ],
                },
              ],
            },
            { name: 'promoCode', type: 'relationship', relationTo: 'promo-codes' },
            { name: 'promoCodeText', type: 'text', admin: { readOnly: true, description: 'Code as applied, kept if the promo is later deleted.' } },
            {
              type: 'row',
              fields: [
                { name: 'subtotal', type: 'number', admin: { readOnly: true } },
                { name: 'discount', type: 'number', min: 0 },
                { name: 'shippingCost', type: 'number', min: 0 },
                { name: 'total', type: 'number', admin: { readOnly: true } },
              ],
            },
            { name: 'currency', type: 'text', admin: { readOnly: true } },
          ],
        },
        {
          label: 'Fulfilment',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'paymentMethod',
                  type: 'select',
                  defaultValue: 'cod',
                  options: [
                    { label: 'Cash on delivery', value: 'cod' },
                    { label: 'Bank transfer', value: 'bank-transfer' },
                    { label: 'Card', value: 'card' },
                  ],
                },
                {
                  name: 'paymentStatus',
                  type: 'select',
                  defaultValue: 'pending',
                  options: [
                    { label: 'Pending', value: 'pending' },
                    { label: 'Paid', value: 'paid' },
                    { label: 'Refunded', value: 'refunded' },
                  ],
                },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'carrier', type: 'text' },
                { name: 'trackingNumber', type: 'text' },
              ],
            },
            { name: 'internalNotes', type: 'textarea' },
            {
              name: 'statusHistory',
              type: 'array',
              admin: { readOnly: true },
              fields: [
                { name: 'status', type: 'select', options: ORDER_STATUSES },
                { name: 'changedAt', type: 'date' },
                { name: 'changedBy', type: 'relationship', relationTo: 'users' },
              ],
            },
          ],
        },
        {
          label: 'Attribution',
          fields: [
            {
              name: 'source',
              type: 'select',
              defaultValue: 'store',
              options: [
                { label: 'Storefront', value: 'store' },
                { label: 'Landing page', value: 'landing-page' },
                { label: 'WhatsApp', value: 'whatsapp' },
                { label: 'Manual', value: 'manual' },
              ],
            },
            {
              name: 'attribution',
              type: 'group',
              fields: [
                { name: 'landingPage', type: 'text' },
                { name: 'referrer', type: 'text' },
                { name: 'utmSource', type: 'text' },
                { name: 'utmMedium', type: 'text' },
                { name: 'utmCampaign', type: 'text' },
                { name: 'fbclid', type: 'text' },
              ],
            },
          ],
        },
      ],
    },
  ],
}
