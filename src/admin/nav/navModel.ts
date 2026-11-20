/**
 * Navigation model: which collections live in which sidebar section, and the icon for each.
 * Visibility is NOT decided here. `AdminNav` intersects this with what Payload says the user can
 * see (`visibleEntities`, read permission) and with the store's enabled modules, so a collection
 * that isn't listed still shows up (under "More") and nothing is ever removed from the nav.
 */

export type IconName =
  | 'layout-dashboard' | 'package' | 'tags' | 'boxes' | 'shopping-cart' | 'users' | 'ticket' | 'percent'
  | 'star' | 'quote' | 'book-open' | 'layout-template' | 'images' | 'store' | 'truck' | 'building' | 'user-cog'
  | 'sliders' | 'folder' | 'shield'

export type NavLinkItem = {
  key: string
  label: string
  href: string
  icon: IconName
  /** Active only when the current URL carries this query fragment (used by the Inventory shortcut). */
  queryMatch?: string
  /** Active only when the URL does NOT carry this fragment (so Products isn't active on Inventory). */
  queryExclude?: string
}
export type NavSectionModel = { key: string; label: string; items: NavLinkItem[] }

type Def = { slug: string; kind: 'collection' | 'global'; icon: IconName; label?: string; virtual?: 'inventory'; agency?: boolean }

export const SECTION_DEFS: { key: string; label: string; items: Def[] }[] = [
  {
    key: 'catalogue',
    label: 'Catalogue',
    items: [
      { slug: 'products', kind: 'collection', icon: 'package' },
      { slug: 'products', kind: 'collection', icon: 'boxes', label: 'Inventory', virtual: 'inventory' },
      { slug: 'categories', kind: 'collection', icon: 'tags' },
    ],
  },
  {
    key: 'sales',
    label: 'Sales',
    items: [
      { slug: 'orders', kind: 'collection', icon: 'shopping-cart' },
      { slug: 'customers', kind: 'collection', icon: 'users' },
    ],
  },
  {
    key: 'promotions',
    label: 'Promotions',
    items: [
      { slug: 'promo-codes', kind: 'collection', icon: 'ticket' },
      { slug: 'offers', kind: 'collection', icon: 'percent' },
    ],
  },
  {
    key: 'website',
    label: 'Website',
    items: [
      { slug: 'content-sections', kind: 'collection', icon: 'layout-template' },
      { slug: 'stories', kind: 'collection', icon: 'book-open' },
      { slug: 'reviews', kind: 'collection', icon: 'star' },
      { slug: 'testimonials', kind: 'collection', icon: 'quote' },
      { slug: 'media', kind: 'collection', icon: 'images' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    items: [
      { slug: 'store-settings', kind: 'collection', icon: 'store' },
      { slug: 'shipping-zones', kind: 'collection', icon: 'truck' },
    ],
  },
  {
    key: 'platform',
    label: 'Platform',
    items: [
      { slug: 'tenants', kind: 'collection', icon: 'building', agency: true },
      { slug: 'users', kind: 'collection', icon: 'user-cog' },
      { slug: 'platform-media', kind: 'collection', icon: 'images', agency: true },
      { slug: 'platform-settings', kind: 'global', icon: 'sliders', agency: true },
    ],
  },
]

/** Slugs that only platform admins (Made Design) should ever see in the nav, whatever `visibleEntities` says. */
export const AGENCY_ONLY = new Set(SECTION_DEFS.flatMap((s) => s.items).filter((i) => i.agency).map((i) => i.slug))

/** Fallback icon for a collection added later that isn't mapped above. */
export const FALLBACK_ICON: IconName = 'folder'
