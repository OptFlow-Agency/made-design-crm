// @vitest-environment node
import config from '@/payload.config'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { hiddenCollectionsFor } from '@/access/modules'

describe('per-user permissions inside a store', () => {
  let payload: Payload
  const stamp = `${Date.now()}${Math.floor(Math.random() * 10000)}`
  let T: any, O: any, root: any, boss: any, prod: any, ord: any, view: any
  let productId: string, orderId: string, otherOrderId: string
  const users: string[] = []
  const tenants: string[] = []
  const email = (n: string) => `zz-${n}-${stamp}@example.test`

  const as = async (id: string) => ({ ...(await payload.findByID({ collection: 'users', id, depth: 0 })), collection: 'users' }) as never
  const lines = (productId: string) => [{ product: productId, quantity: 1 }]
  const makeOrder = (tenant: string, product: string) =>
    payload.create({ collection: 'orders', data: { tenant, firstName: 'A', lastName: 'B', phone: '0612345678', city: 'Rabat', address: 'x', items: lines(product) } as never }) as Promise<any>

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    if ((await payload.count({ collection: 'users' })).totalDocs === 0)
      users.push((await payload.create({ collection: 'users', data: { email: email('boot'), password: 'Test-pass-123!' } as never })).id)
    T = await payload.create({ collection: 'tenants', data: { name: 'ZZ Perm', slug: `zz-perm-${stamp}` } as never })
    O = await payload.create({ collection: 'tenants', data: { name: 'ZZ Other', slug: `zz-perm-o-${stamp}` } as never })
    tenants.push(T.id, O.id)
    root = await payload.create({ collection: 'users', data: { email: email('root'), password: 'Test-pass-123!', roles: ['admin'] } as never })
    boss = await payload.create({ collection: 'users', data: { email: email('boss'), password: 'Test-pass-123!', roles: ['tenant-admin'], tenants: [{ tenant: T.id }] } as never })
    users.push(root.id, boss.id)
    const p: any = await payload.create({ collection: 'products', data: { title: 'ZZ Bag', price: 100, active: true, tenant: T.id } as never })
    productId = p.id
    orderId = (await makeOrder(T.id, productId)).id
    const po: any = await payload.create({ collection: 'products', data: { title: 'ZZ Other Bag', price: 100, active: true, tenant: O.id } as never })
    otherOrderId = (await makeOrder(O.id, po.id)).id
  })

  afterAll(async () => {
    await payload.delete({ collection: 'users', where: { email: { like: `zz-%-${stamp}@example.test` } } })
    for (const id of tenants) await payload.delete({ collection: 'tenants', id }).catch(() => null)
  })

  // The store admin assigns the permissions, exactly as in the admin UI.
  const create = async (name: string, data: Record<string, unknown>) => {
    const u: any = await payload.create({
      collection: 'users',
      data: { email: email(name), password: 'Test-pass-123!', tenants: [{ tenant: T.id }], ...data } as never,
      user: await as(boss.id), overrideAccess: false,
    })
    users.push(u.id)
    return u
  }

  it('a store admin creates staff with their own areas', async () => {
    prod = await create('prod', { roles: ['staff'], manageModules: ['products'] })
    ord = await create('ord', { roles: ['staff'], manageModules: ['orders'] })
    view = await create('view', { roles: ['staff'], viewModules: ['orders'] })
    const full = await payload.findByID({ collection: 'users', id: prod.id, depth: 0 })
    expect(full.roles).toEqual(['staff'])
    expect(full.manageModules).toEqual(['products'])
  })

  it('product staff manage products (and inventory) but cannot see orders', async () => {
    const u = await as(prod.id)
    const made: any = await payload.create({ collection: 'products', data: { title: 'ZZ New', price: 50, trackInventory: true, stock: 5, tenant: T.id } as never, user: u, overrideAccess: false })
    const upd: any = await payload.update({ collection: 'products', id: made.id, data: { stock: 9 } as never, user: u, overrideAccess: false })
    expect(upd.stock).toBe(9)
    await expect(payload.find({ collection: 'orders', user: u, overrideAccess: false })).rejects.toThrow()
    await expect(payload.find({ collection: 'customers', user: u, overrideAccess: false })).rejects.toThrow()
  })

  it('order staff see and update orders, can read the catalogue for them, but cannot change it', async () => {
    const u = await as(ord.id)
    const found = await payload.find({ collection: 'orders', user: u, overrideAccess: false })
    expect(found.docs.map((d: any) => d.id)).toContain(orderId)
    const upd: any = await payload.update({ collection: 'orders', id: orderId, data: { status: 'confirmed' } as never, user: u, overrideAccess: false })
    expect(upd.status).toBe('confirmed')
    expect(upd.total).toBe(100) // a status change never reprices
    await expect(payload.find({ collection: 'products', user: u, overrideAccess: false })).resolves.toBeDefined()
    await expect(payload.create({ collection: 'products', data: { title: 'nope', price: 1, tenant: T.id } as never, user: u, overrideAccess: false })).rejects.toThrow()
    await expect(payload.update({ collection: 'products', id: productId, data: { price: 1 } as never, user: u, overrideAccess: false })).rejects.toThrow()
  })

  it('staff only ever see their own store’s data', async () => {
    const u = await as(ord.id)
    const ids = (await payload.find({ collection: 'orders', user: u, overrideAccess: false, limit: 100 })).docs.map((d: any) => d.id)
    expect(ids).not.toContain(otherOrderId)
  })

  it('view-only staff can read orders but not change them', async () => {
    const u = await as(view.id)
    expect((await payload.find({ collection: 'orders', user: u, overrideAccess: false })).docs.length).toBeGreaterThan(0)
    await expect(payload.update({ collection: 'orders', id: orderId, data: { status: 'shipped' } as never, user: u, overrideAccess: false })).rejects.toThrow()
    await expect(payload.delete({ collection: 'orders', id: orderId, user: u, overrideAccess: false })).rejects.toThrow()
  })

  it('staff cannot manage users or change their own role or permissions', async () => {
    const u = await as(ord.id)
    await expect(payload.create({ collection: 'users', data: { email: email('x1'), password: 'Test-pass-123!' } as never, user: u, overrideAccess: false })).rejects.toThrow()
    const others = await payload.find({ collection: 'users', user: u, overrideAccess: false })
    expect(others.docs.map((d: any) => d.id)).toEqual([ord.id])
    await payload.update({ collection: 'users', id: ord.id, data: { name: 'Me', roles: ['tenant-admin'], manageModules: ['settings', 'orders', 'products'] } as never, user: u, overrideAccess: false })
    const after = await payload.findByID({ collection: 'users', id: ord.id, depth: 0 })
    expect(after.roles).toEqual(['staff'])
    expect(after.manageModules).toEqual(['orders'])
  })

  it('a store admin can change a staff member’s areas later, but never grant platform admin or touch their own role', async () => {
    const b = await as(boss.id)
    await payload.update({ collection: 'users', id: view.id, data: { manageModules: ['orders'], viewModules: ['orders', 'customers', 'bogus'] } as never, user: b, overrideAccess: false })
    const v = await payload.findByID({ collection: 'users', id: view.id, depth: 0 })
    expect(v.manageModules).toEqual(['orders'])
    expect(v.viewModules).toEqual(['customers']) // no duplicates, unknown values dropped

    const esc: any = await create('esc', { roles: ['admin'] })
    expect((await payload.findByID({ collection: 'users', id: esc.id, depth: 0 })).roles).toEqual(['staff'])

    await payload.update({ collection: 'users', id: boss.id, data: { roles: ['staff'] } as never, user: b, overrideAccess: false })
    expect((await payload.findByID({ collection: 'users', id: boss.id, depth: 0 })).roles).toEqual(['tenant-admin'])
  })

  it('a user nobody gave a role to can sign in but has no access', async () => {
    const none: any = await create('none', {})
    const u = await as(none.id)
    expect((await payload.findByID({ collection: 'users', id: none.id, depth: 0 })).roles).toEqual(['staff'])
    await expect(payload.find({ collection: 'orders', user: u, overrideAccess: false })).rejects.toThrow()
    await expect(payload.find({ collection: 'products', user: u, overrideAccess: false })).rejects.toThrow()
  })

  it('navigation hides the areas a user does not have (and the store has switched off)', async () => {
    const p = await payload.findByID({ collection: 'users', id: prod.id, depth: 0 })
    const hidden = hiddenCollectionsFor(p as never, [])
    expect(hidden).toEqual(expect.arrayContaining(['orders', 'customers', 'promo-codes', 'store-settings']))
    expect(hidden).not.toContain('products')
    expect(hiddenCollectionsFor((await payload.findByID({ collection: 'users', id: boss.id, depth: 0 })) as never, [])).toEqual([])
    expect(hiddenCollectionsFor((await payload.findByID({ collection: 'users', id: boss.id, depth: 0 })) as never, ['orders'])).toContain('products')
  })
})
