'use client'
import { useRowLabel } from '@payloadcms/ui'
import React from 'react'

type Item = { productName?: string; productImage?: string; variantName?: string; quantity?: number; lineTotal?: number }

/** Header of each order line: thumbnail, product, variant and quantity, readable even when collapsed. */
export const ItemRowLabel: React.FC = () => {
  const { data, rowNumber } = useRowLabel<Item>()
  const title = data?.productName || `Item ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      {data?.productImage && (
        <img
          src={data.productImage}
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
