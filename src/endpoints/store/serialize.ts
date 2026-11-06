import type { PayloadRequest } from 'payload'

import type { Product } from '@/payload-types'
import { effectivePrice, isPromotionLive, stockInfo, strikePrice } from '@/utilities/pricing'

import { absoluteUrl } from './helpers'

type Media = { url?: string | null; alt?: string | null; width?: number | null; height?: number | null; sizes?: Record<string, { url?: string | null } | undefined> }

const isDoc = <T extends object>(v: unknown): v is T => typeof v === 'object' && v !== null

/** Public shape of a media upload, with the responsive sizes the storefront can put in a srcset. */
export const mediaOut = (req: PayloadRequest, media: unknown, alt?: string | null) => {
  if (!isDoc<Media>(media) || !media.url) return null
  const sizes: Record<number, string> = {}
  if (media.sizes?.thumb?.url) sizes[480] = absoluteUrl(req, media.sizes.thumb.url)!
  if (media.sizes?.medium?.url) sizes[800] = absoluteUrl(req, media.sizes.medium.url)!
  return { url: absoluteUrl(req, media.url), alt: alt || media.alt || '', width: media.width ?? null, height: media.height ?? null, sizes }
}

const lines = (text?: string | null) => (text ?? '').split(/\n{2,}/).map((t) => t.trim()).filter(Boolean)
export const paragraphs = lines

/** The row shape the storefront already consumed, plus the richer fields the redesigned pages need. */
export const productOut = (req: PayloadRequest, p: Product, storeThreshold?: number | null) => {
  const gallery = (p.gallery ?? []).filter((g) => isDoc(g.image))
  const images = gallery.map((g) => ({ ...mediaOut(req, g.image, g.alt || p.title)!, kind: g.kind ?? 'front' }))
  const [first, second] = gallery.map((g) => g.image as Media)
  const cats = (p.categories ?? []).filter((c): c is Exclude<typeof c, string> => typeof c === 'object' && c !== null)
  const stock = stockInfo(p, null, storeThreshold)
  const live = isPromotionLive(p)
  const d = p.details
  const craft = p.craftsmanship
  const sizesOf = (m: Media | undefined) => mediaOut(req, m)?.sizes ?? {}
  const story = isDoc<{ slug: string; title: string }>(craft?.brandStory) ? craft!.brandStory : null

  return {
    // — legacy row shape (unchanged keys) —
    slug: p.slug,
    name: p.title,
    price: effectivePrice(p),
    was_price: strikePrice(p),
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
    // — product page —
    short_description: p.shortDescription ?? null,
    images,
    benefits: (p.benefits ?? []).map((b) => ({ icon: b.icon ?? 'sparkle', title: b.title, description: b.description ?? null })),
    details: d
      ? {
          materials: d.materials ?? null,
          dimensions: d.width || d.height || d.depth ? { width: d.width ?? null, height: d.height ?? null, depth: d.depth ?? null, strap_drop: d.strapDrop ?? null, unit: 'cm' } : null,
          weight_g: d.weight ?? null,
          care: d.care ?? null,
          extra: (d.extra ?? []).map((e) => ({ label: e.label, value: e.value })),
        }
      : null,
    // Craftsmanship copy is withheld until an admin confirms every claim in it.
    craftsmanship:
      craft?.claimsVerified && (craft.story || craft.title)
        ? { title: craft.title ?? null, story: paragraphs(craft.story), image: mediaOut(req, craft.image), brand_story: story ? { slug: story.slug, title: story.title } : null }
        : null,
    sku: p.sku ?? null,
    featured: Boolean(p.featured),
    // — price & availability (always from the server's rules) —
    promotion: live ? { label: p.promotion?.label ?? null, ends_at: p.promotion?.endsAt ?? null } : null,
    stock_status: stock.status,
    purchasable: stock.purchasable,
    // Exact quantity is only revealed when it is genuinely low.
    stock_left: stock.status === 'low_stock' ? stock.quantity : null,
    variants: (p.variants ?? [])
      .filter((v) => v.active !== false)
      .map((v) => {
        const s = stockInfo(p, v.name, storeThreshold)
        return {
          name: v.name,
          sku: v.sku ?? null,
          price: effectivePrice(p, v.name),
          was_price: strikePrice(p, v.name),
          color: v.colorHex ?? null,
          image: mediaOut(req, v.image),
          stock_status: s.status,
          purchasable: s.purchasable,
          stock_left: s.status === 'low_stock' ? s.quantity : null,
        }
      }),
    related: (p.relatedProducts ?? []).filter((r): r is Exclude<typeof r, string> => typeof r === 'object' && r !== null).filter((r) => r.active !== false).map((r) => r.slug),
    seo: {
      title: p.seo?.title ?? null,
      description: p.seo?.description ?? null,
      title_en: p.seo?.titleEn ?? null,
      description_en: p.seo?.descriptionEn ?? null,
      image: mediaOut(req, p.seo?.image),
      canonical: p.seo?.canonicalUrl ?? null,
      no_index: Boolean(p.seo?.noIndex),
    },
  }
}
