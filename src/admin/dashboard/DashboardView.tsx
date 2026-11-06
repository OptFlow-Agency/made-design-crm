import { Link } from '@payloadcms/ui'
import { AlertTriangle, ArrowUpRight, Boxes, ChartNoAxesColumn, Clock, ExternalLink, Image as ImageIcon, PackageCheck, Plus, ShoppingBag, Ticket, Wallet } from 'lucide-react'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import { canRead, canWrite, hiddenCollectionsFor } from '@/access/modules'
import { checkRole } from '@/access/utilities'
import { getActiveBranding, getActiveTenant } from '@/branding/components/getContext'
import type { TenantModule } from '@/branding/config'
import type { Tenant, User } from '@/payload-types'

import { ORDER_TONE, PAYMENT_TONE, DashboardSkeleton, EmptyState, Panel, StatCard, StatusBadge } from '../ui'
import { Greeting, LocalTime } from '../ui/LocalTime'
import { SalesChart } from './SalesChart'
import { RANGES, loadAgencyOverview, loadInventory, loadOrderCounts, loadRecentOrders, loadSales, parseRange, percentChange } from './queries'

type Href = (path: '' | `/${string}`) => string
const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—')
const HOST = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i

/** The dashboard home (Payload `admin.components.views.dashboard`): a real overview of the active store. */
const DashboardView = async (props: any) => {
  const { payload, user, searchParams } = props as { payload: any; user: User; searchParams?: Record<string, unknown> }
  const adminRoute = payload.config.routes.admin as string
  const href: Href = (path) => formatAdminURL({ adminRoute, path })
  const active = await getActiveBranding(payload, user)

  if (active.kind === 'platform') return <AgencyOverview payload={payload} user={user} href={href} name={active.name} />

  const tenant = (await getActiveTenant(payload, user)) as Tenant | null
  if (!tenant) {
    return (
      <div className="ds-page">
        <EmptyState icon={Boxes} title="No store selected">Your account isn’t linked to a store yet. Ask a store admin or Made Design to add you.</EmptyState>
      </div>
    )
  }

  const hidden = new Set(hiddenCollectionsFor(user, active.modules as TenantModule[]))
  const can = (slug: any) => canRead(user, slug) && !hidden.has(slug)
  const may = (slug: any) => canWrite(user, slug) && !hidden.has(slug)
  const showOrders = can('orders')
  const showProducts = can('products')

  const rangeKey = parseRange(searchParams?.range)
  const days = RANGES[rangeKey]
  const ctx = { payload, user, tenant }

  const [sales, counts, recent, inventory] = await Promise.all([
    showOrders ? loadSales(ctx, days) : null,
    showOrders ? loadOrderCounts(ctx) : null,
    showOrders ? loadRecentOrders(ctx) : null,
    showProducts ? loadInventory(ctx) : null,
  ])

  const currency = tenant.currency || 'MAD'
  const money = (v: number, c: string = currency, fractions = 0) => new Intl.NumberFormat('en', { style: 'currency', currency: c, maximumFractionDigits: fractions }).format(v)
  const first = user.name?.split(' ')[0]
  const vs = `vs previous ${days} days`
  const attention = (inventory?.alerts.length ?? 0) > 0

  const actions = [
    may('products') && { label: 'Add product', href: href('/collections/products/create'), icon: Plus },
    showOrders && { label: 'Pending orders', href: href('/collections/orders?where[status][equals]=new'), icon: ShoppingBag },
    may('promo-codes') && { label: 'Create promo code', href: href('/collections/promo-codes/create'), icon: Ticket },
    can('content-sections') && { label: 'Edit website content', href: href('/collections/content-sections'), icon: ImageIcon },
  ].filter(Boolean) as { label: string; href: string; icon: React.ComponentType<{ size?: number }> }[]

  return (
    <div className="ds-page">
      <header className="ds-page__head">
        <div>
          <h1 className="ds-page__title"><Greeting name={first} /></h1>
          <p className="ds-page__sub">
            <span>{tenant.name}</span>
            <span aria-hidden> · </span>{currency}
            {tenant.status && tenant.status !== 'active' && <> <StatusBadge tone="warning">{cap(tenant.status)}</StatusBadge></>}
          </p>
        </div>
        <div className="ds-page__tools">
          {tenant.domain && HOST.test(tenant.domain) && (
            <a className="ds-btn ds-btn--ghost" href={`https://${tenant.domain}`} target="_blank" rel="noreferrer noopener">
              Open storefront <ExternalLink size={14} aria-hidden />
            </a>
          )}
          {showOrders && (
            <div className="ds-seg" role="group" aria-label="Date range">
              {(Object.keys(RANGES) as (keyof typeof RANGES)[]).map((r) => (
                <Link key={r} href={`${adminRoute}?range=${r}`} aria-current={r === rangeKey ? 'true' : undefined} prefetch={false}>{r === '7d' ? '7 days' : r === '30d' ? '30 days' : '90 days'}</Link>
              ))}
            </div>
          )}
        </div>
      </header>

      {!showOrders && !showProducts && (
        <EmptyState icon={Boxes} title="Nothing to summarise yet">Your account doesn’t include the Orders or Products areas. Use the sidebar to open the sections you have access to.</EmptyState>
      )}

      {(showOrders || showProducts) && (
        <section className="ds-grid-stats" aria-label="Key figures">
          {sales && counts && (
            <>
              <StatCard label="Revenue" icon={Wallet} value={money(sales.current.revenue)} delta={percentChange(sales.current.revenue, sales.prev.revenue)} hint={`${days} days · ${vs}`} />
              <StatCard label="Orders" icon={ChartNoAxesColumn} value={sales.current.orders.toLocaleString('en')} delta={percentChange(sales.current.orders, sales.prev.orders)} hint={`${counts.allTime.toLocaleString('en')} all time`} />
              <StatCard label="Pending orders" icon={Clock} value={counts.pending.toLocaleString('en')} hint={counts.pending ? 'Awaiting confirmation' : 'All caught up'} href={href('/collections/orders?where[status][equals]=new')} tone={counts.pending ? 'attention' : 'default'} />
            </>
          )}
          {inventory && (
            <>
              <StatCard label="Products" icon={PackageCheck} value={inventory.total.toLocaleString('en')} hint={`${inventory.active.toLocaleString('en')} visible in store`} href={href('/collections/products')} />
              <StatCard
                label="Low stock"
                icon={AlertTriangle}
                value={inventory.tracked ? inventory.alerts.length.toLocaleString('en') : '—'}
                hint={inventory.tracked ? `of ${inventory.tracked} tracked products` : 'Stock tracking is off'}
                href={href('/collections/products?where[trackInventory][equals]=true&sort=stock')}
                tone={attention ? 'attention' : 'default'}
              />
            </>
          )}
        </section>
      )}

      <div className="ds-cols">
        <div className="ds-cols__main">
          {sales && (
            <Panel title="Sales overview" description={`Daily, last ${days} days. Excludes cancelled and returned orders.`}>
              {sales.current.orders === 0 && sales.prev.orders === 0 ? (
                <EmptyState icon={ChartNoAxesColumn} title="No sales in this period">Orders placed from your storefront will appear here.</EmptyState>
              ) : (
                <SalesChart series={sales.series} currency={currency} />
              )}
              {sales.truncated && <p className="ds-note">Showing the most recent 5,000 orders only.</p>}
            </Panel>
          )}

          {recent && (
            <Panel title="Recent orders" action={<Link className="ds-link-more" href={href('/collections/orders')} prefetch={false}>View all <ArrowUpRight size={14} aria-hidden /></Link>}>
              {recent.length === 0 ? (
                <EmptyState icon={ShoppingBag} title="No orders yet" action={may('orders') ? { href: href('/collections/orders/create'), label: 'Create an order' } : undefined}>New orders will show up here as soon as customers check out.</EmptyState>
              ) : (
                <div className="ds-table-wrap">
                  <table className="ds-table">
                    <thead>
                      <tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Date</th><th scope="col" className="ds-num">Amount</th><th scope="col">Payment</th><th scope="col">Fulfilment</th></tr>
                    </thead>
                    <tbody>
                      {recent.map((o) => (
                        <tr key={o.id}>
                          <td><Link className="ds-rowlink" href={href(`/collections/orders/${o.id}`)} prefetch={false}>#{o.orderNumber ?? '—'}</Link></td>
                          <td>{[o.firstName, o.lastName].filter(Boolean).join(' ') || '—'}</td>
                          <td className="ds-muted"><LocalTime iso={o.createdAt} /></td>
                          <td className="ds-num">{o.total != null ? money(o.total, o.currency || currency, 2).replace(/\.00$/, '') : '—'}</td>
                          <td><StatusBadge tone={PAYMENT_TONE[o.paymentStatus ?? ''] ?? 'neutral'}>{cap(o.paymentStatus)}</StatusBadge></td>
                          <td><StatusBadge tone={ORDER_TONE[o.status ?? ''] ?? 'neutral'}>{cap(o.status)}</StatusBadge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}
        </div>

        <div className="ds-cols__side">
          {actions.length > 0 && (
            <Panel title="Quick actions">
              <ul className="ds-actions">
                {actions.map((a) => (
                  <li key={a.label}><Link href={a.href} prefetch={false}><a.icon size={15} />{a.label}<ArrowUpRight size={14} aria-hidden className="ds-actions__go" /></Link></li>
                ))}
              </ul>
            </Panel>
          )}

          {inventory && (
            <Panel title="Inventory alerts" description={inventory.tracked ? 'Tracked products at or below their threshold.' : undefined}>
              {!inventory.tracked ? (
                <EmptyState icon={Boxes} title="Stock tracking is off">Turn on “Track inventory” on a product to be alerted when it runs low.</EmptyState>
              ) : inventory.alerts.length === 0 ? (
                <EmptyState icon={PackageCheck} title="Stock looks healthy">No tracked product is running low.</EmptyState>
              ) : (
                <ul className="ds-alerts">
                  {inventory.alerts.slice(0, 7).map((a) => (
                    <li key={a.id}>
                      <Link href={href(`/collections/products/${a.id}`)} prefetch={false}>
                        <span className="ds-alerts__name">{a.title}{a.sku && <small>{a.sku}</small>}</span>
                        <StatusBadge tone={a.status === 'out_of_stock' ? 'danger' : 'warning'}>{a.status === 'out_of_stock' ? 'Out of stock' : `${a.quantity} left`}</StatusBadge>
                      </Link>
                    </li>
                  ))}
                  {inventory.alerts.length > 7 && (
                    <li><Link className="ds-link-more" href={href('/collections/products?where[trackInventory][equals]=true&sort=stock')} prefetch={false}>See all {inventory.alerts.length} <ArrowUpRight size={14} aria-hidden /></Link></li>
                  )}
                </ul>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}

/** Platform admins with no store selected: the agency's stores at a glance. */
async function AgencyOverview({ payload, user, href, name }: { payload: any; user: User; href: Href; name: string }) {
  if (!checkRole(['admin'], user)) {
    return <div className="ds-page"><EmptyState icon={Boxes} title="No store selected">Pick a store from the switcher in the sidebar.</EmptyState></div>
  }
  const rows = await loadAgencyOverview({ payload, user })
  const pending = rows.reduce((a, r) => a + r.pending, 0)
  return (
    <div className="ds-page">
      <header className="ds-page__head">
        <div>
          <h1 className="ds-page__title"><Greeting name={user.name?.split(' ')[0]} /></h1>
          <p className="ds-page__sub"><span className="ds-brandfont">{name}</span> · Agency console</p>
        </div>
        <div className="ds-page__tools"><Link className="ds-btn" href={href('/collections/tenants/create')} prefetch={false}><Plus size={14} aria-hidden /> New store</Link></div>
      </header>
      <section className="ds-grid-stats" aria-label="Key figures">
        <StatCard label="Stores" icon={Boxes} value={rows.length.toLocaleString('en')} hint={`${rows.filter((r) => r.tenant.status === 'active').length} active`} href={href('/collections/tenants')} />
        <StatCard label="Pending orders" icon={Clock} value={pending.toLocaleString('en')} hint="Across all stores" tone={pending ? 'attention' : 'default'} />
      </section>
      <Panel title="Stores" description="Select a store in the sidebar switcher to open its dashboard.">
        {rows.length === 0 ? (
          <EmptyState icon={Boxes} title="No stores yet" action={{ href: href('/collections/tenants/create'), label: 'Create the first store' }} />
        ) : (
          <div className="ds-table-wrap">
            <table className="ds-table">
              <thead><tr><th scope="col">Store</th><th scope="col">Domain</th><th scope="col">Status</th><th scope="col" className="ds-num">Orders</th><th scope="col" className="ds-num">Pending</th></tr></thead>
              <tbody>
                {rows.map(({ tenant, orders, pending: p }) => (
                  <tr key={tenant.id}>
                    <td><Link className="ds-rowlink" href={href(`/collections/tenants/${tenant.id}`)} prefetch={false}>{tenant.name}</Link></td>
                    <td className="ds-muted">{tenant.domain || '—'}</td>
                    <td><StatusBadge tone={tenant.status === 'active' ? 'success' : tenant.status === 'suspended' ? 'danger' : 'warning'}>{cap(tenant.status)}</StatusBadge></td>
                    <td className="ds-num">{orders.toLocaleString('en')}</td>
                    <td className="ds-num">{p.toLocaleString('en')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}

export default DashboardView
export { DashboardSkeleton }
