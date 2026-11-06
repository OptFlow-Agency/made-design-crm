import React from 'react'

import { getActiveBranding } from './getContext'

const url = (m: unknown) => (m && typeof m === 'object' && 'url' in m ? ((m as { url?: string | null }).url ?? null) : null)

/** Logo for the nav icon and login screen (the store's, or the platform's); falls back to the name. */
const TenantLogo = async ({ payload, user }: any) => {
  const active = await getActiveBranding(payload, user)
  const light = url(active.branding?.logo)
  const dark = url(active.branding?.logoDark)
  const name = active.name
  if (!light) return <strong style={{ fontFamily: 'var(--tenant-heading-font, inherit)', fontSize: 20 }}>{name}</strong>
  const style = { maxHeight: 40, maxWidth: '100%', objectFit: 'contain' as const }
  // Both variants are rendered and swapped with CSS on Payload's own theme attribute (see buildThemeCss).
  return (
    <>
      <img className={`tenant-logo tenant-logo--light${dark ? ' tenant-logo--has-dark' : ''}`} src={light} alt={name} style={style} />
      {dark && <img className="tenant-logo tenant-logo--dark" src={dark} alt={name} style={style} />}
    </>
  )
}
export default TenantLogo
