import type { Endpoint } from 'payload'

import { isValidMoroccanPhone } from '@/utilities/phone'
import { isPromoUsable, promoDiscount } from '@/utilities/promo'
import { effectivePrice, findVariant, stockInfo } from '@/utilities/pricing'

import { parseItems, preflight, StoreError, storeHandler } from './helpers'
import { mediaOut, paragraphs, productOut } from './serialize'

const PATH = '/store/:tenant'

/** The store-wide low-stock threshold, so "Only N left" follows the same setting everywhere. */
const storeSettings = async (req: Parameters<typeof products.handler>[0], tenantId: string) =>
  (await req.payload.find({ collection: 'store-settings', where: { tenant: { equals: tenantId } }, depth: 1, limit: 1, pagination: false, overrideAccess: true })).docs[0]

/** GET /api/store/:tenant/products[?collection=zman][&slug=azerwal][&featured=1] */
const products: Endpoint = {
  path: `${PATH}/products`,
  method: 'get',
  handler: storeHandler(async ({ req, tenant }) => {
    const params = new URL(req.url as string).searchParams
    const collection = params.get('collection')
    const slug = params.get('slug')
    const [found, settings] = await Promise.all([
      req.payload.find({
        collection: 'products',
        where: {
          and: [
            { tenant: { equals: tenant.id } },
            { active: { equals: true } },
            ...(collection ? [{ 'categories.slug': { equals: collection } }] : []),
            ...(slug ? [{ slug: { equals: slug } }] : []),
            ...(params.get('featured') ? [{ featured: { equals: true } }] : []),
          ],
        },
        sort: ['sortOrder', '-createdAt'],
        depth: 2,
        pagination: false,
        overrideAccess: true,
      }),
      storeSettings(req, tenant.id),
    ])
    return found.docs.map((p) => productOut(req, p, settings?.lowStockThreshold))
  }, 'public, s-maxage=60, stale-while-revalidate=300'),
}

