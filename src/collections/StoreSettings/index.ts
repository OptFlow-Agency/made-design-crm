import type { CollectionConfig } from 'payload'

import { moduleAccess } from '@/access/modules'

/** One document per tenant (registered with `isGlobal` in the multi-tenant plugin). */
export const StoreSettings: CollectionConfig = {
  slug: 'store-settings',
  labels: { singular: 'Store settings', plural: 'Store settings' },
  access: moduleAccess('store-settings', { publicRead: true }),
  admin: { group: 'Store', useAsTitle: 'storeName' },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Brand',
          fields: [
            { name: 'storeName', type: 'text', required: true },
            { name: 'tagline', type: 'text' },
            { name: 'description', type: 'textarea' },
            { name: 'logo', type: 'upload', relationTo: 'media' },
            { name: 'ogImage', type: 'upload', relationTo: 'media' },
            { name: 'announcement', type: 'text', admin: { description: 'Top-of-site announcement bar.' } },
          ],
        },
        {
          label: 'Contact',
          fields: [
            { name: 'phone', type: 'text' },
            { name: 'whatsapp', type: 'text', admin: { description: 'International format without "+", e.g. 212612345678.' } },
            { name: 'email', type: 'email' },
            { name: 'instagram', type: 'text' },
            { name: 'facebook', type: 'text' },
            { name: 'tiktok', type: 'text' },
          ],
        },
        {
          label: 'Shipping',
          fields: [
            {
              name: 'defaultShippingCost',
              type: 'number',
              min: 0,
              defaultValue: 0,
              admin: { description: 'Used when no shipping zone matches the order city.' },
            },
            {
              name: 'freeShippingFrom',
              type: 'number',
              min: 0,
              admin: { description: 'Subtotal from which delivery is free. Empty = never.' },
            },
            { name: 'deliveryDelay', type: 'text', admin: { description: 'e.g. "2 à 4 jours ouvrés selon la ville".' } },
            {
              name: 'shippingDestinations',
              type: 'array',
              labels: { singular: 'Destination', plural: 'Destinations' },
              admin: { description: 'Countries / areas you deliver to, shown on product pages. City prices come from Shipping zones.' },
              fields: [
                { name: 'name', type: 'text', required: true },
                { name: 'cost', type: 'number', min: 0 },
                { name: 'estimate', type: 'text', admin: { description: 'e.g. "5 à 8 jours".' } },
                { name: 'note', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Checkout',
          fields: [
            {
              name: 'lowStockThreshold',
              type: 'number',
              min: 0,
              defaultValue: 5,
              admin: { description: 'Show "Only N left" when real stock is at or below this (products can override it).' },
            },
            {
              name: 'paymentMethods',
              type: 'array',
              labels: { singular: 'Payment method', plural: 'Payment methods' },
              admin: { description: 'Shown on product pages and at checkout. List only what you really accept.' },
              fields: [
                { name: 'label', type: 'text', required: true },
                {
                  name: 'key',
                  type: 'select',
                  required: true,
                  defaultValue: 'cod',
                  options: [
                    { label: 'Cash on delivery', value: 'cod' },
                    { label: 'Bank transfer', value: 'bank-transfer' },
                    { label: 'Card', value: 'card' },
                    { label: 'Other', value: 'other' },
                  ],
                },
                { name: 'description', type: 'text' },
                { name: 'icon', type: 'upload', relationTo: 'media' },
                { name: 'enabled', type: 'checkbox', defaultValue: true },
              ],
            },
            {
              name: 'returns',
              type: 'group',
              fields: [
                { name: 'windowDays', type: 'number', min: 0, admin: { description: 'Days after delivery to request a return or exchange.' } },
                { name: 'summary', type: 'textarea', admin: { description: 'Short, plain-language conditions shown on product pages.' } },
                { name: 'exchangeConditions', type: 'textarea' },
              ],
            },
            {
              name: 'trustHighlights',
              type: 'array',
              maxRows: 6,
              admin: { description: 'Short reassurance blocks (delivery, returns, support). Only verified facts.' },
              fields: [
                { name: 'title', type: 'text', required: true },
                { name: 'text', type: 'text' },
                { name: 'linkLabel', type: 'text' },
                { name: 'linkUrl', type: 'text' },
              ],
            },
            {
              name: 'checkout',
              type: 'group',
              fields: [
                { name: 'guestCheckout', type: 'checkbox', defaultValue: true, admin: { description: 'No account required.' } },
                { name: 'askEmail', type: 'checkbox', defaultValue: false, admin: { description: 'Show an optional email field (for the order confirmation).' } },
                { name: 'confirmationMessage', type: 'textarea', admin: { description: 'What happens after the order is placed.' } },
                { name: 'notifyEmail', type: 'email', admin: { description: 'Receives a notification for every new order.' } },
              ],
            },
          ],
        },
        {
          label: 'Tracking & policies',
          fields: [
            { name: 'metaPixelId', type: 'text' },
            { name: 'tiktokPixelId', type: 'text' },
            { name: 'googleAnalyticsId', type: 'text' },
            {
              name: 'trackedEvents',
              type: 'select',
              hasMany: true,
              defaultValue: ['product_view', 'variant_select', 'add_to_cart', 'remove_from_cart', 'begin_checkout', 'purchase', 'promo_code'],
              options: [
                { label: 'Product view', value: 'product_view' },
                { label: 'Variant selection', value: 'variant_select' },
                { label: 'Add to cart', value: 'add_to_cart' },
                { label: 'Remove from cart', value: 'remove_from_cart' },
                { label: 'Begin checkout', value: 'begin_checkout' },
                { label: 'Purchase', value: 'purchase' },
                { label: 'Promo code used', value: 'promo_code' },
              ],
              admin: { description: 'Events the storefront should send to the pixels above.' },
            },
            {
              name: 'policies',
              type: 'group',
              fields: [
                { name: 'delivery', type: 'text' },
                { name: 'returns', type: 'text' },
                { name: 'terms', type: 'text' },
                { name: 'privacy', type: 'text' },
              ],
            },
          ],
        },
      ],
    },
  ],
}
