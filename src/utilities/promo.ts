/**
 * Promo-code rules, shared by the order hook and the public promo endpoint so a code can never
 * validate at one price and charge another. Mirrors Maison Sabra's Supabase `apply_promo`:
 *  - percent codes: sum over eligible products of floor(price × qty × percent / 100)
 *  - second-item codes: the LAST item sent, one unit, floor(price × percent / 100)
 */
type Id = number | string

export type PromoLike = {
  active?: boolean | null
  startsAt?: string | null
  endsAt?: string | null
  usageLimit?: number | null
  usageCount?: number | null
  minSubtotal?: number | null
  percent: number
  secondItemOnly?: boolean | null
  products?: (Id | { id: Id })[] | null
}

export type PricedLine = { product: Id; unitPrice: number; quantity: number }

const idOf = (ref: Id | { id: Id }): Id => (typeof ref === 'object' ? ref.id : ref)

export const isPromoUsable = (promo: PromoLike, subtotal: number, now = Date.now()): boolean =>
  Boolean(promo.active) &&
  !(promo.startsAt && new Date(promo.startsAt).getTime() > now) &&
  !(promo.endsAt && new Date(promo.endsAt).getTime() < now) &&
  !(promo.usageLimit != null && (promo.usageCount ?? 0) >= promo.usageLimit) &&
  !(promo.minSubtotal != null && subtotal < promo.minSubtotal)

/**
 * @param lines        one line per product (duplicates already merged)
 * @param lastProduct  the product on the last line exactly as the customer sent it
 * @returns the discount in currency units; 0 means the code does not apply to this cart
 */
export const promoDiscount = (promo: PromoLike, lines: PricedLine[], lastProduct: Id): number => {
  const scope = (promo.products ?? []).map(idOf)
  const inScope = (product: Id) => scope.length === 0 || scope.includes(product)

  if (promo.secondItemOnly) {
    const last = lines.find((l) => l.product === lastProduct)
    return last && inScope(lastProduct) ? Math.floor((last.unitPrice * promo.percent) / 100) : 0
  }
  return lines
    .filter((l) => inScope(l.product))
    .reduce((sum, l) => sum + Math.floor((l.unitPrice * l.quantity * promo.percent) / 100), 0)
}
