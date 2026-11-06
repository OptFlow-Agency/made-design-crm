import { Link } from '@payloadcms/ui'
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import React from 'react'

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

/** Restrained status label: a dot and text, tinted from the semantic tone (never the brand colour). */
export const StatusBadge: React.FC<{ tone: Tone; children: React.ReactNode }> = ({ tone, children }) => (
  <span className="ds-badge" data-tone={tone}>{children}</span>
)

export const ORDER_TONE: Record<string, Tone> = { new: 'warning', confirmed: 'info', shipped: 'info', delivered: 'success', cancelled: 'neutral', returned: 'danger' }
export const PAYMENT_TONE: Record<string, Tone> = { pending: 'warning', paid: 'success', refunded: 'neutral' }

export const Panel: React.FC<{ title: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, description, action, children, className }) => (
  <section className={`ds-panel${className ? ` ${className}` : ''}`}>
    <header className="ds-panel__head">
      <div>
        <h2 className="ds-panel__title">{title}</h2>
        {description && <p className="ds-panel__desc">{description}</p>}
      </div>
      {action}
    </header>
    {children}
  </section>
)

export const EmptyState: React.FC<{ icon: LucideIcon; title: string; children?: React.ReactNode; action?: { href: string; label: string } }> = ({ icon: Icon, title, children, action }) => (
  <div className="ds-empty">
    <span className="ds-empty__icon"><Icon size={18} aria-hidden /></span>
    <p className="ds-empty__title">{title}</p>
    {children && <p className="ds-empty__text">{children}</p>}
    {action && <Link className="ds-btn ds-btn--ghost" href={action.href} prefetch={false}>{action.label}</Link>}
  </div>
)

export const StatCard: React.FC<{
  label: string
  value: string
  icon: LucideIcon
  hint?: string
  /** Percentage change against the previous period. Only passed when it can be computed from real data. */
  delta?: number | null
  href?: string
  tone?: 'default' | 'attention'
}> = ({ label, value, icon: Icon, hint, delta, href, tone = 'default' }) => {
  const body = (
    <>
      <span className="ds-stat__top">
        <span className="ds-stat__label">{label}</span>
        <Icon size={15} strokeWidth={1.75} aria-hidden />
      </span>
      <span className="ds-stat__value">{value}</span>
      <span className="ds-stat__foot">
        {delta != null && Number.isFinite(delta) && (
          <span className="ds-delta" data-dir={delta >= 0 ? 'up' : 'down'}>
            {delta >= 0 ? <ArrowUpRight size={13} aria-hidden /> : <ArrowDownRight size={13} aria-hidden />}
            {Math.abs(delta).toFixed(Math.abs(delta) < 10 ? 1 : 0)}%
            <span className="visually-hidden">{delta >= 0 ? ' increase' : ' decrease'}</span>
          </span>
        )}
        {hint && <span className="ds-stat__hint">{hint}</span>}
      </span>
    </>
  )
  return href ? (
    <Link href={href} className="ds-stat ds-stat--link" data-tone={tone} prefetch={false}>{body}</Link>
  ) : (
    <div className="ds-stat" data-tone={tone}>{body}</div>
  )
}

/** Shown by `loading.tsx`-style boundaries and while a range switch streams in. */
export const DashboardSkeleton: React.FC = () => (
  <div className="ds-skeleton" aria-busy="true" aria-label="Loading dashboard">
    <div className="ds-sk ds-sk--title" />
    <div className="ds-grid-stats">{Array.from({ length: 5 }, (_, i) => <div key={i} className="ds-sk ds-sk--card" />)}</div>
    <div className="ds-sk ds-sk--chart" />
  </div>
)
