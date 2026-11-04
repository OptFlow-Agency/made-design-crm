import React from 'react'

import { getActiveBranding } from './getContext'

/** Branded greeting at the top of the dashboard. */
const TenantDashboardIntro = async ({ payload, user }: any) => {
  const active = await getActiveBranding(payload, user)
  return (
    <section
      style={{
        background: 'var(--tenant-surface, var(--theme-elevation-50))',
        border: '1px solid var(--theme-border-color)',
        borderRadius: 'var(--style-radius-m)',
        padding: '24px',
        marginBottom: 24,
      }}
    >
      <p style={{ margin: 0, color: 'var(--tenant-muted, var(--theme-elevation-500))', fontSize: 13 }}>{active.kind === 'platform' ? 'Platform' : 'Welcome back'}{user?.name ? ` · ${user.name}` : ''}</p>
      <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--tenant-heading-font, inherit)' }}>{active.name}</h2>
    </section>
  )
}
export default TenantDashboardIntro
