/**
 * Price and availability rules, shared by the public catalogue endpoint, the promo endpoint and the
 * order hook, so what the storefront displays is exactly what the server charges and enforces.
 */

export type VariantLike = {
  name: string
  price?: number | null
  stock?: number | null
  active?: boolean | null
}

export type ProductLike = {
  price: number
  compareAtPrice?: number | null
  promotion?: { salePrice?: number | null; startsAt?: string | null; endsAt?: string | null } | null
  trackInventory?: boolean | null
  stock?: number | null
  lowStockThreshold?: number | null
  variants?: VariantLike[] | null
}

/** Store-wide fallback used when neither the product nor the store settings define a threshold. */
export const DEFAULT_LOW_STOCK = 5

export const isPromotionLive = (p: ProductLike, now = Date.now()): boolean => {
  const promo = p.promotion
  if (!promo?.salePrice || promo.salePrice <= 0) return false
  if (promo.startsAt && new Date(promo.startsAt).getTime() > now) return false
  if (promo.endsAt && new Date(promo.endsAt).getTime() < now) return false
  return true
}

export const findVariant = (p: ProductLike, variantName?: string | null): VariantLike | undefined =>
  variantName ? p.variants?.find((v) => v.name === variantName) : undefined

/**
 * The price a customer pays for one unit. A scheduled promotion wins over the regular price while it
 * is live (only if it really is lower); a variant price replaces the base price before that check.
 */
export const effectivePrice = (p: ProductLike, variantName?: string | null, now = Date.now()): number => {
  const base = findVariant(p, variantName)?.price ?? p.price
  return isPromotionLive(p, now) && p.promotion!.salePrice! < base ? p.promotion!.salePrice! : base
}

/**
 * The crossed-out price to show next to {@link effectivePrice}, or null when nothing was genuinely
 * discounted. A live scheduled promotion crosses out the regular price; otherwise the manually
 * entered compare-at price is used.
 */
export const strikePrice = (p: ProductLike, variantName?: string | null, now = Date.now()): number | null => {
  const current = effectivePrice(p, variantName, now)
  const base = findVariant(p, variantName)?.price ?? p.price
  const candidate = isPromotionLive(p, now) && current < base ? base : p.compareAtPrice
  return candidate && candidate > current ? candidate : null
}

export type StockStatus = 'untracked' | 'in_stock' | 'low_stock' | 'out_of_stock'

export type StockInfo = { status: StockStatus; quantity: number | null; purchasable: boolean }

/**
 * Real availability. Products that do not track inventory are always purchasable and nothing is
 * claimed about quantity ("untracked"). A tracked product with variants is judged per variant.
 */
export const stockInfo = (p: ProductLike, variantName: string | null | undefined, storeThreshold?: number | null): StockInfo => {
  if (!p.trackInventory) return { status: 'untracked', quantity: null, purchasable: true }

  const variant = findVariant(p, variantName)
  if (variant?.active === false) return { status: 'out_of_stock', quantity: 0, purchasable: false }

  // Without a chosen variant, a product that has variants is judged on the sum of them.
  const raw = variant ? variant.stock : p.variants?.length ? totalStock(p) : p.stock
  const quantity = Math.max(0, Number(raw ?? 0))
  const threshold = p.lowStockThreshold ?? storeThreshold ?? DEFAULT_LOW_STOCK

  if (quantity <= 0) return { status: 'out_of_stock', quantity: 0, purchasable: false }
  return { status: quantity <= threshold ? 'low_stock' : 'in_stock', quantity, purchasable: true }
}

/** Total units for a product: the sum of its variants when it has any, otherwise its own stock. */
export const totalStock = (p: ProductLike): number | null => {
  if (!p.trackInventory) return null
  return p.variants?.length ? p.variants.reduce((s, v) => s + (v.active === false ? 0 : Math.max(0, v.stock ?? 0)), 0) : Math.max(0, p.stock ?? 0)
}
