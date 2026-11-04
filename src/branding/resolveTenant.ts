import type { Payload } from 'payload'

import { checkRole } from '@/access/utilities'
import { idOf, isId } from '@/utilities/ids'
import type { TenantBranding, TenantModule } from '@/branding/config'
import type { Tenant, User } from '@/payload-types'


/**
 * The tenant the signed-in user is currently working in.
 *
 * The multi-tenant plugin keeps the choice in the `payload-tenant` cookie. A cookie is
 * user-controlled, so it is only a *preference* here: it is honoured when the user may access
 * that tenant (platform admins: any tenant; everyone else: tenants in their `tenants` list),
 * otherwise we fall back to the user's first tenant. Branding is read only after that check.
 */
export async function resolveActiveTenant({
  payload,
  user,
  cookieValue,
}: {
  payload: Payload
  user: User | null | undefined
  cookieValue?: string | null
}): Promise<Tenant | null> {
  if (!user) return null

  const isPlatformAdmin = checkRole(['admin'], user)
  const memberships = (user.tenants ?? []).map((row) => idOf(row.tenant)).filter((id): id is string => id != null)
  const requested = isId(cookieValue) ? cookieValue : undefined

  let id: string | undefined
  if (requested != null && (isPlatformAdmin || memberships.includes(requested))) id = requested
  else id = memberships[0]
  if (id == null) return null

  // Authorization is decided above, so read with override: tenant docs are otherwise public-read for storefront lookups.
  try {
    return await payload.findByID({ collection: 'tenants', id, depth: 1, overrideAccess: true })
  } catch {
    return null
  }
}

export type ActiveBranding = {
  kind: 'tenant' | 'platform'
  name: string
  slug: string | null
  branding: TenantBranding | null
  /** Enabled navigation modules; empty means "show everything" (always the case for the platform). */
  modules: TenantModule[]
}

/**
 * What the admin should look like for this request.
 * - A store the user is authorised to work in (see `resolveActiveTenant`): that store's brand and modules.
 * - Otherwise (platform admins with no store selected, the login page): the platform's own brand, Made Design.
 */
export async function resolveBranding({
  payload,
  user,
  cookieValue,
}: {
  payload: Payload
  user: User | null | undefined
  cookieValue?: string | null
}): Promise<ActiveBranding> {
  // A platform admin only sees a store's brand after explicitly selecting that store.
  const wantsTenant = Boolean(user) && (!checkRole(['admin'], user) || Boolean(cookieValue))
  const tenant = wantsTenant ? await resolveActiveTenant({ payload, user, cookieValue }) : null
  if (tenant) {
    return { kind: 'tenant', name: tenant.name, slug: tenant.slug, branding: (tenant.branding ?? null) as TenantBranding | null, modules: (tenant.modules ?? []) as TenantModule[] }
  }
  const platform = await payload.findGlobal({ slug: 'platform-settings', depth: 1, overrideAccess: true }).catch(() => null)
  return { kind: 'platform', name: platform?.name || 'Made Design', slug: null, branding: (platform?.branding ?? null) as TenantBranding | null, modules: [] }
}
