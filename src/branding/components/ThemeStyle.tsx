import React from 'react'

import { hiddenCollectionsFor } from '@/access/modules'
import type { TenantModule } from '@/branding/config'
import type { ActiveBranding } from '@/branding/resolveTenant'
import { buildThemeCss, googleFontsHref, resolveTheme } from '@/branding/theme'

/** The <style> (and font links) for a brand. Only validated values reach the stylesheet, see `buildThemeCss`. */
export const ThemeStyle: React.FC<{ active: ActiveBranding; user?: unknown }> = ({ active, user }) => {
  const theme = resolveTheme(active.branding)
  const fonts = googleFontsHref(theme)
  // Keep the dashboard cards in step with the nav (slugs come from our own constants, never from tenant input).
  const hiddenCards = hiddenCollectionsFor(user as never, active.modules as TenantModule[])
  const css = buildThemeCss(theme) + hiddenCards.map((s) => `\n#card-${s}{display:none}`).join('')
  return (
    <>
      {fonts && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link rel="stylesheet" href={fonts} />
        </>
      )}
      <style data-tenant-theme={active.slug ?? 'platform'} dangerouslySetInnerHTML={{ __html: css }} />
    </>
  )
}
