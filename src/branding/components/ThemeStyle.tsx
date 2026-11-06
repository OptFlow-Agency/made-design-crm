import React from 'react'

import type { ActiveBranding } from '@/branding/resolveTenant'
import { buildThemeCss, googleFontsHref, resolveTheme } from '@/branding/theme'

/** The <style> (and font links) for a brand. Only validated values reach the stylesheet, see `buildThemeCss`. */
export const ThemeStyle: React.FC<{ active: ActiveBranding; user?: unknown }> = ({ active }) => {
  const theme = resolveTheme(active.branding)
  const fonts = googleFontsHref(theme)
  const css = buildThemeCss(theme)
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
