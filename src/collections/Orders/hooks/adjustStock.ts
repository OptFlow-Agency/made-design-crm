import type { CollectionAfterChangeHook } from 'payload'

import { idOf } from '@/utilities/ids'

const RELEASED = new Set(['cancelled', 'returned'])

type Line = { product?: unknown; variantName?: string | null; quantity?: number | null }

/** Subtracts (or, with a negative sign, returns) a line's quantity from the product or the chosen variant. */
const move = async (req: Parameters<CollectionAfterChangeHook>[0]['req'], lines: Line[], sign: 1 | -1) => {
  for (const line of lines) {
    const id = idOf(line.product)
    if (!id || !line.quantity) continue
    const product = await req.payload.findByID({ collection: 'products', id, depth: 0, req })
    if (!product.trackInventory) continue

    if (line.variantName) {
      const variants = (product.variants ?? []).map((v) =>
        v.name === line.variantName ? { ...v, stock: Math.max(0, (v.stock ?? 0) - sign * line.quantity!) } : v,
      )
      await req.payload.update({ collection: 'products', id, data: { variants }, depth: 0, req })
    } else {
      await req.payload.update({ collection: 'products', id, data: { stock: Math.max(0, (product.stock ?? 0) - sign * line.quantity) }, depth: 0, req })
    }
  }
}

/**
 * Keeps inventory in step with orders: deducted when an order is created, given back when it moves to
 * cancelled/returned, and taken again if it is reopened. Imported historical orders are left alone.
 */
export const adjustStock: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (req.context?.importingOrder) return doc
  const items = (doc.items ?? []) as Line[]

  if (operation === 'create') {
    if (!RELEASED.has(doc.status)) await move(req, items, 1)
    return doc
  }

  const was = RELEASED.has(previousDoc?.status)
  const now = RELEASED.has(doc.status)
  if (!was && now) await move(req, items, -1)
  else if (was && !now) await move(req, items, 1)
  return doc
}
