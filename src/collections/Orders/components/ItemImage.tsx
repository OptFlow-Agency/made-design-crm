'use client'
import type { TextFieldClientProps } from 'payload'

import { FieldLabel, useConfig, useField, useFormFields } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

/**
 * Read-only product picture for an order line.
 * The line keeps a snapshot URL from when the order was placed, but that URL can go stale (storage moved, file re-uploaded),
 * so the product's current first image is preferred and the snapshot is only the fallback.
 */
export const ItemImage: React.FC<TextFieldClientProps> = ({ field, path }) => {
  const { value: snapshot } = useField<string>({ path: path ?? field.name })
  const { config } = useConfig()
  const productPath = (path ?? field.name).replace(/productImage$/, 'product')
  const productId = useFormFields(([fields]) => fields[productPath]?.value) as string | undefined

  const [current, setCurrent] = useState<string | null>(null)
  const [failed, setFailed] = useState<string[]>([])

  useEffect(() => {
    setCurrent(null)
    if (!productId || typeof productId !== 'string') return
    const controller = new AbortController()
    fetch(`${config.routes.api}/products/${productId}?depth=2&select[gallery]=true`, { credentials: 'include', signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((doc) => {
        const image = doc?.gallery?.[0]?.image
        setCurrent(image && typeof image === 'object' ? (image.sizes?.thumb?.url ?? image.url ?? null) : null)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [productId, config.routes.api])

  const src = [current, snapshot].find((u): u is string => Boolean(u) && !failed.includes(u as string))

  return (
    <div className="field-type" style={{ marginBottom: 'var(--spacing-field, 16px)' }}>
      <FieldLabel label="Product image" path={path} />
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="Product"
          loading="lazy"
          onError={() => setFailed((f) => [...f, src])}
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
        <p style={{ margin: 0, color: 'var(--theme-elevation-500)' }}>{snapshot ? 'Image unavailable' : 'No image'}</p>
      )}
    </div>
  )
}
