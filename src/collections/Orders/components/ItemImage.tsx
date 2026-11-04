'use client'
import type { TextFieldClientProps } from 'payload'

import { FieldLabel, useField } from '@payloadcms/ui'
import React from 'react'

/** Read-only product picture for an order line (the URL is the snapshot taken when the order was placed). */
export const ItemImage: React.FC<TextFieldClientProps> = ({ field, path }) => {
  const { value } = useField<string>({ path: path ?? field.name })
  return (
    <div className="field-type" style={{ marginBottom: 'var(--spacing-field, 16px)' }}>
      <FieldLabel label="Product image" path={path} />
      {value ? (
        <img
          src={value}
          alt="Product"
          loading="lazy"
          style={{
            display: 'block',
            width: 160,
            maxWidth: '100%',
            aspectRatio: '1 / 1',
            objectFit: 'cover',
            borderRadius: 'var(--style-radius-m)',
            border: '1px solid var(--theme-border-color)',
            background: 'var(--theme-elevation-50)',
          }}
        />
      ) : (
        <p style={{ margin: 0, color: 'var(--theme-elevation-500)' }}>No image</p>
      )}
    </div>
  )
}
