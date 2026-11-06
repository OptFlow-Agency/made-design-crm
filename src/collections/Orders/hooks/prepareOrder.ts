import type { CollectionBeforeChangeHook } from 'payload'

import { APIError } from 'payload'

import { idOf } from '@/utilities/ids'
import { normalizePhone } from '@/utilities/phone'
import { effectivePrice, findVariant, stockInfo } from '@/utilities/pricing'
import { isPromoUsable, promoDiscount } from '@/utilities/promo'


/**
 * Pass `context: { importingOrder: true }` to the Local API when migrating historical orders:
 * prices, discount, order number and `createdAt` are then stored exactly as given.
 */
export const IMPORTING_ORDER = 'importingOrder'

/**
 * Runs before every save.
 *
 * On create the server is authoritative, like the Maison Sabra `place_order` SQL function:
 * unit prices come from the catalogue (never from the browser), the promo code is validated
 * and the discount, shipping and total are recomputed. On update only the line/total
 * arithmetic is refreshed so staff can still correct an order by hand.
 *
 * Promo rules mirror `apply_promo` in the Supabase schema:
 *  - percent codes: sum over eligible products of floor(price × qty × percent / 100)
 *  - second-item codes: the LAST item sent, one unit, floor(price × percent / 100)
 */
export const prepareOrder: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  const { payload } = req
  const tenant = idOf(data.tenant)
  const importing = Boolean(req.context?.[IMPORTING_ORDER])
  let items: any[] = data.items ?? []

  if (data.phone) data.phone = normalizePhone(data.phone)

  if (operation === 'create' && !importing) {
    if (!items.length) throw new APIError('An order needs at least one item', 400)

    // 1. Snapshot catalogue data and take the price from the product.
    for (const item of items) {
      const product = await payload.findByID({ collection: 'products', id: idOf(item.product) as string, depth: 1, req })
      if (!product.active) throw new APIError(`${product.title} is no longer available`, 400)
      if (item.variantName && !findVariant(product, item.variantName)) throw new APIError(`${product.title}: unknown option "${item.variantName}"`, 400)
      const firstImage = product.gallery?.[0]?.image
      item.productName = product.title
      item.productImage = typeof firstImage === 'object' && firstImage ? firstImage.url : item.productImage
      item.unitPrice = effectivePrice(product, item.variantName)
      item.quantity = Math.max(1, Math.floor(Number(item.quantity) || 1))
    }

    // The "second item" is the last line as sent, so remember it before merging duplicates.
    data._lastProduct = idOf(items[items.length - 1].product)

    // 2. One line per product/variant, like the SQL `group by`.
    const merged: any[] = []
    for (const item of items) {
      const same = merged.find((m) => idOf(m.product) === idOf(item.product) && (m.variantName ?? '') === (item.variantName ?? ''))
      if (same) same.quantity += item.quantity
      else merged.push(item)
    }
    items = data.items = merged

    // 2b. Stock: refuse lines that exceed real availability (only for products that track inventory).
    const settings = tenant
      ? await payload.find({ collection: 'store-settings', where: { tenant: { equals: tenant } }, depth: 0, limit: 1, req })
      : undefined
    for (const item of items) {
      const product = await payload.findByID({ collection: 'products', id: idOf(item.product) as string, depth: 0, req })
      const info = stockInfo(product, item.variantName, settings?.docs[0]?.lowStockThreshold)
      if (!info.purchasable) throw new APIError(`out_of_stock:${product.title}`, 400)
      if (info.quantity != null && item.quantity > info.quantity) throw new APIError(`insufficient_stock:${product.title}:${info.quantity}`, 400)
    }
  }

  // 3. Line totals + subtotal.
  for (const item of items) item.lineTotal = item.unitPrice * item.quantity
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0)
  data.subtotal = subtotal

  if (operation === 'create' && !importing) {
    // 4. Promo code.
    data.discount = 0
    const promoId = idOf(data.promoCode)
    if (promoId) {
      const promo = await payload.findByID({ collection: 'promo-codes', id: promoId as string, depth: 0, req })
      if (!isPromoUsable(promo, subtotal)) throw new APIError('invalid_promo', 400)

      const discount = promoDiscount(
        promo,
        items.map((i) => ({ product: idOf(i.product) as string, unitPrice: i.unitPrice, quantity: i.quantity })),
        data._lastProduct,
      )
      if (discount <= 0) throw new APIError('invalid_promo', 400)
      data.discount = discount
      data.promoCodeText = promo.code
    }
    delete data._lastProduct

    // 5. Shipping: city zone first, then store-wide defaults.
    if (data.shippingCost == null && tenant) {
      const [zones, settings] = await Promise.all([
        payload.find({ collection: 'shipping-zones', where: { and: [{ tenant: { equals: tenant } }, { active: { equals: true } }] }, depth: 0, limit: 100, pagination: false, req }),
        payload.find({ collection: 'store-settings', where: { tenant: { equals: tenant } }, depth: 0, limit: 1, req }),
      ])
      const city = String(data.city ?? '').trim().toLowerCase()
      const zone = zones.docs.find((z) => z.cities?.some((c) => c.city.trim().toLowerCase() === city))
      const freeFrom = zone?.freeAbove ?? settings.docs[0]?.freeShippingFrom
      const cost = zone?.cost ?? settings.docs[0]?.defaultShippingCost ?? 0
      data.shippingCost = freeFrom != null && subtotal - data.discount >= freeFrom ? 0 : cost
    }
  }

  if (operation === 'create' && tenant) {
    // 6. Currency from the tenant; per-tenant order number unless one is supplied (import).
    if (!data.currency) {
      const t = await payload.findByID({ collection: 'tenants', id: tenant as string, depth: 0, req })
      data.currency = t.currency
    }
    if (data.orderNumber == null) {
      const last = await payload.find({ collection: 'orders', where: { tenant: { equals: tenant } }, sort: '-orderNumber', limit: 1, depth: 0, select: { orderNumber: true }, req })
      data.orderNumber = (last.docs[0]?.orderNumber ?? 0) + 1
    }
  }

  data.shippingCost = data.shippingCost ?? 0
  data.discount = data.discount ?? 0
  data.total = Math.max(0, subtotal - data.discount) + data.shippingCost
  return data
}
