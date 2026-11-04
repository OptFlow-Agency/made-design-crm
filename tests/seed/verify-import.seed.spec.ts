// @vitest-environment node
import fs from 'fs'
import path from 'path'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { expect, it } from 'vitest'

/**
 * Read-only: compares the database with an export and the id map the importer wrote.
 * Run: EXPORT_DIR=<dir> pnpm verify:import
 */
it('the database matches the export', async () => {
  const dir = process.env.EXPORT_DIR
  if (!dir) throw new Error('Set EXPORT_DIR to the export folder')
  const data = JSON.parse(fs.readFileSync(path.join(dir, 'export.json'), 'utf8')) as Record<string, any[]>
  const ids = JSON.parse(fs.readFileSync(path.join(dir, 'id-map.json'), 'utf8')) as Record<string, Record<string, string>>
  const hashes = JSON.parse(fs.readFileSync(path.join(dir, 'user-hashes.json'), 'utf8')) as { email: string; hash: string; salt: string }[]
  const payload = await getPayload({ config: await config })
  const get = (collection: string, oldId: unknown) => payload.findByID({ collection: collection as never, id: ids[collection][String(oldId)], depth: 0, overrideAccess: true }) as Promise<any>
  const idOf = (v: any) => (v && typeof v === 'object' ? v.id : v)
  const problems: string[] = []
  const check = (ok: boolean, msg: string) => { if (!ok) problems.push(msg) }

  // counts
  for (const slug of Object.keys(ids)) {
    const n = (await payload.count({ collection: slug as never, overrideAccess: true })).totalDocs
    check(n === data[slug].length, `${slug}: ${n} rows, export has ${data[slug].length}`)
  }

  const media = Object.fromEntries(await Promise.all(Object.entries(ids.media).map(async ([o, n]) => [o, await payload.findByID({ collection: 'media', id: n, depth: 0, overrideAccess: true })])))
  const fileOf = (oldMediaId: unknown) => (media as any)[String(idOf(oldMediaId))]?.filename // by OLD id
  const newFile = (newMediaId: unknown) => Object.values(media as Record<string, any>).find((m) => m.id === idOf(newMediaId))?.filename // by NEW id
  const oldFile = (oldMediaId: unknown) => data.media.find((m) => m.id === idOf(oldMediaId))?.filename

  // media files exist on disk with their original names
  for (const m of data.media) check(fs.existsSync(path.join('public/media', m.filename)), `media file missing on disk: ${m.filename}`)
  for (const m of data.media) check(fileOf(m.id) === m.filename, `media ${m.id}: filename ${fileOf(m.id)} != ${m.filename}`)

  // tenants: identity, colours, logos
  for (const t of data.tenants) {
    const n = await get('tenants', t.id)
    check(n.slug === t.slug && n.domain === t.domain && n.name === t.name, `tenant ${t.slug} fields differ`)
    check(JSON.stringify(n.branding?.colors) === JSON.stringify(t.branding?.colors), `tenant ${t.slug} colours differ`)
    for (const k of ['logo', 'logoDark', 'favicon']) check(newFile(n.branding?.[k]) === oldFile(t.branding?.[k]) && (t.branding?.[k] == null) === (n.branding?.[k] == null), `tenant ${t.slug} branding.${k}`)
    check(n.id === ids.tenants[String(t.id)], `tenant ${t.slug} id map`)
    check(/^[0-9a-f-]{36}$/.test(n.id), `tenant ${t.slug} id is not a uuid`)
  }

  // users: roles, memberships, passwords
  const pool = (payload.db as any).pool
  for (const u of data.users) {
    const n = await get('users', u.id)
    check(JSON.stringify(n.roles) === JSON.stringify(u.roles), `user ${u.email} roles ${n.roles} != ${u.roles}`)
    const want = (u.tenants ?? []).map((r: any) => ids.tenants[String(idOf(r.tenant))]).sort().join()
    const got = (n.tenants ?? []).map((r: any) => idOf(r.tenant)).sort().join()
    check(want === got, `user ${u.email} tenants differ`)
    const h = hashes.find((x) => x.email === u.email)
    const row = (await pool.query('select hash, salt from users where id=$1', [n.id])).rows[0]
    check(!!h && row.hash === h.hash && row.salt === h.salt, `user ${u.email} password hash differs`)
  }

  // catalogue
  for (const p of data.products) {
    const n = await get('products', p.id)
    check(n.title === p.title && n.price === p.price && n.slug === p.slug && n.active === p.active, `product ${p.slug} fields`)
    check(JSON.stringify((n.gallery ?? []).map((g: any) => newFile(g.image))) === JSON.stringify((p.gallery ?? []).map((g: any) => oldFile(g.image))), `product ${p.slug} gallery`)
    check(JSON.stringify((n.categories ?? []).map(idOf).sort()) === JSON.stringify((p.categories ?? []).map((c: any) => ids.categories[String(idOf(c))]).sort()), `product ${p.slug} categories`)
    check(JSON.stringify((n.relatedProducts ?? []).map(idOf).sort()) === JSON.stringify((p.relatedProducts ?? []).map((c: any) => ids.products[String(idOf(c))]).sort()), `product ${p.slug} related`)
  }
  for (const c of data.categories) check((await get('categories', c.id)).slug === c.slug, `category ${c.slug}`)

  // customers and promos
  for (const c of data.customers) {
    const n = await get('customers', c.id)
    check(n.phone === c.phone && n.ordersCount === c.ordersCount && n.totalSpent === c.totalSpent, `customer ${c.phone} figures (${n.ordersCount}/${n.totalSpent} vs ${c.ordersCount}/${c.totalSpent})`)
  }
  for (const p of data['promo-codes']) {
    const n = await get('promo-codes', p.id)
    check(n.code === p.code && n.usageCount === p.usageCount && n.percent === p.percent, `promo ${p.code} figures (${n.usageCount} vs ${p.usageCount})`)
    check(JSON.stringify((n.products ?? []).map(idOf).sort()) === JSON.stringify((p.products ?? []).map((x: any) => ids.products[String(idOf(x))]).sort()), `promo ${p.code} products`)
  }

  // orders, line by line
  for (const o of data.orders) {
    const n = await get('orders', o.id)
    const tag = `order ${o.orderNumber}`
    check(n.orderNumber === o.orderNumber && n.status === o.status && n.total === o.total && n.subtotal === o.subtotal && n.discount === o.discount && n.shippingCost === o.shippingCost, `${tag} figures`)
    check(n.phone === o.phone && n.city === o.city && n.firstName === o.firstName, `${tag} contact`)
    check(new Date(n.createdAt).getTime() === new Date(o.createdAt).getTime(), `${tag} createdAt ${n.createdAt} != ${o.createdAt}`)
    check(idOf(n.customer) === (o.customer ? ids.customers[String(idOf(o.customer))] : undefined) || (!n.customer && !o.customer), `${tag} customer`)
    check(idOf(n.promoCode) === (o.promoCode ? ids['promo-codes'][String(idOf(o.promoCode))] : undefined) || (!n.promoCode && !o.promoCode), `${tag} promoCode`)
    check((n.items ?? []).length === o.items.length, `${tag} item count`)
    o.items.forEach((it: any, i: number) => {
      const m = n.items?.[i]
      check(!!m && idOf(m.product) === ids.products[String(idOf(it.product))] && m.quantity === it.quantity && m.unitPrice === it.unitPrice && m.lineTotal === it.lineTotal && m.productName === it.productName, `${tag} item ${i}`)
    })
    check((n.statusHistory ?? []).length === (o.statusHistory ?? []).length, `${tag} statusHistory ${(n.statusHistory ?? []).length} vs ${(o.statusHistory ?? []).length}`)
  }

  console.log('VERIFY', problems.length ? problems.join('\n') : 'no differences')
  expect(problems).toEqual([])
}, 600_000)
