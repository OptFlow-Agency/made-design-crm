import config from '@/payload.config'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Exercises the shared multi-client schema against the local database using two throwaway
 * tenants, which are removed afterwards (the tenant plugin cascades the delete to their data).
 */
describe('multi-tenant store schema', () => {
  let payload: Payload
  const stamp = `${Date.now()}${Math.floor(Math.random() * 10000)}`
  let tenant: { id: string }
  let other: { id: string }
  let user: any
  let bootstrapAdmin: any
  let a: any
  let b: any
  let gift: any

  const product = (title: string, tenantId: string) =>
    payload.create({ collection: 'products', data: { title, price: 549, compareAtPrice: 890, active: true, tenant: tenantId } as never })

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    // The first user in an empty database is promoted to platform admin (ensureFirstUserIsAdmin),
    // so make sure the staff user below is not that user.
    if ((await payload.count({ collection: 'users' })).totalDocs === 0) {
      bootstrapAdmin = await payload.create({ collection: 'users', data: { email: `zz-admin-${stamp}@example.test`, password: 'Test-pass-123!' } as never })
    }
    tenant = await payload.create({ collection: 'tenants', data: { name: 'ZZ Test', slug: `zz-test-${stamp}`, currency: 'MAD' } as never })
    other = await payload.create({ collection: 'tenants', data: { name: 'ZZ Other', slug: `zz-other-${stamp}`, currency: 'MAD' } as never })
    user = await payload.create({
      collection: 'users',
      data: { email: `zz-${stamp}@example.test`, password: 'Test-pass-123!', roles: ['tenant-admin'], tenants: [{ tenant: tenant.id }] } as never,
    })
  })

  afterAll(async () => {
    if (user) await payload.delete({ collection: 'users', id: user.id })
    if (bootstrapAdmin) await payload.delete({ collection: 'users', id: bootstrapAdmin.id })
    if (tenant) await payload.delete({ collection: 'tenants', id: tenant.id })
    if (other) await payload.delete({ collection: 'tenants', id: other.id })
  })

  it('derives slugs and scopes uniqueness to a tenant', async () => {
    a = await product('Sac Azerwal', tenant.id)
    b = await product('Sac Tazult', tenant.id)
    expect(a.slug).toBe('sac-azerwal')
    await expect(product('Sac Azerwal', other.id)).resolves.toBeDefined()
    await expect(product('Sac Azerwal', tenant.id)).rejects.toThrow()
  })

  it('prices, discounts, ships and numbers an order server-side', async () => {
    gift = await payload.create({ collection: 'promo-codes', data: { code: 'gift64', percent: 25, secondItemOnly: true, tenant: tenant.id } as never })
    expect(gift.code).toBe('GIFT64')
    await payload.create({ collection: 'shipping-zones', data: { name: 'Casa', cities: [{ city: 'Casablanca' }], cost: 30, freeAbove: 1000, tenant: tenant.id } as never })

    const base = { firstName: 'Salma', lastName: 'B.', phone: '+212 6 12 34 56 78', city: 'casablanca', address: '12 rue des Orangers, Maarif', tenant: tenant.id }
    const o1: any = await payload.create({
      collection: 'orders',
      data: { ...base, promoCode: gift.id, items: [{ product: a.id, quantity: 1, unitPrice: 1 }, { product: b.id, quantity: 1 }] } as never,
    })
    expect(o1.orderNumber).toBe(1)
    expect(o1.items[0].unitPrice).toBe(549) // client-sent price ignored
    expect(o1.discount).toBe(137) // floor(549 * 25 / 100), as in the Supabase apply_promo
    expect(o1.shippingCost).toBe(30)
    expect(o1.total).toBe(991)
    expect(o1.currency).toBe('MAD')
    expect(o1.statusHistory).toHaveLength(1)

    const o2: any = await payload.create({
      collection: 'orders',
      data: { ...base, phone: '0612345678', items: [{ product: a.id, quantity: 2 }, { product: b.id, quantity: 1 }] } as never,
    })
    expect(o2.orderNumber).toBe(2)
    expect(o2.shippingCost).toBe(0) // 1647 >= 1000

    const shipped: any = await payload.update({ collection: 'orders', id: o2.id, data: { status: 'shipped' } })
    expect(shipped.statusHistory).toHaveLength(2)
  })

  it('merges customers by normalised phone and keeps their stats current', async () => {
    const { docs, totalDocs } = await payload.find({ collection: 'customers', where: { tenant: { equals: tenant.id } } })
    expect(totalDocs).toBe(1)
    expect(docs[0]).toMatchObject({ phone: '0612345678', ordersCount: 2, totalSpent: 991 + 1647 })
    expect((await payload.findByID({ collection: 'promo-codes', id: gift.id }) as any).usageCount).toBe(1)
  })

  it('applies percent codes per product with floor rounding and merges duplicate lines', async () => {
    const duo = await payload.create({ collection: 'promo-codes', data: { code: 'bag23', percent: 10, tenant: tenant.id } as never })
    const o: any = await payload.create({
      collection: 'orders',
      data: { firstName: 'D', lastName: 'Uo', phone: '0622222222', city: 'Rabat', address: 'x street 12', tenant: tenant.id, promoCode: duo.id, items: [{ product: a.id, quantity: 1 }, { product: b.id, quantity: 1 }, { product: a.id, quantity: 1 }] } as never,
    })
    expect(o.items).toHaveLength(2) // duplicate lines merged
    expect(o.subtotal).toBe(1647)
    expect(o.discount).toBe(Math.floor((549 * 2 * 10) / 100) + Math.floor((549 * 10) / 100)) // 109 + 54
  })

  it('applies a second-item code to the last line only, and rejects it when that line is out of scope', async () => {
    const order = (promoCode: string, products: any[]) =>
      payload.create({
        collection: 'orders',
        data: { firstName: 'A', lastName: 'B', phone: '0611111111', city: 'Rabat', address: 'x street 12', tenant: tenant.id, promoCode, items: products.map((p) => ({ product: p.id, quantity: 1 })) } as never,
      }) as Promise<any>

    expect((await order(gift.id, [a])).discount).toBe(137) // a single line is its own "last item"

    const scoped = await payload.create({ collection: 'promo-codes', data: { code: 'only-b', percent: 25, secondItemOnly: true, products: [b.id], tenant: tenant.id } as never })
    expect((await order(scoped.id, [a, b])).discount).toBe(137)
    await expect(order(scoped.id, [b, a])).rejects.toThrow(/invalid_promo/)
  })

  it('only shows a tenant admin their own tenant', async () => {
    await payload.create({ collection: 'customers', data: { firstName: 'Other', lastName: 'Person', phone: '0700000000', tenant: other.id } as never })
    // A signed-in request carries `collection`; `create()` results don't, so add it.
    const staff = { ...user, collection: 'users' }
    const customers = await payload.find({ collection: 'customers', user: staff, overrideAccess: false })
    expect(customers.docs.length).toBeGreaterThan(0)
    expect(customers.docs.map((c: any) => c.phone)).not.toContain('0700000000')
    expect(customers.docs.every((c: any) => (typeof c.tenant === 'object' ? c.tenant.id : c.tenant) === tenant.id)).toBe(true)
    const products = await payload.find({ collection: 'products', user: staff, overrideAccess: false })
    expect(products.docs).toHaveLength(2)
  })

  it('leaves nothing behind when a tenant is deleted', async () => {
    await payload.delete({ collection: 'tenants', id: tenant.id })
    for (const collection of ['orders', 'customers', 'products', 'promo-codes', 'shipping-zones'] as const) {
      const orphans = await payload.count({ collection, where: { tenant: { exists: false } } })
      expect(orphans.totalDocs, collection).toBe(0)
    }
    tenant = undefined as never
  })
})
