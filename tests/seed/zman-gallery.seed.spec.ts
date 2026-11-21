// @vitest-environment node
import fs from 'fs'
import path from 'path'
import config from '@/payload.config'
import { getPayload } from 'payload'
import { it } from 'vitest'

/** Uploads the Z'man landing-page photos and appends them to each zman-* product's gallery. Idempotent. */
const SRC = '/Users/oussama_alya222/Documents/side/maisonsabra/public/zmancollection/lp/assets/products'
const ALTS = JSON.parse(fs.readFileSync('/private/tmp/claude-501/-Users-oussama-alya222-Documents-side-maisonsabra/8c77d836-3244-4e09-9bdc-a43a58bfbd0b/scratchpad/alts.json', 'utf8')) as Record<string, string>

it('uploads zman gallery photos', async () => {
  const payload = await getPayload({ config: await config })
  const tenant = (await payload.find({ collection: 'tenants', where: { slug: { equals: 'maisonsabra' } }, limit: 1, depth: 0 })).docs[0]
  if (!tenant) throw new Error('tenant not found')
  const kinds = ['front', 'lifestyle', 'front', 'detail', 'interior']
  for (const id of ['rouge', 'vert', 'violet', 'beige', 'multicolore']) {
    const product = (await payload.find({ collection: 'products', where: { and: [{ tenant: { equals: tenant.id } }, { slug: { equals: 'zman-' + id } }] }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
    if (!product) { console.log('missing product', id); continue }
    const gallery = [...(product.gallery ?? [])] as { image: unknown; alt?: string | null; kind?: string }[]
    for (let n = 1; n <= 5; n++) {
      const file = id + '-' + n + '.webp'
      const alt = ALTS[id + '-' + n] ?? 'Sac Z’man ' + id
      const media = (await payload.find({ collection: 'media', where: { and: [{ tenant: { equals: tenant.id } }, { alt: { equals: alt } }] }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
        ?? (await payload.create({ collection: 'media', data: { alt, tenant: tenant.id } as never, filePath: path.join(SRC, file), overrideAccess: true }))
      const already = gallery.some((g) => (typeof g.image === 'object' && g.image ? (g.image as { id: string }).id : g.image) === media.id)
      if (!already) gallery.push({ image: media.id, alt, kind: kinds[n - 1] })
    }
    await payload.update({ collection: 'products', id: product.id, data: { gallery } as never, overrideAccess: true })
    console.log(id, 'gallery size', gallery.length)
  }
}, 600_000)
