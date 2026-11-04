import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'

import { idOf } from '@/utilities/ids'

/** On create, find-or-create the Customer for this phone number within the tenant and link it. */
export const linkCustomer: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create' || data.customer) return data
  const tenant = idOf(data.tenant)
  if (!tenant || !data.phone) return data

  const existing = await req.payload.find({
    collection: 'customers',
    where: { and: [{ tenant: { equals: tenant } }, { phone: { equals: data.phone } }] },
    limit: 1,
    depth: 0,
    req,
  })

  const contact = { firstName: data.firstName, lastName: data.lastName, city: data.city, address: data.address, ...(data.email ? { email: data.email } : {}) }
  if (existing.docs[0]) {
    await req.payload.update({ collection: 'customers', id: existing.docs[0].id, data: contact, req })
    data.customer = existing.docs[0].id
  } else {
    const created = await req.payload.create({ collection: 'customers', data: { ...contact, phone: data.phone, tenant, source: data.source === 'landing-page' ? 'landing-page' : 'store' }, req })
    data.customer = created.id
  }
  return data
}

/** Keeps the customer's order count / lifetime value in sync and bumps promo usage on creation. */
export const refreshCustomerStats: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  const { payload } = req
  const customerId = idOf(doc.customer)
  if (customerId) {
    const orders = await payload.find({
      collection: 'orders',
      where: { and: [{ customer: { equals: customerId } }, { status: { not_in: ['cancelled', 'returned'] } }] },
      limit: 0,
      pagination: false,
      depth: 0,
      select: { total: true, createdAt: true },
      req,
    })
    await payload.update({
      collection: 'customers',
      id: customerId,
      data: {
        ordersCount: orders.docs.length,
        totalSpent: orders.docs.reduce((sum, o) => sum + (o.total ?? 0), 0),
        lastOrderAt: orders.docs.map((o) => o.createdAt).sort().at(-1),
      },
      req,
    })
  }

  const promoId = idOf(doc.promoCode)
  if (operation === 'create' && promoId) {
    const promo = await payload.findByID({ collection: 'promo-codes', id: promoId as string, depth: 0, req })
    await payload.update({ collection: 'promo-codes', id: promoId as string, data: { usageCount: (promo.usageCount ?? 0) + 1 }, req })
  }
  return doc
}
