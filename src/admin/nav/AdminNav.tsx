import { Logout } from '@payloadcms/ui'
import { RenderServerComponent } from '@payloadcms/ui/elements/RenderServerComponent'
import { getTranslation } from '@payloadcms/translations'
import { formatAdminURL } from 'payload/shared'
import React from 'react'

import { hiddenCollectionsFor } from '@/access/modules'
import { getActiveBranding } from '@/branding/components/getContext'
import type { TenantModule } from '@/branding/config'
import { checkRole } from '@/access/utilities'

import { AGENCY_ONLY, FALLBACK_ICON, SECTION_DEFS, type NavLinkItem, type NavSectionModel } from './navModel'
import { Sidebar } from './Sidebar'

const media = (m: unknown) => (m && typeof m === 'object' && 'url' in m ? ((m as { url?: string | null }).url ?? null) : null)

const ROLE_LABEL = (roles: string[] | undefined) =>
  roles?.includes('admin') ? 'Platform admin' : roles?.includes('tenant-admin') ? 'Store admin' : 'Staff'

/**
 * The application sidebar (Payload's `admin.components.Nav`).
 * Server side: works out what this user may see in this store. Client side (`Sidebar`): collapse, groups, mobile, quick jump.
 */
const AdminNav = async (props: any) => {
  const { payload, user, permissions, i18n, visibleEntities, documentSubViewType, viewType, locale, params, searchParams } = props
  if (!payload?.config) return null

  const active = await getActiveBranding(payload, user)
  const hidden = new Set(hiddenCollectionsFor(user, active.modules as TenantModule[]))
  const isPlatformAdmin = checkRole(['admin'], user)
  const adminRoute = payload.config.routes.admin as string
  const href = (path: '' | `/${string}`) => formatAdminURL({ adminRoute, path })

  const collections = new Map<string, any>(payload.config.collections.map((c: any) => [c.slug, c]))
  const globals = new Map<string, any>(payload.config.globals.map((g: any) => [g.slug, g]))

  const canSee = (slug: string, kind: 'collection' | 'global') => {
    if (AGENCY_ONLY.has(slug) && !isPlatformAdmin) return false
    if (kind === 'collection') {
      return visibleEntities.collections.includes(slug) && !hidden.has(slug) && permissions?.collections?.[slug]?.read !== false
    }
    return visibleEntities.globals.includes(slug) && permissions?.globals?.[slug]?.read !== false
  }
  const labelOf = (slug: string, kind: 'collection' | 'global') => {
    const entity = kind === 'collection' ? collections.get(slug) : globals.get(slug)
    const raw = kind === 'collection' ? entity?.labels?.plural : entity?.label
    return (raw ? getTranslation(raw, i18n) : slug) as string
  }

  const placed = new Set<string>()
  const sections: NavSectionModel[] = []
  for (const section of SECTION_DEFS) {
    const items: NavLinkItem[] = []
    for (const def of section.items) {
      if (!canSee(def.slug, def.kind)) continue
      if (!def.virtual) placed.add(`${def.kind}:${def.slug}`)
      const base: `/${string}` = def.kind === 'collection' ? `/collections/${def.slug}` : `/globals/${def.slug}`
      if (def.virtual === 'inventory') {
        items.push({ key: `${def.slug}-inventory`, label: def.label!, href: href(`${base}?where[trackInventory][equals]=true&sort=stock`), icon: def.icon, queryMatch: 'trackInventory' })
        continue
      }
      items.push({
        key: `${def.kind}-${def.slug}`,
        label: def.label ?? labelOf(def.slug, def.kind),
        href: href(base),
        icon: def.icon,
        queryExclude: def.slug === 'products' ? 'trackInventory' : undefined,
      })
    }
    if (items.length) sections.push({ key: section.key, label: section.label, items })
  }

  // Anything Payload shows that this model doesn't know about: still reachable.
  const extra: NavLinkItem[] = [
    ...visibleEntities.collections.filter((s: string) => !placed.has(`collection:${s}`) && canSee(s, 'collection')).map((s: string) => ({ key: `collection-${s}`, label: labelOf(s, 'collection'), href: href(`/collections/${s}`), icon: FALLBACK_ICON })),
    ...visibleEntities.globals.filter((s: string) => !placed.has(`global:${s}`) && canSee(s, 'global')).map((s: string) => ({ key: `global-${s}`, label: labelOf(s, 'global'), href: href(`/globals/${s}`), icon: FALLBACK_ICON })),
  ]
  if (extra.length) sections.push({ key: 'more', label: 'More', items: extra })

  const serverProps = { i18n, locale, params, payload, permissions, searchParams, user }
  const clientProps = { documentSubViewType, viewType }
  // The multi-tenant plugin's store switcher is registered here; it renders nothing for single-store users.
  const switcher = RenderServerComponent({ clientProps, Component: payload.config.admin.components.beforeNavLinks, importMap: payload.importMap, serverProps })
  const logout = RenderServerComponent({ clientProps, Component: payload.config.admin.components.logout?.Button, Fallback: Logout, importMap: payload.importMap, serverProps })

  return (
    <Sidebar
      brand={{
        name: active.name,
        caption: active.kind === 'platform' ? 'Agency console' : ROLE_LABEL(user?.roles),
        logo: media(active.branding?.logo),
        logoDark: media(active.branding?.logoDark),
        kind: active.kind,
      }}
      overview={{ label: 'Overview', href: href('') }}
      sections={sections}
      switcher={switcher}
      logout={logout}
      userLabel={user?.name || user?.email || ''}
    />
  )
}

export default AdminNav
