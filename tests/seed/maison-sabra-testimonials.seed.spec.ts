// @vitest-environment node
import config from '@/payload.config'
import { getPayload } from 'payload'
import { it } from 'vitest'

/**
 * Idempotent: adds the three homepage testimonials ("Les mots de nos clientes") to Maison Sabra.
 * An existing testimonial with the same author is left alone, so edits made in the admin survive.
 * The addresses are placeholder Moroccan neighbourhoods, not the customers' real ones: replace them in the admin. A missing address is filled in on existing rows too.
 * Run: `pnpm seed:maison-sabra-testimonials`.
 */
const TESTIMONIALS = [
  {
    author: 'Salma R.',
    address: 'Maârif, Casablanca',
    quote: 'Maison Sabra, c’est bien plus qu’un sac… c’est une œuvre d’art. Dès que je le porte, on me demande d’où il vient. La finition est impeccable, et on sent le travail fait main derrière chaque détail.',
  },
  {
    author: 'Karima',
    address: 'Agdal, Rabat',
    quote: 'J’ai été touchée par l’authenticité des produits. Mon sac Maison Sabra m’accompagne partout, il allie tradition et élégance avec une touche marocaine que j’adore. Je recommande à 100 %.',
  },
  {
    author: '@eddahabitouria',
    address: 'Guéliz, Marrakech',
    quote: 'أحييك مدام بهيجة على ابتكاراتك الرائعة التقيت بك يوم الأحد الماضى كل عروضك كانت تعبر عن اللمسة المغربية مزيد من التألق وبالطبع كنت محظوظة باقتناء قطعتين أفتخر بهما',
  },
]

it('seeds Maison Sabra testimonials', async () => {
  const payload = await getPayload({ config: await config })
  const tenant = (await payload.find({ collection: 'tenants', where: { slug: { equals: 'maisonsabra' } }, limit: 1, depth: 0 })).docs[0]
  if (!tenant) throw new Error('Maison Sabra tenant not found: import the store data first')

  let added = 0
  for (const [i, t] of TESTIMONIALS.entries()) {
    const existing = await payload.find({ collection: 'testimonials', where: { and: [{ tenant: { equals: tenant.id } }, { author: { equals: t.author } }] }, limit: 1, depth: 0 })
    if (existing.docs.length) {
      const [row] = existing.docs
      if (!row.address) await payload.update({ collection: 'testimonials', id: row.id, data: { address: t.address } })
      continue
    }
    await payload.create({ collection: 'testimonials', data: { ...t, tenant: tenant.id, rating: 5, featured: true, active: true, sortOrder: i } as never })
    added++
  }
  console.log(`Testimonials added: ${added} of ${TESTIMONIALS.length}`)
}, 120_000)
