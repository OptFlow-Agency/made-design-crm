import type { CollectionSlug, Field, TextFieldSingleValidation } from 'payload'

import { slugify } from '@/utilities/slugify'

const tenantIdOf = (tenant: unknown): number | string | undefined => {
  if (tenant && typeof tenant === 'object' && 'id' in tenant) {
    return (tenant as { id: number | string }).id
  }
  return (tenant as number | string | undefined) ?? undefined
}

/**
 * The multi-tenant plugin does not scope `unique: true` per tenant, so two
 * stores could never both own a `/produit/azerwal` slug. This validator enforces
 * uniqueness inside one tenant instead.
 */
export const uniquePerTenant =
  (collection: CollectionSlug, fieldName: string): TextFieldSingleValidation =>
  async (value, { req, id, data }) => {
    if (!value) return true
    const tenant = tenantIdOf((data as { tenant?: unknown } | undefined)?.tenant)
    if (!tenant) return true

    const clash = await req.payload.find({
      collection,
      depth: 0,
      limit: 1,
      pagination: false,
      req,
      where: {
        and: [
          { tenant: { equals: tenant } },
          { [fieldName]: { equals: value } },
          ...(id ? [{ id: { not_equals: id } }] : []),
        ],
      },
    })

    return clash.docs.length ? `"${value}" is already used by another ${collection} entry in this store` : true
  }

/** URL slug, derived from `sourceField` when left empty, unique within a tenant. */
export const tenantSlugField = (collection: CollectionSlug, sourceField = 'title'): Field => ({
  name: 'slug',
  type: 'text',
  index: true,
  required: true,
  admin: { position: 'sidebar' },
  hooks: {
    beforeValidate: [
      ({ value, data }) => {
        const source = value || (data as Record<string, unknown> | undefined)?.[sourceField]
        return typeof source === 'string' ? slugify(source) : value
      },
    ],
  },
  validate: uniquePerTenant(collection, 'slug'),
})
