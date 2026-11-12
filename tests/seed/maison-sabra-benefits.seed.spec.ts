// @vitest-environment node
import config from '@/payload.config'
import { getPayload } from 'payload'
import { it } from 'vitest'

/**
 * Idempotent: gives every Maison Sabra product that has no benefits yet three default ones
 * (shown with an icon on the product page). Products whose benefits were edited in the admin are left alone.
 * Keep the claims true for the whole range (leather + Berber fabric bags, made by artisans in Morocco).
 * Run: `pnpm seed:maison-sabra-benefits`.
 */
const DEFAULT_BENEFITS = [
  { icon: 'hand', title: 'Fait main au Maroc', description: 'Chaque sac est façonné par nos artisans.' },
  { icon: 'leather', title: 'Cuir et tissu berbère', description: 'Des matières nobles, assemblées avec soin.' },
  { icon: 'gift', title: 'Prêt à offrir', description: 'Livré dans son emballage Maison Sabra.' },
]

it('seeds default product benefits', async () => {
  const payload = await getPayload({ config: await config })
  const tenant = (await payload.find({ collection: 'tenants', where: { slug: { equals: 'maisonsabra' } }, limit: 1, depth: 0 })).docs[0]
  if (!tenant) throw new Error('Maison Sabra tenant not found: import the store data first')

  const products = await payload.find({
    collection: 'products',
    where: { tenant: { equals: tenant.id } },
    limit: 1000,
    depth: 0,
    pagination: false,
  })

  let updated = 0
  for (const product of products.docs) {
    if ((product.benefits?.length ?? 0) > 0) continue
    await payload.update({ collection: 'products', id: product.id, data: { benefits: DEFAULT_BENEFITS } as never })
    updated++
  }
  console.log(`Benefits added to ${updated} of ${products.docs.length} products`)
}, 120_000)
