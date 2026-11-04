import config from '@/payload.config'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { MODULE_COLLECTIONS } from '@/branding/config'
import { resolveActiveTenant, resolveBranding } from '@/branding/resolveTenant'
import { buildThemeCss, contrast, resolveTheme } from '@/branding/theme'

describe('theme engine', () => {
  it('falls back to neutral defaults when branding is missing', () => {
    const t = resolveTheme(undefined)
    expect(t.light.primary).toBe('#111111')
    expect(t.googleFamilies).toEqual([])
  })

  it('ignores invalid colours and unknown fonts instead of emitting them', () => {
    const css = buildThemeCss(
      resolveTheme({
        colors: { primary: 'red; } body{display:none', accent: 'url(x)', background: '#abc' },
        typography: { headingFont: 'x; @import url(evil)', bodyFont: 'outfit' },
        appearance: { borderRadius: '99px}' },
      }),
    )
    expect(css).not.toMatch(/evil|body\{display:none|url\(/)
    expect(css).toContain('"Outfit"')
  })

  it('keeps text readable in light and dark palettes', () => {
    const t = resolveTheme({ colors: { primary: '#e8480c', accent: '#e8480c', background: '#ffffff', foreground: '#14130f' } })
    expect(contrast(t.light.foreground, t.light.background)).toBeGreaterThanOrEqual(7)
    expect(contrast(t.light.onPrimary, t.light.primary)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(t.dark.foreground, t.dark.background)).toBeGreaterThanOrEqual(7)
    expect(contrast(t.dark.accent, t.dark.background)).toBeGreaterThanOrEqual(4.5)
  })

  it('Maison Sabra palette stays readable (gold accent is darkened only where used as text)', () => {
    const t = resolveTheme({ colors: { primary: '#78143a', secondary: '#4d0206', accent: '#b08231', background: '#f5ecde', foreground: '#090806' }, typography: { headingFont: 'cormorant', bodyFont: 'montserrat' } })
    expect(t.light.accent).toBe('#b08231') // brand value untouched
    expect(contrast(t.light.accentText, t.light.background)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(t.light.onPrimary, t.light.primary)).toBeGreaterThanOrEqual(7)
    expect(contrast(t.dark.accentText, t.dark.background)).toBeGreaterThanOrEqual(4.5)
    expect(t.googleFamilies.join()).toMatch(/Cormorant.*Montserrat/)
  })

  it('every module collection exists in the config', async () => {
    const payload = await getPayload({ config: await config })
    for (const slug of Object.values(MODULE_COLLECTIONS).flat()) expect(payload.collections[slug]).toBeDefined()
  })
})

describe('tenant resolution', () => {
  let payload: Payload
  const stamp = `${Date.now()}${Math.floor(Math.random() * 10000)}`
  let a: any, b: any, member: any, multi: any, admin: any, bootstrap: any

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    if ((await payload.count({ collection: 'users' })).totalDocs === 0) {
      bootstrap = await payload.create({ collection: 'users', data: { email: `zz-boot-${stamp}@example.test`, password: 'Test-pass-123!' } as never })
    }
    a = await payload.create({ collection: 'tenants', data: { name: 'ZZ Brand A', slug: `zz-a-${stamp}`, branding: { colors: { accent: '#d4400a' } }, modules: ['orders'] } as never })
    b = await payload.create({ collection: 'tenants', data: { name: 'ZZ Brand B', slug: `zz-b-${stamp}`, branding: { colors: { accent: '#0a7ad4' } } } as never })
    const mk = (n: string, roles: string[], tenants: number[]) =>
      payload.create({ collection: 'users', data: { email: `zz-${n}-${stamp}@example.test`, password: 'Test-pass-123!', roles, tenants: tenants.map((tenant) => ({ tenant })) } as never })
    member = await mk('m', ['tenant-admin'], [a.id])
    multi = await mk('x', ['tenant-admin'], [a.id, b.id])
    admin = await mk('adm', ['admin'], [])
  })

  afterAll(async () => {
    for (const u of [member, multi, admin, bootstrap]) if (u) await payload.delete({ collection: 'users', id: u.id })
    for (const t of [a, b]) if (t) await payload.delete({ collection: 'tenants', id: t.id })
  })

  const resolve = async (user: any, cookieValue?: string) => {
    const full = await payload.findByID({ collection: 'users', id: user.id, depth: 0 })
    return resolveActiveTenant({ payload, user: full as never, cookieValue })
  }

  it('a member gets their own tenant', async () => {
    expect((await resolve(member))?.id).toBe(a.id)
  })

  it('a forged cookie for another tenant is ignored', async () => {
    expect((await resolve(member, String(b.id)))?.id).toBe(a.id)
    expect((await resolve(member, '1; DROP'))?.id).toBe(a.id)
  })

  it('a multi-tenant user can switch between their tenants only', async () => {
    expect((await resolve(multi, String(b.id)))?.id).toBe(b.id)
    expect((await resolve(multi, String(a.id)))?.id).toBe(a.id)
  })

  it('platform admins can switch to any tenant; two tenants resolve to different themes', async () => {
    const ta = await resolve(admin, String(a.id))
    const tb = await resolve(admin, String(b.id))
    expect(ta?.id).toBe(a.id)
    expect(tb?.id).toBe(b.id)
    expect(buildThemeCss(resolveTheme(ta!.branding as never))).toContain('#d4400a')
    expect(buildThemeCss(resolveTheme(tb!.branding as never))).toContain('#0a7ad4')
    expect(buildThemeCss(resolveTheme(tb!.branding as never))).not.toContain('#d4400a')
  })

  it('a user with no tenants and no admin role gets no tenant', async () => {
    const none = await payload.create({ collection: 'users', data: { email: `zz-n-${stamp}@example.test`, password: 'Test-pass-123!', roles: ['tenant-admin'] } as never })
    expect(await resolve(none, String(a.id))).toBeNull()
    await payload.delete({ collection: 'users', id: none.id })
  })

  const branding = async (user: any, cookieValue?: string | null) => {
    const full = user ? await payload.findByID({ collection: 'users', id: user.id, depth: 0 }) : null
    return resolveBranding({ payload, user: full as never, cookieValue })
  }

  it('the platform brand (Made Design) shows on the login page and for platform admins with no store selected', async () => {
    expect((await branding(null)).kind).toBe('platform')
    const none = await branding(admin)
    expect(none.kind).toBe('platform')
    expect(none.modules).toEqual([])
    expect(typeof none.name).toBe('string')
  })

  it('selecting a store switches to that store, and switching back clears it', async () => {
    expect(await branding(admin, String(a.id))).toMatchObject({ kind: 'tenant', slug: a.slug, modules: ['orders'] })
    expect(await branding(admin, String(b.id))).toMatchObject({ kind: 'tenant', slug: b.slug })
    expect((await branding(admin, null)).kind).toBe('platform')
  })

  it('store staff always get their own store, never another store or the platform brand', async () => {
    expect(await branding(member)).toMatchObject({ kind: 'tenant', slug: a.slug })
    expect(await branding(member, String(b.id))).toMatchObject({ kind: 'tenant', slug: a.slug }) // forged cookie ignored
  })

  it('only platform admins can change the platform settings', async () => {
    const full = { ...(await payload.findByID({ collection: 'users', id: member.id, depth: 0 })), collection: 'users' } as never
    await expect(payload.updateGlobal({ slug: 'platform-settings', data: { name: 'Hacked' } as never, user: full, overrideAccess: false })).rejects.toThrow()
    await expect(payload.updateGlobal({ slug: 'platform-settings', data: { branding: { colors: { primary: 'nope' } } } as never })).rejects.toThrow()
  })

  it('rejects invalid colours at the API', async () => {
    await expect(payload.update({ collection: 'tenants', id: a.id, data: { branding: { colors: { primary: 'javascript:1' } } } as never })).rejects.toThrow()
  })

  it('only platform admins can change enabled modules', async () => {
    const full = await payload.findByID({ collection: 'users', id: member.id, depth: 0 })
    const updated = await payload.update({
      collection: 'tenants', id: a.id, data: { modules: ['orders', 'customers'] } as never,
      user: { ...full, collection: 'users' } as never, overrideAccess: false,
    })
    expect(updated.modules).toEqual(['orders'])
  })
})
