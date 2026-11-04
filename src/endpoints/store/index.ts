import type { Endpoint } from 'payload'

import { isValidMoroccanPhone } from '@/utilities/phone'
import { isPromoUsable, promoDiscount } from '@/utilities/promo'

import { absoluteUrl, parseItems, preflight, StoreError, storeHandler } from './helpers'

const PATH = '/store/:tenant'

/** GET /api/store/:tenant/products[?collection=zman] */
const products: Endpoint = {
  path: `${PATH}/products`,
  method: 'get',
  handler: storeHandler(async ({ req, tenant }) => {
    const collection = new URL(req.url as string).searchParams.get('collection')
    const found = await req.payload.find({
      collection: 'products',
      where: {
        and: [
          { tenant: { equals: tenant.id } },
          { active: { equals: true } },
          ...(collection ? [{ 'categories.slug': { equals: collection } }] : []),
        ],
      },
      sort: ['sortOrder', '-createdAt'],
      depth: 2,
      pagination: false,
      overrideAccess: true,
    })

    const sizesOf = (media: any) => ({
      ...(media?.sizes?.thumb?.url ? { 480: absoluteUrl(req, media.sizes.thumb.url) } : {}),
      ...(media?.sizes?.medium?.url ? { 800: absoluteUrl(req, media.sizes.medium.url) } : {}),
    })

    // Row shape the storefront already consumes (it was written against Supabase's `products` table).
    return found.docs.map((p) => {
      const [first, second] = (p.gallery ?? []).map((g) => g.image).filter((m): m is Exclude<typeof m, string> => typeof m === 'object' && m !== null)
      const cats = (p.categories ?? []).filter((c): c is Exclude<typeof c, string> => typeof c === 'object' && c !== null)
      return {
        slug: p.slug,
        name: p.title,
        price: p.price,
        was_price: p.compareAtPrice ?? null,
        image: absoluteUrl(req, first?.url),
        image2: absoluteUrl(req, second?.url),
        image_sizes: sizesOf(first),
        image2_sizes: sizesOf(second),
        alt: p.gallery?.[0]?.alt || first?.alt || p.title,
        description: p.description ?? '',
        is_new: Boolean(p.isNew),
        collection: cats[0]?.slug ?? null,
        collections: cats.map((c) => c.slug),
        accent_color: p.accentColor ?? null,
        sort_order: p.sortOrder ?? 0,
      }
    })
  }, 'public, s-maxage=60, stale-while-revalidate=300'),
}

/** Loads the cart's products and prices them from the catalogue, never from the request. */
const priceCart = async (req: Parameters<typeof products.handler>[0], tenantId: string, items: { slug: string; qty: number }[]) => {
  const found = await req.payload.find({
    collection: 'products',
    where: { and: [{ tenant: { equals: tenantId } }, { active: { equals: true } }, { slug: { in: [...new Set(items.map((i) => i.slug))] } }] },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const bySlug = new Map(found.docs.map((p) => [p.slug, p]))
  if (items.some((i) => !bySlug.has(i.slug))) throw new StoreError('invalid_items')

  const lines = new Map<string, { product: string; unitPrice: number; quantity: number }>()
  for (const i of items) {
    const p = bySlug.get(i.slug)!
    const line = lines.get(p.id) ?? { product: p.id, unitPrice: p.price, quantity: 0 }
    line.quantity += i.qty
    lines.set(p.id, line)
  }
  return { lines: [...lines.values()], lastProduct: bySlug.get(items[items.length - 1].slug)!.id, bySlug }
}

const findPromo = async (req: Parameters<typeof products.handler>[0], tenantId: string, code: unknown) => {
  const normalized = String(code ?? '').trim().toUpperCase()
  if (!normalized) return null
  const found = await req.payload.find({
    collection: 'promo-codes',
    where: { and: [{ tenant: { equals: tenantId } }, { code: { equals: normalized } }] },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  return found.docs[0] ?? null
}

/** POST /api/store/:tenant/promo  { code, items: [{ slug, qty }] } → { percent, discount } | null */
const promo: Endpoint = {
  path: `${PATH}/promo`,
  method: 'post',
  handler: storeHandler(async ({ req, tenant }) => {
    const body = await req.json!()
    const items = parseItems(body?.items)
    const code = await findPromo(req, tenant.id, body?.code)
    if (!code) return null

    const { lines, lastProduct } = await priceCart(req, tenant.id, items)
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
    if (!isPromoUsable(code, subtotal)) return null

    const discount = promoDiscount(code, lines, lastProduct)
    return discount > 0 ? { percent: code.percent, discount } : null
  }),
}

/** POST /api/store/:tenant/orders → { order_number, total, discount } */
const orders: Endpoint = {
  path: `${PATH}/orders`,
  method: 'post',
  handler: storeHandler(async ({ req, tenant }) => {
    const body = await req.json!()
    const items = parseItems(body?.items)
    const text = (v: unknown, max = 300) => String(v ?? '').trim().slice(0, max)

    const customer = {
      firstName: text(body?.firstName),
      lastName: text(body?.lastName),
      phone: text(body?.phone, 40),
      address: text(body?.address),
      city: text(body?.city),
    }
    if (!customer.firstName || !customer.lastName || !customer.address || !customer.city) throw new StoreError('invalid_customer')
    if (!isValidMoroccanPhone(customer.phone)) throw new StoreError('invalid_phone')

    const { bySlug } = await priceCart(req, tenant.id, items)
    const code = body?.promo ? await findPromo(req, tenant.id, body.promo) : null
    if (body?.promo && !code) throw new StoreError('invalid_promo')

    const attribution = body?.attribution ?? {}
    // The Orders hook re-prices from the catalogue, validates the code and numbers the order.
    const order = await req.payload.create({
      collection: 'orders',
      overrideAccess: true,
      data: {
        ...customer,
        tenant: tenant.id,
        source: body?.source === 'landing-page' ? 'landing-page' : 'store',
        ...(code ? { promoCode: code.id } : {}),
        items: items.map((i) => ({ product: bySlug.get(i.slug)!.id, quantity: i.qty })),
        attribution: {
          landingPage: text(attribution.landingPage, 500) || undefined,
          referrer: text(attribution.referrer, 500) || undefined,
          utmSource: text(attribution.utmSource, 100) || undefined,
          utmMedium: text(attribution.utmMedium, 100) || undefined,
          utmCampaign: text(attribution.utmCampaign, 100) || undefined,
          fbclid: text(attribution.fbclid, 200) || undefined,
        },
      } as never,
    })
    return { order_number: order.orderNumber, total: order.total, discount: order.discount }
  }),
}

const options = (name: string): Endpoint => ({ path: `${PATH}/${name}`, method: 'options', handler: preflight() })

export const storeEndpoints: Endpoint[] = [products, promo, orders, options('products'), options('promo'), options('orders')]
