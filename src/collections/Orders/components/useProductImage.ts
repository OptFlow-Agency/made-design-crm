'use client'
import { useConfig } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

const cache = new Map<string, string | null>()

/** The product's current first gallery image (small size), or null. Shared by the order line thumbnail and picture. */
export function useProductImage(product: unknown): string | null {
  const { config } = useConfig()
  const id = typeof product === 'string' ? product : product && typeof product === 'object' && 'id' in product ? String((product as { id: unknown }).id) : null
  const [url, setUrl] = useState<string | null>(id ? (cache.get(id) ?? null) : null)

  useEffect(() => {
    if (!id) return setUrl(null)
    if (cache.has(id)) return setUrl(cache.get(id) ?? null)
    const controller = new AbortController()
    fetch(`${config.routes.api}/products/${id}?depth=2&select[gallery]=true`, { credentials: 'include', signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((doc) => {
        const image = doc?.gallery?.[0]?.image
        const found = image && typeof image === 'object' ? (image.sizes?.thumb?.url ?? image.url ?? null) : null
        cache.set(id, found)
        setUrl(found)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [id, config.routes.api])

  return url
}
