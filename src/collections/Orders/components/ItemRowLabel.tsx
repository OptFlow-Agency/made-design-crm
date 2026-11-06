'use client'
import { useRowLabel } from '@payloadcms/ui'
import React, { useState } from 'react'

import { useProductImage } from './useProductImage'

type Item = { product?: unknown; productName?: string; productImage?: string; variantName?: string; quantity?: number; lineTotal?: number }

/** Header of each order line: thumbnail, product, variant and quantity, readable even when collapsed. */
export const ItemRowLabel: React.FC = () => {
  const { data, rowNumber } = useRowLabel<Item>()
  const current = useProductImage(data?.product)
  const [failed, setFailed] = useState<string[]>([])
  const thumb = [current, data?.productImage].find((u): u is string => Boolean(u) && !failed.includes(u as string))
  const title = data?.productName || `Item ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      {thumb && (
        <img
          src={thumb}
          onError={() => setFailed((f) => [...f, thumb])}
          alt=""
          width={32}
          height={32}
          loading="lazy"
          style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 'var(--style-radius-s)', border: '1px solid var(--theme-border-color)' }}
        />
      )}
      <span>
        {title}
        {data?.variantName ? ` · ${data.variantName}` : ''}
        {data?.quantity ? ` × ${data.quantity}` : ''}
      </span>
    </span>
  )
}
