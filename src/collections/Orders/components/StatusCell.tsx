'use client'
import type { DefaultCellComponentProps } from 'payload'

import { Popup, PopupList, toast, useAuth, useConfig } from '@payloadcms/ui'
import React, { useState } from 'react'

/** One colour per status, taken from the tenant theme so it follows each brand (with neutral fallbacks). */
const TONE: Record<string, string> = {
  new: 'var(--tenant-accent-text, var(--theme-warning-600, #8a6d1f))',
  confirmed: 'var(--tenant-primary, var(--theme-elevation-800))',
  shipped: 'var(--tenant-secondary, var(--theme-elevation-600))',
  delivered: '#3a8a5c',
  cancelled: 'var(--theme-error-600, #b3261e)',
  returned: 'var(--theme-elevation-500)',
}
const tone = (status: string) => TONE[status] ?? 'var(--theme-elevation-500)'

const Dot: React.FC<{ status: string }> = ({ status }) => (
  <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: tone(status), flex: 'none' }} />
)

const Chevron = () => (
  <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4.5 6 7.5 9 4.5" />
  </svg>
)

/**
 * Status picker for the Orders list: change an order's status without opening it.
 * Saves through the normal REST API, so access control and the status-history hook still apply.
 */
export const StatusCell: React.FC<DefaultCellComponentProps> = ({ cellData, rowData, field }) => {
  const { config } = useConfig()
  const { permissions } = useAuth()
  const canEdit = Boolean(permissions?.collections?.orders?.update)
  const options = ('options' in field ? field.options : []) as { label: string; value: string }[]
  const [value, setValue] = useState<string>(cellData ?? '')
  const [saving, setSaving] = useState(false)
  const label = (v: string) => options.find((o) => o.value === v)?.label ?? v

  const change = async (next: string) => {
    if (next === value) return
    const previous = value
    setValue(next)
    setSaving(true)
    try {
      const res = await fetch(`${config.routes.api}/orders/${rowData.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error(String(res.status))
      toast.success(`Order ${rowData.orderNumber ?? ''} set to ${label(next)}`)
    } catch {
      setValue(previous)
      toast.error('Could not update the status')
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit) {
    // View-only users see the status but can't change it.
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500 }}>
        <Dot status={value} />
        {label(value)}
      </span>
    )
  }

  return (
    <Popup
      buttonType="custom"
      horizontalAlign="left"
      disabled={saving}
      button={
        <span
          role="button"
          aria-label={`Status of order ${rowData.orderNumber ?? ''}: ${label(value)}. Change status`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 10px',
            minWidth: 128,
            justifyContent: 'space-between',
            borderRadius: 'var(--style-radius-m)',
            border: '1px solid color-mix(in srgb, ' + tone(value) + ' 35%, var(--theme-border-color))',
            background: 'color-mix(in srgb, ' + tone(value) + ' 9%, var(--theme-bg))',
            color: 'var(--theme-text)',
            fontSize: 13,
            fontWeight: 500,
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Dot status={value} />
            {label(value)}
          </span>
          <Chevron />
        </span>
      }
      render={({ close }) => (
        <PopupList.ButtonGroup>
          {options.map((o) => (
            <PopupList.Button
              key={o.value}
              active={o.value === value}
              onClick={() => {
                close()
                void change(o.value)
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Dot status={o.value} />
                {o.label}
              </span>
            </PopupList.Button>
          ))}
        </PopupList.ButtonGroup>
      )}
    />
  )
}
