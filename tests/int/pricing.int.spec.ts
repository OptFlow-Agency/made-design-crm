import { describe, expect, it } from 'vitest'

import { effectivePrice, stockInfo, strikePrice, totalStock } from '@/utilities/pricing'

const now = new Date('2026-07-01T12:00:00Z').getTime()
const base = { price: 549, compareAtPrice: 890 }

describe('pricing', () => {
  it('uses the regular price when there is no promotion, and the manual compare-at as strike price', () => {
    expect(effectivePrice(base, null, now)).toBe(549)
    expect(strikePrice(base, null, now)).toBe(890)
  })

  it('applies a scheduled promotion only inside its window', () => {
    const p = { ...base, promotion: { salePrice: 449, startsAt: '2026-06-01T00:00:00Z', endsAt: '2026-08-01T00:00:00Z' } }
    expect(effectivePrice(p, null, now)).toBe(449)
    expect(strikePrice(p, null, now)).toBe(549)
    expect(effectivePrice(p, null, new Date('2026-09-01').getTime())).toBe(549)
    expect(effectivePrice(p, null, new Date('2026-05-01').getTime())).toBe(549)
  })

  it('ignores a "promotion" that is not lower than the price', () => {
    expect(effectivePrice({ ...base, promotion: { salePrice: 700 } }, null, now)).toBe(549)
  })

  it('prices a variant from its own price', () => {
    const p = { ...base, variants: [{ name: 'Rouge', price: 600 }] }
    expect(effectivePrice(p, 'Rouge', now)).toBe(600)
  })

  it('does not claim anything about stock when inventory is not tracked', () => {
    expect(stockInfo(base, null)).toEqual({ status: 'untracked', quantity: null, purchasable: true })
  })

  it('reports in stock, low stock (configurable) and out of stock from real quantities', () => {
    const t = { ...base, trackInventory: true }
    expect(stockInfo({ ...t, stock: 20 }, null).status).toBe('in_stock')
    expect(stockInfo({ ...t, stock: 5 }, null).status).toBe('low_stock')
    expect(stockInfo({ ...t, stock: 8 }, null, 10).status).toBe('low_stock')
    expect(stockInfo({ ...t, stock: 8, lowStockThreshold: 2 }, null, 10).status).toBe('in_stock')
    expect(stockInfo({ ...t, stock: 0 }, null)).toMatchObject({ status: 'out_of_stock', purchasable: false })
  })

  it('judges variants individually and the product by their sum', () => {
    const p = { ...base, trackInventory: true, variants: [{ name: 'A', stock: 0 }, { name: 'B', stock: 12 }, { name: 'C', stock: 3, active: false }] }
    expect(stockInfo(p, 'A').purchasable).toBe(false)
    expect(stockInfo(p, 'B').status).toBe('in_stock')
    expect(stockInfo(p, 'C').purchasable).toBe(false)
    expect(totalStock(p)).toBe(12)
    expect(stockInfo(p, null).quantity).toBe(12)
  })
})
