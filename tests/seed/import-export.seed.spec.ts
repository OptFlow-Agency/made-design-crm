// @vitest-environment node
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import config from '@/payload.config'
import { getPayload, type CollectionSlug, type Field } from 'payload'
import { expect, it } from 'vitest'

/**
 * Re-imports a JSON export (made while the database still had integer ids) into a database with UUID ids,
 * rewriting every relationship to the new ids. Run: EXPORT_DIR=<dir> pnpm import:data
 * The directory holds export.json, user-hashes.json (so passwords still work) and media/ (the uploaded files).
 * Platform settings are not imported: run `pnpm seed:platform` for them.
 */
const ORDER = ['tenants', 'users', 'media', 'categories', 'products', 'customers', 'promo-codes', 'offers', 'shipping-zones', 'store-settings', 'orders', 'reviews'] as const
type Slug = (typeof ORDER)[number]

it('imports the export with UUID ids', async () => {
  const dir = process.env.EXPORT_DIR
  if (!dir) throw new Error('Set EXPORT_DIR to the export folder')
  const data = JSON.parse(fs.readFileSync(path.join(dir, 'export.json'), 'utf8')) as Record<Slug, any[]>
  const hashes = JSON.parse(fs.readFileSync(path.join(dir, 'user-hashes.json'), 'utf8')) as { email: string; hash: string; salt: string }[]
  const payload = await getPayload({ config: await config })

  const map: Record<string, Map<string | number, string>> = Object.fromEntries(ORDER.map((s) => [s, new Map()]))
  const missing: string[] = []

  const mapOne = (to: string, old: unknown) => {
    const id = typeof old === 'object' && old ? (old as { id: unknown }).id : old
    const found = map[to]?.get(id as string | number)
    if (!found) missing.push(`${to}:${String(id)}`)
    return found ?? null
  }
  const mapRef = (relationTo: unknown, v: unknown): unknown => {
    if (Array.isArray(v)) return v.map((x) => mapRef(relationTo, x)).filter((x) => x != null)
    if (Array.isArray(relationTo)) return v // polymorphic refs are not used in this schema
    return mapOne(relationTo as string, v)
  }

  /** Rewrites ids in `row` following the field config; returns the names of the fields it covers. */
  const walk = (fields: Field[], row: any, names: string[] = []): string[] => {
    for (const f of fields as any[]) {
      if (f.type === 'row' || f.type === 'collapsible') { walk(f.fields, row, names); continue }
      if (f.type === 'tabs') { for (const t of f.tabs) { if (t.name) { names.push(t.name); if (row[t.name]) walk(t.fields, row[t.name]) } else walk(t.fields, row, names) } continue }
      if (!f.name) continue
      names.push(f.name)
      const v = row[f.name]
      if (v == null) continue
      if (f.type === 'join' || f.virtual) { delete row[f.name]; continue }
      if (f.type === 'group') walk(f.fields, v)
      else if (f.type === 'array') for (const r of v) { delete r.id; walk(f.fields, r) }
      else if (f.type === 'relationship' || f.type === 'upload') row[f.name] = mapRef(f.relationTo, v)
    }
    return names
  }

  const prepare = (slug: Slug, doc: any) => {
    const copy = structuredClone(doc)
    const names = walk(payload.collections[slug as CollectionSlug].config.fields, copy)
    for (const k of Object.keys(copy)) if (!names.includes(k) && k !== 'createdAt') delete copy[k]
    return copy
  }

  const stats: Record<string, number> = {}
  const mediaDir = path.join(dir, 'media')

  for (const slug of ORDER) {
    const docs = [...(data[slug] ?? [])]
    if (slug === 'users') docs.sort((a, b) => Number(b.roles?.includes('admin')) - Number(a.roles?.includes('admin'))) // the first user is auto-promoted, so make it the real admin
    for (const doc of docs) {
      // Tenant logos point at media that doesn't exist yet; they are attached in the second pass, so don't count them as misses.
      const source = slug === 'tenants' ? { ...doc, branding: { ...doc.branding, logo: null, logoDark: null, favicon: null } } : doc
      const body = prepare(slug, source)
      let created: any
      if (slug === 'media') {
        created = await payload.create({ collection: 'media', data: { alt: body.alt, tenant: body.tenant, createdAt: body.createdAt } as never, filePath: path.join(mediaDir, doc.filename), overrideAccess: true })
      } else if (slug === 'users') {
        delete body.sessions // login state, not data
        created = await payload.create({ collection: 'users', data: { ...body, password: crypto.randomBytes(24).toString('hex') } as never, overrideAccess: true })
        const h = hashes.find((x) => x.email === doc.email)
        if (h) await (payload.db as any).pool.query('update users set hash=$1, salt=$2 where id=$3', [h.hash, h.salt, created.id]) // keep the original passwords
      } else if (slug === 'orders') {
        created = await payload.create({ collection: 'orders', data: body as never, context: { importingOrder: true }, overrideAccess: true })
      } else if (slug === 'tenants') {
        created = await payload.create({ collection: 'tenants', data: body as never, overrideAccess: true })
      } else {
        created = await payload.create({ collection: slug as never, data: body as never, overrideAccess: true })
      }
      map[slug].set(doc.id, created.id)
    }
    stats[slug] = docs.length
    console.log('IMPORTED', slug, docs.length)
  }

  // Second pass: references that pointed forwards or to themselves.
  const second: Record<string, string[]> = { tenants: ['branding'], products: ['relatedProducts'], offers: ['triggerOffer'] }
  for (const [slug, fields] of Object.entries(second)) {
    for (const doc of data[slug as Slug] ?? []) {
      const body = prepare(slug as Slug, doc)
      const patch = Object.fromEntries(fields.filter((f) => body[f] != null).map((f) => [f, body[f]]))
      if (Object.keys(patch).length) await payload.update({ collection: slug as never, id: map[slug].get(doc.id)!, data: patch as never, overrideAccess: true })
    }
  }

  // Hooks recount while orders are re-created, so put the original figures back.
  for (const doc of data['promo-codes']) await payload.update({ collection: 'promo-codes', id: map['promo-codes'].get(doc.id)!, data: { usageCount: doc.usageCount ?? 0 }, overrideAccess: true })
  for (const doc of data.customers) await payload.update({ collection: 'customers', id: map.customers.get(doc.id)!, data: { ordersCount: doc.ordersCount ?? 0, totalSpent: doc.totalSpent ?? 0, lastOrderAt: doc.lastOrderAt ?? null }, overrideAccess: true })
  for (const doc of data.orders) {
    const history = prepare('orders', doc).statusHistory
    if (history) await payload.update({ collection: 'orders', id: map.orders.get(doc.id)!, data: { statusHistory: history }, context: { importingOrder: true }, overrideAccess: true })
  }

  fs.writeFileSync(path.join(dir, 'id-map.json'), JSON.stringify(Object.fromEntries(Object.entries(map).map(([k, m]) => [k, Object.fromEntries(m)])), null, 1))

  // Verify against the export.
  expect([...new Set(missing)], 'every relation resolved').toEqual([])
  for (const slug of ORDER) expect((await payload.count({ collection: slug as never, overrideAccess: true })).totalDocs, slug).toBe(stats[slug])
  const orders = await payload.find({ collection: 'orders', limit: 0, pagination: false, depth: 0, overrideAccess: true })
  const sum = (xs: any[], k: string) => xs.reduce((s, o) => s + (o[k] ?? 0), 0)
  expect(sum(orders.docs, 'total')).toBe(sum(data.orders, 'total'))
  expect(orders.docs.map((o: any) => o.orderNumber).sort()).toEqual(data.orders.map((o) => o.orderNumber).sort())
  console.log('VERIFIED', JSON.stringify(stats))
}, 600_000)
