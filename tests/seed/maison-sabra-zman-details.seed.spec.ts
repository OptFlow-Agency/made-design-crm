// @vitest-environment node
import config from '@/payload.config'
import { getPayload } from 'payload'
import { it } from 'vitest'

/**
 * Idempotent: fills the "Details" tab of every Maison Sabra Z'man product whose details are still empty,
 * so the storefront's details accordion has something to show. Products edited in the admin are left alone.
 * PLACEHOLDER VALUES: replace them in the admin with the real measurements, weight, lining and care.
 * Run: `pnpm exec cross-env NODE_OPTIONS=--no-deprecation vitest run tests/seed/maison-sabra-zman-details.seed.spec.ts`.
 */
const DETAILS = {
  materials: 'Velours brodé, tissu doré, fermoir en laiton et chaîne dorée. Doublure en coton.',
  width: 25,
  height: 18,
  depth: 8,
  strapDrop: 50,
  weight: 400,
  care: 'Dépoussiérer avec une brosse douce. Éviter l’eau et le soleil direct.\nRanger dans sa pochette Maison Sabra.',
}

it('seeds Z’man product details', async () => {
  const payload = await getPayload({ config: await config })
  const tenant = (await payload.find({ collection: 'tenants', where: { slug: { equals: 'maisonsabra' } }, limit: 1, depth: 0 })).docs[0]
  if (!tenant) throw new Error('Maison Sabra tenant not found: import the store data first')

  const products = await payload.find({
    collection: 'products',
    where: { and: [{ tenant: { equals: tenant.id } }, { slug: { like: 'zman-' } }] },
    limit: 1000,
    depth: 0,
    pagination: false,
  })

  let updated = 0
  for (const product of products.docs) {
    const d = product.details ?? {}
    if (d.materials || d.width || d.height || d.depth || d.strapDrop || d.weight || d.care) continue
    await payload.update({ collection: 'products', id: product.id, data: { details: { ...d, ...DETAILS } } as never })
    console.log(`Details added to ${product.slug}`)
    updated++
  }
  console.log(`Details added to ${updated} of ${products.docs.length} Z’man products`)
}, 120_000)
