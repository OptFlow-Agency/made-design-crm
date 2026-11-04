// @vitest-environment node
import path from 'path'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { it } from 'vitest'

/**
 * Idempotent branding for Maison Sabra, from the "Maison Sabra – Case Study" PDF (visual identity page):
 * burgundy/ivory/antique-gold palette, Cormorant Garamond headings, Montserrat body, MS monogram.
 * Only touches branding; values already customised in the admin are kept. Run: `pnpm seed:maison-sabra`.
 */
it('applies Maison Sabra branding', async () => {
  const payload = await getPayload({ config: await config })
  const tenant = (await payload.find({ collection: 'tenants', where: { slug: { equals: 'maisonsabra' } }, limit: 1, depth: 0 })).docs[0]
  if (!tenant) throw new Error('Maison Sabra tenant not found: import the store data first')

  const b = tenant.branding ?? {}
  const upload = async (file: string, alt: string) =>
    (await payload.create({ collection: 'media', data: { alt, tenant: tenant.id } as never, filePath: path.resolve(__dirname, file) })).id
  const logo = (b.logo as string | null | undefined) ?? (await upload('maison-sabra-logo.png', 'Maison Sabra monogram'))
  const logoDark = (b.logoDark as string | null | undefined) ?? (await upload('maison-sabra-logo-dark.png', 'Maison Sabra monogram (light)'))

  const custom = (v?: string | null) => (v && v !== 'system' ? v : undefined) // 'system' is the field default
  await payload.update({
    collection: 'tenants',
    id: tenant.id,
    data: {
      branding: {
        logo,
        logoDark,
        colors: {
          primary: b.colors?.primary ?? '#78143a', // burgundy
          secondary: b.colors?.secondary ?? '#4d0206', // oxblood
          accent: b.colors?.accent ?? '#b08231', // antique gold
          background: b.colors?.background ?? '#f5ecde', // ivory
          surface: b.colors?.surface ?? '#efe2cf',
          foreground: b.colors?.foreground ?? '#090806', // ink
          muted: b.colors?.muted ?? '#6b5a4c',
          border: b.colors?.border ?? '#d9c8b0',
        },
        typography: { headingFont: custom(b.typography?.headingFont) ?? 'cormorant', bodyFont: custom(b.typography?.bodyFont) ?? 'montserrat' },
        appearance: { borderRadius: b.appearance?.borderRadius ?? '4px', defaultTheme: b.appearance?.defaultTheme ?? 'light' },
      },
    } as never,
  })
}, 60_000)
