import type { PayloadRequest } from 'payload'

import { APIError } from 'payload'

export type Tenant = { id: string; slug: string; domain?: string | null; status?: string | null }

/** Public API errors carry a stable `error` code the storefront can match on (e.g. `invalid_promo`). */
export class StoreError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code)
  }
}

const serverOrigin = (req: PayloadRequest) => {
  const configured = process.env.NEXT_PUBLIC_SERVER_URL
  return (configured || new URL(req.url as string).origin).replace(/\/$/, '')
}

/** Absolute URL for a Payload media path (storefronts live on another origin). */
export const absoluteUrl = (req: PayloadRequest, path?: string | null) =>
  path ? (path.startsWith('http') ? path : `${serverOrigin(req)}${path}`) : null

export const resolveTenant = async (req: PayloadRequest): Promise<Tenant> => {
  const slug = String(req.routeParams?.tenant ?? '')
  const found = await req.payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  const tenant = found.docs[0]
  if (!tenant || tenant.status === 'suspended') throw new StoreError('store_not_found', 404)
  return tenant
}

/** Browsers may only call from the store's own domain (plus any dev origins from the environment). */
const allowedOrigins = (tenant: Tenant): string[] => {
  const dev = (process.env.STORE_DEV_ORIGINS ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:4321'))
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  const domain = tenant.domain?.trim()
  return [...(domain ? [`https://${domain}`, `https://www.${domain}`] : []), ...dev]
}

const corsHeaders = (req: PayloadRequest, tenant?: Tenant): Record<string, string> => {
  const origin = req.headers.get('origin')
  const base: Record<string, string> = { Vary: 'Origin' }
  if (origin && tenant && allowedOrigins(tenant).includes(origin)) {
    base['Access-Control-Allow-Origin'] = origin
    base['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    base['Access-Control-Allow-Headers'] = 'Content-Type'
    base['Access-Control-Max-Age'] = '86400'
  }
  return base
}

type Handler = (ctx: { req: PayloadRequest; tenant: Tenant }) => Promise<unknown>

/**
 * Wraps a storefront handler: resolves the tenant from the URL, enforces the tenant's CORS
 * origins, and turns thrown errors into `{ error: code }` JSON.
 */
export const storeHandler =
  (handler: Handler, cache?: string) =>
  async (req: PayloadRequest): Promise<Response> => {
    let tenant: Tenant | undefined
    try {
      tenant = await resolveTenant(req)
      const origin = req.headers.get('origin')
      if (origin && !allowedOrigins(tenant).includes(origin)) throw new StoreError('origin_not_allowed', 403)

      const body = await handler({ req, tenant })
      return Response.json(body, { headers: { ...corsHeaders(req, tenant), ...(cache ? { 'Cache-Control': cache } : {}) } })
    } catch (e) {
      const status = e instanceof StoreError ? e.status : e instanceof APIError ? e.status : 500
      const code = e instanceof StoreError ? e.code : e instanceof APIError && status < 500 ? e.message : 'server_error'
      if (status >= 500) req.payload.logger.error({ err: e, msg: 'storefront endpoint failed' })
      return Response.json({ error: code }, { status, headers: corsHeaders(req, tenant) })
    }
  }

export const preflight =
  () =>
  async (req: PayloadRequest): Promise<Response> => {
    try {
      const tenant = await resolveTenant(req)
      return new Response(null, { status: 204, headers: corsHeaders(req, tenant) })
    } catch {
      return new Response(null, { status: 204 })
    }
  }

/** Cart payload shared by the promo and order endpoints: `[{ slug, qty, variant? }]`, 1–30 lines, 1–9 each. */
export const parseItems = (raw: unknown): { slug: string; qty: number; variant?: string }[] => {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 30) throw new StoreError('invalid_items')
  const items = raw.map((i) => ({ slug: String(i?.slug ?? ''), qty: Number(i?.qty), ...(i?.variant ? { variant: String(i.variant).slice(0, 120) } : {}) }))
  if (items.some((i) => !i.slug || !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 9)) throw new StoreError('invalid_items')
  const perSlug = new Map<string, number>()
  for (const i of items) perSlug.set(i.slug, (perSlug.get(i.slug) ?? 0) + i.qty)
  if ([...perSlug.values()].some((q) => q > 9)) throw new StoreError('invalid_items')
  return items
}
