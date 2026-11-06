import type { CollectionSlug } from 'payload'

/** Dashboard modules a tenant can switch on. `overview` (the dashboard home) is always visible. */
export const MODULES = ['overview', 'products', 'orders', 'customers', 'promotions', 'website', 'media', 'settings'] as const
export type TenantModule = (typeof MODULES)[number]

/**
 * Which collections each module owns. Collections that are not listed here (tenants, users)
 * are never hidden by modules. This only shapes the navigation: access control stays on the collections.
 */
export const MODULE_COLLECTIONS: Record<Exclude<TenantModule, 'overview'>, CollectionSlug[]> = {
  products: ['products', 'categories'],
  orders: ['orders'],
  customers: ['customers'],
  promotions: ['promo-codes'],
  website: ['offers', 'reviews', 'stories', 'content-sections'],
  media: ['media'],
  settings: ['store-settings', 'shipping-zones'],
}

export const MODULE_LABELS: Record<TenantModule, string> = {
  overview: 'Overview',
  products: 'Products',
  orders: 'Orders',
  customers: 'Customers',
  promotions: 'Promo codes',
  website: 'Website content',
  media: 'Media',
  settings: 'Settings',
}

/**
 * Fonts are chosen from this list only, never typed in, so a tenant can't inject CSS or load
 * an arbitrary stylesheet. `google` is the exact family spec for the Google Fonts CSS2 API.
 */
export const FONT_OPTIONS = [
  { label: 'System UI', value: 'system', stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { label: 'Outfit', value: 'outfit', stack: '"Outfit", system-ui, sans-serif', google: 'Outfit:wght@400;500;600;700' },
  { label: 'Inter', value: 'inter', stack: '"Inter", system-ui, sans-serif', google: 'Inter:wght@400;500;600;700' },
  { label: 'DM Sans', value: 'dm-sans', stack: '"DM Sans", system-ui, sans-serif', google: 'DM+Sans:wght@400;500;600;700' },
  { label: 'Manrope', value: 'manrope', stack: '"Manrope", system-ui, sans-serif', google: 'Manrope:wght@400;500;600;700' },
  { label: 'Montserrat', value: 'montserrat', stack: '"Montserrat", system-ui, sans-serif', google: 'Montserrat:wght@400;500;600;700' },
  { label: 'Poppins', value: 'poppins', stack: '"Poppins", system-ui, sans-serif', google: 'Poppins:wght@400;500;600;700' },
  { label: 'Playfair Display', value: 'playfair', stack: '"Playfair Display", Georgia, serif', google: 'Playfair+Display:wght@400;600;700' },
  { label: 'Cormorant Garamond', value: 'cormorant', stack: '"Cormorant Garamond", Georgia, serif', google: 'Cormorant+Garamond:wght@500;600;700' },
] as const
export type FontKey = (typeof FONT_OPTIONS)[number]['value']

export const RADIUS_OPTIONS = [
  { label: 'Square (0)', value: '0px' },
  { label: 'Subtle (4px)', value: '4px' },
  { label: 'Rounded (8px)', value: '8px' },
  { label: 'Soft (12px)', value: '12px' },
  { label: 'Pill-ish (16px)', value: '16px' },
] as const

export const THEME_OPTIONS = ['light', 'dark', 'system'] as const

export const COLOR_KEYS = ['primary', 'secondary', 'accent', 'background', 'surface', 'foreground', 'muted', 'border'] as const
export type ColorKey = (typeof COLOR_KEYS)[number]

export type TenantBranding = {
  logo?: MediaRef
  logoDark?: MediaRef
  favicon?: MediaRef
  colors?: Partial<Record<ColorKey, string | null>>
  typography?: { headingFont?: string | null; bodyFont?: string | null }
  appearance?: { borderRadius?: string | null; defaultTheme?: (typeof THEME_OPTIONS)[number] | null }
}
type MediaRef = string | { id: string; url?: string | null; alt?: string | null } | null

/** Six-digit hex only: the single colour format that ever reaches a stylesheet. */
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