/** Loads the cart's products and prices them from the catalogue, never from the request. Also refuses unavailable stock. */
const priceCart = async (req: Parameters<typeof products.handler>[0], tenantId: string, items: { slug: string; qty: number; variant?: string }[]) => {
  const [found, settings] = await Promise.all([
    req.payload.find({
      collection: 'products',
      where: { and: [{ tenant: { equals: tenantId } }, { active: { equals: true } }, { slug: { in: [...new Set(items.map((i) => i.slug))] } }] },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
    storeSettings(req, tenantId),
  ])
  const bySlug = new Map(found.docs.map((p) => [p.slug, p]))
  if (items.some((i) => !bySlug.has(i.slug))) throw new StoreError('invalid_items')

  const wanted = new Map<string, number>()
  const lines = new Map<string, { product: string; unitPrice: number; quantity: number }>()
  for (const i of items) {
    const p = bySlug.get(i.slug)!
    if (i.variant && !findVariant(p, i.variant)) throw new StoreError('invalid_items')
    const key = `${p.id}\u0000${i.variant ?? ''}`
    wanted.set(key, (wanted.get(key) ?? 0) + i.qty)

    const line = lines.get(key) ?? { product: p.id, unitPrice: effectivePrice(p, i.variant), quantity: 0 }
    line.quantity += i.qty
    lines.set(key, line)
  }
  for (const [key, qty] of wanted) {
    const [id, variant] = key.split('\u0000')
    const p = found.docs.find((d) => d.id === id)!
    const info = stockInfo(p, variant || null, settings?.lowStockThreshold)
    if (!info.purchasable) throw new StoreError('out_of_stock')
    if (info.quantity != null && qty > info.quantity) throw new StoreError('insufficient_stock')
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
      ...(text(body?.email, 200) ? { email: text(body?.email, 200) } : {}),
      ...(text(body?.notes, 500) ? { customerNotes: text(body?.notes, 500) } : {}),
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
        items: items.map((i) => ({ product: bySlug.get(i.slug)!.id, quantity: i.qty, ...(i.variant ? { variantName: i.variant } : {}) })),
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

/** GET /api/store/:tenant/settings: shipping, payments, returns, trust blocks and tracking ids. */
const settings: Endpoint = {
  path: `${PATH}/settings`,
  method: 'get',
  handler: storeHandler(async ({ req, tenant }) => {
    const [s, zones] = await Promise.all([
      storeSettings(req, tenant.id),
      req.payload.find({ collection: 'shipping-zones', where: { and: [{ tenant: { equals: tenant.id } }, { active: { equals: true } }] }, depth: 0, pagination: false, overrideAccess: true }),
    ])
    if (!s) return null
    return {
      store_name: s.storeName,
      tagline: s.tagline ?? null,
      announcement: s.announcement ?? null,
      logo: mediaOut(req, s.logo),
      contact: { phone: s.phone ?? null, whatsapp: s.whatsapp ?? null, email: s.email ?? null, instagram: s.instagram ?? null, facebook: s.facebook ?? null, tiktok: s.tiktok ?? null },
      shipping: {
        default_cost: s.defaultShippingCost ?? 0,
        free_from: s.freeShippingFrom ?? null,
        delay: s.deliveryDelay ?? null,
        destinations: (s.shippingDestinations ?? []).map((d) => ({ name: d.name, cost: d.cost ?? null, estimate: d.estimate ?? null, note: d.note ?? null })),
        zones: zones.docs.map((z) => ({
          name: z.name,
          cities: (z.cities ?? []).map((c) => c.city),
          cost: z.cost,
          free_above: z.freeAbove ?? s.freeShippingFrom ?? null,
          estimate: z.estimatedDelivery ?? null,
          cash_on_delivery: Boolean(z.cashOnDelivery),
        })),
      },
      payment_methods: (s.paymentMethods ?? []).filter((m) => m.enabled !== false).map((m) => ({ key: m.key, label: m.label, description: m.description ?? null, icon: mediaOut(req, m.icon) })),
      returns: { window_days: s.returns?.windowDays ?? null, summary: s.returns?.summary ?? null, exchange_conditions: s.returns?.exchangeConditions ?? null },
      trust: (s.trustHighlights ?? []).map((t) => ({ title: t.title, text: t.text ?? null, link_label: t.linkLabel ?? null, link_url: t.linkUrl ?? null })),
      checkout: { guest: s.checkout?.guestCheckout !== false, ask_email: Boolean(s.checkout?.askEmail), confirmation_message: s.checkout?.confirmationMessage ?? null },
      low_stock_threshold: s.lowStockThreshold ?? 5,
      policies: { delivery: s.policies?.delivery ?? null, returns: s.policies?.returns ?? null, terms: s.policies?.terms ?? null, privacy: s.policies?.privacy ?? null },
      tracking: { meta_pixel: s.metaPixelId ?? null, tiktok_pixel: s.tiktokPixelId ?? null, google_analytics: s.googleAnalyticsId ?? null, events: s.trackedEvents ?? [] },
    }
  }, 'public, s-maxage=60, stale-while-revalidate=300'),
}

/** GET /api/store/:tenant/collections: collections with SEO, featured picks (ordered) and season info. */
const collections: Endpoint = {
  path: `${PATH}/collections`,
  method: 'get',
  handler: storeHandler(async ({ req, tenant }) => {
    const found = await req.payload.find({
      collection: 'categories',
      where: { and: [{ tenant: { equals: tenant.id } }, { active: { equals: true } }] },
      sort: 'sortOrder',
      depth: 1,
      pagination: false,
      overrideAccess: true,
    })
    return found.docs.map((c) => ({
      slug: c.slug,
      name: c.title,
      description: c.description ?? '',
      image: mediaOut(req, c.image),
      hero_image: mediaOut(req, c.heroImage),
      featured: Boolean(c.featured),
      seasonal: Boolean(c.seasonal),
      season_label: c.seasonal ? (c.seasonLabel ?? null) : null,
      featured_products: (c.featuredProducts ?? []).filter((p): p is Exclude<typeof p, string> => typeof p === 'object' && p !== null).map((p) => p.slug),
      seo: { title: c.seo?.title ?? null, description: c.seo?.description ?? null, title_en: c.seo?.titleEn ?? null, description_en: c.seo?.descriptionEn ?? null },
    }))
  }, 'public, s-maxage=60, stale-while-revalidate=300'),
}

const inWindow = (d: { startsAt?: string | null; endsAt?: string | null }, now = Date.now()) =>
  !(d.startsAt && new Date(d.startsAt).getTime() > now) && !(d.endsAt && new Date(d.endsAt).getTime() < now)

/** GET /api/store/:tenant/content[?placement=home]: live sections only (published, within their dates), in order. */
const content: Endpoint = {
  path: `${PATH}/content`,
  method: 'get',
  handler: storeHandler(async ({ req, tenant }) => {
    const placement = new URL(req.url as string).searchParams.get('placement')
    const found = await req.payload.find({
      collection: 'content-sections',
      where: { and: [{ tenant: { equals: tenant.id } }, { active: { equals: true } }, ...(placement ? [{ placement: { in: [placement, 'global'] } }] : [])] },
      sort: 'sortOrder',
      depth: 2,
      pagination: false,
      overrideAccess: true,
    })
    const slugOf = (v: unknown) => (typeof v === 'object' && v ? (v as { slug?: string }).slug : undefined)
    return found.docs.filter(inWindow).map((c) => ({
      id: c.id,
      placement: c.placement,
      type: c.type,
      kicker: c.kicker ?? null,
      heading: c.heading ?? null,
      body: c.body ?? null,
      image: mediaOut(req, c.image),
      image_mobile: mediaOut(req, c.imageMobile),
      cta: c.cta?.label && c.cta?.href ? { label: c.cta.label, href: c.cta.href } : null,
      products: (c.products ?? []).map(slugOf).filter(Boolean),
      collection: slugOf(c.collection) ?? null,
      story: slugOf(c.story) ?? null,
      starts_at: c.startsAt ?? null,
      ends_at: c.endsAt ?? null,
    }))
  }, 'public, s-maxage=60, stale-while-revalidate=300'),
}

/**
 * GET /api/store/:tenant/offers: active bundle offers with the promo code that prices them.
 * The code is exposed on purpose (the storefront sends it to /promo and /orders, which stay authoritative);
 * only offers whose code is itself usable right now are returned, so an expired or exhausted code hides its offer.
 */
const eligibleSlugs = (offer: string[], code: string[]) => (!offer.length ? code : !code.length ? offer : offer.filter((x) => code.includes(x)))

const offers: Endpoint = {
  path: `${PATH}/offers`,
  method: 'get',
  handler: storeHandler(async ({ req, tenant }) => {
    const found = await req.payload.find({
      collection: 'offers',
      where: { and: [{ tenant: { equals: tenant.id } }, { active: { equals: true } }] },
      sort: 'sortOrder',
      depth: 1,
      pagination: false,
      overrideAccess: true,
    })
    const slugOf = (v: unknown) => (typeof v === 'object' && v ? (v as { slug?: string }).slug : undefined)
    return found.docs.flatMap((o) => {
      const code = typeof o.promoCode === 'object' && o.promoCode ? o.promoCode : null
      if (!code || !isPromoUsable(code, Number.POSITIVE_INFINITY)) return []
      const offerSlugs = (o.products ?? []).map(slugOf).filter(Boolean) as string[]
      const codeSlugs = (code.products ?? []).map(slugOf).filter(Boolean) as string[]
      // Eligible = in the offer's list AND the code's list (empty means "any"). /promo only discounts the code's products.
      const products = eligibleSlugs(offerSlugs, codeSlugs)
      // Two restricted lists with nothing in common: the offer can't apply to anything, so it is not offered.
      if (!products.length && offerSlugs.length && codeSlugs.length) return []
      return [{
        id: o.id,
        title: o.title,
        type: o.type,
        quantity: o.quantity ?? 1,
        percent: code.percent,
        code: code.code,
        second_item_only: Boolean(code.secondItemOnly),
        min_subtotal: code.minSubtotal ?? null,
        badge: o.badge ?? null,
        default_selected: Boolean(o.defaultSelected),
        duration_seconds: o.durationSeconds ?? null,
        products,
        ends_at: code.endsAt ?? null,
      }]
    })
  }, 'public, s-maxage=30, stale-while-revalidate=60'),
}

/** GET /api/store/:tenant/stories[?slug=][&kind=]: published brand stories. */
const stories: Endpoint = {
  path: `${PATH}/stories`,
  method: 'get',
  handler: storeHandler(async ({ req, tenant }) => {
    const params = new URL(req.url as string).searchParams
    const found = await req.payload.find({
      collection: 'stories',
      where: {
        and: [
          { tenant: { equals: tenant.id } },
          { active: { equals: true } },
          ...(params.get('slug') ? [{ slug: { equals: params.get('slug') } }] : []),
          ...(params.get('kind') ? [{ kind: { equals: params.get('kind') } }] : []),
        ],
      },
      sort: ['sortOrder', '-publishedAt'],
      depth: 2,
      pagination: false,
      overrideAccess: true,
    })
    return found.docs
      .filter((st) => st.kind !== 'craftsmanship' || st.verified)
      .filter((st) => !st.publishedAt || new Date(st.publishedAt).getTime() <= Date.now())
      .map((st) => ({
        slug: st.slug,
        title: st.title,
        kind: st.kind,
        kicker: st.kicker ?? null,
        excerpt: st.excerpt ?? null,
        body: paragraphs(st.body),
        cover: mediaOut(req, st.coverImage),
        images: (st.images ?? []).map((i) => ({ ...mediaOut(req, i.image, i.alt)!, caption: i.caption ?? null })),
        products: (st.products ?? []).map((p) => (typeof p === 'object' && p ? p.slug : null)).filter(Boolean),
        published_at: st.publishedAt ?? null,
        seo: { title: st.seo?.title ?? null, description: st.seo?.description ?? null, title_en: st.seo?.titleEn ?? null, description_en: st.seo?.descriptionEn ?? null },
      }))
  }, 'public, s-maxage=60, stale-while-revalidate=300'),
}

/** GET /api/store/:tenant/reviews[?product=slug]: approved reviews plus the count and average. */
const reviews: Endpoint = {
  path: `${PATH}/reviews`,
  method: 'get',
  handler: storeHandler(async ({ req, tenant }) => {
    const product = new URL(req.url as string).searchParams.get('product')
    const found = await req.payload.find({
      collection: 'reviews',
      where: { and: [{ tenant: { equals: tenant.id } }, { status: { equals: 'approved' } }, ...(product ? [{ 'product.slug': { equals: product } }] : [])] },
      sort: '-createdAt',
      depth: 1,
      limit: 50,
      overrideAccess: true,
    })
    const rated = found.docs.filter((r) => r.rating)
    return {
      count: rated.length,
      average: rated.length ? Math.round((rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length) * 10) / 10 : null,
      reviews: found.docs.map((r) => ({
        author: r.author,
        title: r.title ?? null,
        text: r.text,
        rating: r.rating ?? null,
        photo: mediaOut(req, r.photo),
        verified: Boolean(r.verifiedPurchase),
        source: r.source,
        reply: r.reply ?? null,
        date: r.createdAt,
      })),
    }
  }, 'public, s-maxage=60, stale-while-revalidate=300'),
}

const options = (name: string): Endpoint => ({ path: `${PATH}/${name}`, method: 'options', handler: preflight() })

export const storeEndpoints: Endpoint[] = [
  products,
  promo,
  orders,
  settings,
  collections,
  content,
  stories,
  reviews,
  offers,
  ...['products', 'promo', 'orders', 'settings', 'collections', 'content', 'stories', 'reviews', 'offers'].map(options),
]
