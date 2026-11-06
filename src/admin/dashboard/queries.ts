import type { Payload, Where } from 'payload'

import { stockInfo } from '@/utilities/pricing'
import type { Order, Product, Tenant, User } from '@/payload-types'

export const RANGES = { '7d': 7, '30d': 30, '90d': 90 } as const
export type RangeKey = keyof typeof RANGES
export const parseRange = (v: unknown): RangeKey => (typeof v === 'string' && v in RANGES ? (v as RangeKey) : '30d')

/** Orders that no longer count as sales. */
const VOID = ['cancelled', 'returned']
const ORDER_CAP = 5000
const DAY = 86_400_000

export type Day = { date: string; revenue: number; orders: number }
export type RecentOrder = Pick<Order, 'id' | 'orderNumber' | 'firstName' | 'lastName' | 'createdAt' | 'total' | 'status' | 'paymentStatus' | 'currency'>
export type StockAlert = { id: string; title: string; sku: string | null; quantity: number; status: 'low_stock' | 'out_of_stock' }

type Ctx = { payload: Payload; user: User; tenant: Tenant }
const scope = (tenant: Tenant): Where => ({ tenant: { equals: tenant.id } })
const dayKey = (d: Date) => d.toISOString().slice(0, 10)

/** Revenue and order counts per day for the range, plus the same totals for the period before it (for a real comparison). */
export async function loadSales({ payload, user, tenant }: Ctx, days: number) {
  const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0)
  const start = new Date(todayStart.getTime() - (days - 1) * DAY)
  const prevStart = new Date(start.getTime() - days * DAY)

  const { docs } = await payload.find({
    collection: 'orders',
    where: { and: [scope(tenant), { createdAt: { greater_than_equal: prevStart.toISOString() } }, { status: { not_in: VOID } }] },
    select: { total: true, createdAt: true },
    sort: '-createdAt',
    limit: ORDER_CAP,
    pagination: false,
    depth: 0,
    user,
    overrideAccess: false,
  })

  const series: Day[] = Array.from({ length: days }, (_, i) => ({ date: dayKey(new Date(start.getTime() + i * DAY)), revenue: 0, orders: 0 }))
  const index = new Map(series.map((d, i) => [d.date, i]))
  const prev = { revenue: 0, orders: 0 }
  for (const o of docs) {
    const created = new Date(o.createdAt)
    const i = index.get(dayKey(created))
    if (i != null) { series[i].revenue += o.total ?? 0; series[i].orders += 1 }
    else if (created < start) { prev.revenue += o.total ?? 0; prev.orders += 1 }
  }
  const current = series.reduce((a, d) => ({ revenue: a.revenue + d.revenue, orders: a.orders + d.orders }), { revenue: 0, orders: 0 })
  return { series, current, prev, truncated: docs.length >= ORDER_CAP }
}

export async function loadOrderCounts({ payload, user, tenant }: Ctx) {
  const count = (extra: Where) => payload.count({ collection: 'orders', where: { and: [scope(tenant), extra] }, user, overrideAccess: false }).then((r) => r.totalDocs)
  const [pending, allTime] = await Promise.all([count({ status: { equals: 'new' } }), count({ status: { not_in: VOID } })])
  return { pending, allTime }
}

export async function loadRecentOrders({ payload, user, tenant }: Ctx, limit = 8): Promise<RecentOrder[]> {
  const { docs } = await payload.find({
    collection: 'orders',
    where: scope(tenant),
    select: { orderNumber: true, firstName: true, lastName: true, createdAt: true, total: true, status: true, paymentStatus: true, currency: true },
    sort: '-createdAt',
    limit,
    depth: 0,
    user,
    overrideAccess: false,
  })
  return docs as RecentOrder[]
}

/** Catalogue size and the tracked products that need restocking, judged by the same rules the storefront uses. */
export async function loadInventory({ payload, user, tenant }: Ctx) {
  const where = scope(tenant)
  const [total, active, tracked, settings] = await Promise.all([
    payload.count({ collection: 'products', where, user, overrideAccess: false }),
    payload.count({ collection: 'products', where: { and: [where, { active: { equals: true } }] }, user, overrideAccess: false }),
    payload.find({
      collection: 'products',
      where: { and: [where, { trackInventory: { equals: true } }] },
      select: { title: true, sku: true, trackInventory: true, stock: true, lowStockThreshold: true, variants: true },
      limit: 1000,
      pagination: false,
      depth: 0,
      user,
      overrideAccess: false,
    }),
    // Not sensitive, and staff without the Settings module still need the right threshold.
    payload.find({ collection: 'store-settings', where, select: { lowStockThreshold: true }, limit: 1, depth: 0, overrideAccess: true }).catch(() => null),
  ])
  const storeThreshold = settings?.docs?.[0]?.lowStockThreshold ?? null

  const alerts: StockAlert[] = []
  for (const p of tracked.docs as Product[]) {
    const info = stockInfo(p as never, null, storeThreshold)
    if (info.status === 'low_stock' || info.status === 'out_of_stock') {
      alerts.push({ id: p.id, title: p.title, sku: p.sku ?? null, quantity: info.quantity ?? 0, status: info.status })
    }
  }
  alerts.sort((a, b) => a.quantity - b.quantity || a.title.localeCompare(b.title))
  return { total: total.totalDocs, active: active.totalDocs, tracked: tracked.docs.length, alerts }
}

/** Agency view: one row per store with its order load. Platform admins only (caller checks). */
export async function loadAgencyOverview({ payload, user }: { payload: Payload; user: User }) {
  const { docs: tenants } = await payload.find({ collection: 'tenants', limit: 100, depth: 0, sort: 'name', user, overrideAccess: false })
  const rows = await Promise.all(
    tenants.map(async (t) => {
      const count = (status?: string) =>
        payload.count({ collection: 'orders', where: { and: [{ tenant: { equals: t.id } }, ...(status ? [{ status: { equals: status } }] : [])] }, user, overrideAccess: false }).then((r) => r.totalDocs).catch(() => 0)
      const [orders, pending] = await Promise.all([count(), count('new')])
      return { tenant: t, orders, pending }
    }),
  )
  return rows
}

export const percentChange = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : null)
