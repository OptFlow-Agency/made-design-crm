import type { CollectionBeforeChangeHook } from 'payload'

import { IMPORTING_ORDER } from './prepareOrder'

/** Appends to `statusHistory` whenever the status changes (and once at creation). */
export const trackStatus: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  const status = data.status ?? originalDoc?.status
  if (operation === 'create' || (data.status && data.status !== originalDoc?.status)) {
    data.statusHistory = [
      ...(originalDoc?.statusHistory ?? data.statusHistory ?? []),
      {
        status,
        // Imported orders keep their original timeline rather than the import time.
        changedAt: req.context?.[IMPORTING_ORDER] && data.createdAt ? data.createdAt : new Date().toISOString(),
        changedBy: req.user?.id,
      },
    ]
  }
  return data
}
