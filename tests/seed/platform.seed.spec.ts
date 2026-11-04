// @vitest-environment node
import path from 'path'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { it } from 'vitest'

/**
 * Idempotent branding for the platform itself (Made Design, the owner of this CRM, not a tenant).
 * Brand values come from madedesign.agency (its stylesheet tokens and favicon.svg).
 * Run: `pnpm seed:platform`. Values already changed in the admin are kept.
 */
it('seeds the platform settings', async () => {
  const payload = await getPayload({ config: await config })
  const current = await payload.findGlobal({ slug: 'platform-settings', depth: 0 })
  const b = current.branding ?? {}

  let logo = b.logo as string | null | undefined
  if (!logo) {
    logo = (await payload.create({ collection: 'platform-media', data: { alt: 'Made Design' }, filePath: path.resolve(__dirname, 'platform-logo.svg') })).id
  }

  const custom = (v?: string | null) => (v && v !== 'system' ? v : undefined) // 'system' is the field default
  await payload.updateGlobal({
    slug: 'platform-settings',
    data: {
      name: current.name || 'Made Design',
      branding: {
        logo,
        colors: {
          primary: b.colors?.primary ?? '#14130f',
          secondary: b.colors?.secondary ?? '#5c5b57',
          accent: b.colors?.accent ?? '#d4400a',
          background: b.colors?.background ?? '#ffffff',
          surface: b.colors?.surface ?? '#f6f5f2',
          foreground: b.colors?.foreground ?? '#14130f',
          muted: b.colors?.muted ?? '#5c5b57',
          border: b.colors?.border ?? '#e6e5e0',
        },
        typography: { headingFont: (custom(b.typography?.headingFont) ?? 'outfit') as 'outfit', bodyFont: (custom(b.typography?.bodyFont) ?? 'outfit') as 'outfit' },
        appearance: { borderRadius: b.appearance?.borderRadius ?? '8px', defaultTheme: b.appearance?.defaultTheme ?? 'light' },
      },
    },
  })
}, 60_000)
