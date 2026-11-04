// @vitest-environment node
import config from '@/payload.config'
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

describe('storefront API', () => {
  let payload: Payload
  let bootstrapAdmin: any
  let tenant: any
  const stamp = `${Date.now()}${Math.floor(Math.random() * 10000)}`
  const slug = `zz-api-${stamp}`
  const ORIGIN = 'https://store.example.test'

  const call = async (method: 'get' | 'post' | 'options', path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const sanitized = await config
    const endpoint = sanitized.endpoints!.find((e) => e.method === method && e.path === `/store/:tenant/${path.split('?')[0]}`)!
    const url = `http://localhost:3000/api/store/${slug}/${path}`
    const req = Object.assign(new Request(url, { method: method.toUpperCase(), headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }), {
      payload,
      routeParams: { tenant: slug },
    }) as unknown as PayloadRequest
    const res = await endpoint.handler(req)
    return { status: res.status, headers: res.headers, json: res.status === 204 ? null : await res.json() }
  }

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    if ((await payload.count({ collection: 'users' })).totalDocs === 0) {
      bootstrapAdmin = await payload.create({ collection: 'users', data: { email: `zz-api-admin-${stamp}@example.test`, password: 'Test-pass-123!' } as never })
    }
    tenant = await payload.create({ collection: 'tenants', data: { name: 'ZZ API', slug, domain: 'store.example.test', currency: 'MAD' } as never })
    const t = { tenant: tenant.id }
    const zman = await payload.create({ collection: 'categories', data: { title: 'Zman', slug: 'zman', ...t } as never })
    const bladi = await payload.create({ collection: 'categories', data: { title: 'Bladi', slug: 'bladi', ...t } as never })
    const mk = (title: string, categories: string[], extra = {}) =>
      payload.create({ collection: 'products', data: { title, slug: title.toLowerCase(), price: 549, compareAtPrice: 890, categories, active: true, ...t, ...extra } as never })
    await mk('Rouge', [zman.id], { sortOrder: 2 })
    await mk('Vert', [zman.id], { sortOrder: 1 })
    await mk('Cuir', [bladi.id], { sortOrder: 3 })
    await mk('Cache', [zman.id], { active: false })
    await payload.create({ collection: 'promo-codes', data: { code: 'GIFT64', percent: 25, secondItemOnly: true, ...t } as never })
    await payload.create({ collection: 'promo-codes', data: { code: 'BAG23', percent: 10, ...t } as never })
  })

  afterAll(async () => {
    if (tenant) await payload.delete({ collection: 'tenants', id: tenant.id })
    if (bootstrapAdmin) await payload.delete({ collection: 'users', id: bootstrapAdmin.id })
  })

  it('lists active products in the storefront row shape, sorted, filtered by collection', async () => {
    const all = await call('get', 'products')
    expect(all.status).toBe(200)
    expect(all.json.map((p: any) => p.slug)).toEqual(['vert', 'rouge', 'cuir']) // inactive hidden, sort_order asc
    expect(all.json[0]).toMatchObject({ name: 'Vert', price: 549, was_price: 890, collection: 'zman', is_new: false })
    expect(all.headers.get('cache-control')).toContain('s-maxage')

    const zman = await call('get', 'products?collection=zman')
    expect(zman.json.map((p: any) => p.slug)).toEqual(['vert', 'rouge'])
  })

  it('prices promos exactly like an order will', async () => {
    const items = [{ slug: 'rouge', qty: 1 }, { slug: 'vert', qty: 1 }]
    expect((await call('post', 'promo', { code: ' gift64 ', items })).json).toEqual({ percent: 25, discount: 137 })
    expect((await call('post', 'promo', { code: 'BAG23', items })).json).toEqual({ percent: 10, discount: 108 })
    expect((await call('post', 'promo', { code: 'NOPE', items })).json).toBeNull()
  })

  it('places an order, repricing server-side and returning the number', async () => {
    const customer = { firstName: 'Salma', lastName: 'B.', phone: '06 12 34 56 78', address: '12 rue des Orangers', city: 'Casablanca' }
    const res = await call('post', 'orders', { ...customer, items: [{ slug: 'rouge', qty: 1 }, { slug: 'vert', qty: 1 }], promo: 'gift64', source: 'landing-page', attribution: { utmSource: 'meta' } })
    expect(res.status).toBe(200)
    expect(res.json).toEqual({ order_number: 1, total: 1098 - 137, discount: 137 })

    const stored: any = (await payload.find({ collection: 'orders', where: { tenant: { equals: tenant.id } } })).docs[0]
    expect(stored).toMatchObject({ source: 'landing-page', phone: '0612345678', promoCodeText: 'GIFT64' })
    expect(stored.attribution.utmSource).toBe('meta')

    expect((await call('post', 'orders', { ...customer, items: [{ slug: 'cuir', qty: 1 }] })).json.order_number).toBe(2)
  })

  it('rejects bad input with stable error codes', async () => {
    const ok = { firstName: 'A', lastName: 'B', phone: '0612345678', address: 'x street 12', city: 'Rabat', items: [{ slug: 'rouge', qty: 1 }] }
    const cases: [string, any, number, string][] = [
      ['bad phone', { ...ok, phone: '12345' }, 400, 'invalid_phone'],
      ['missing name', { ...ok, firstName: '' }, 400, 'invalid_customer'],
      ['unknown product', { ...ok, items: [{ slug: 'ghost', qty: 1 }] }, 400, 'invalid_items'],
      ['inactive product', { ...ok, items: [{ slug: 'cache', qty: 1 }] }, 400, 'invalid_items'],
      ['qty over 9', { ...ok, items: [{ slug: 'rouge', qty: 10 }] }, 400, 'invalid_items'],
      ['empty cart', { ...ok, items: [] }, 400, 'invalid_items'],
      ['unknown promo', { ...ok, promo: 'NOPE' }, 400, 'invalid_promo'],
      ['valid percent code on one item', { ...ok, promo: 'BAG23', items: [{ slug: 'rouge', qty: 1 }] }, 200, ''],
    ]
    for (const [name, body, status, error] of cases) {
      const res = await call('post', 'orders', body)
      expect(res.status, name).toBe(status)
      if (error) expect(res.json.error, name).toBe(error)
    }
  })

  it('only answers browsers from the store domain, and unknown stores 404', async () => {
    const allowed = await call('get', 'products', undefined, { origin: ORIGIN })
    expect(allowed.headers.get('access-control-allow-origin')).toBe(ORIGIN)

    const evil = await call('post', 'promo', { code: 'BAG23', items: [{ slug: 'rouge', qty: 1 }] }, { origin: 'https://evil.example' })
    expect(evil.status).toBe(403)
    expect(evil.headers.get('access-control-allow-origin')).toBeNull()

    const pre = await call('options', 'orders', undefined, { origin: ORIGIN })
    expect(pre.status).toBe(204)
    expect(pre.headers.get('access-control-allow-methods')).toContain('POST')

    const sanitized = await config
    const endpoint = sanitized.endpoints!.find((e) => e.method === 'get' && e.path === '/store/:tenant/products')!
    const ghost = await endpoint.handler(Object.assign(new Request('http://localhost:3000/api/store/ghost/products'), { payload, routeParams: { tenant: 'ghost' } }) as never)
    expect(ghost.status).toBe(404)
  })
})
