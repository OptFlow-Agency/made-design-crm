'use client'
import { Search } from 'lucide-react'
import React from 'react'

export const OPEN_PALETTE_EVENT = 'ds:open-palette'

/** Search field in the top bar (`admin.components.actions`). It opens the sidebar's jump-to palette, which owns the nav data. */
const HeaderSearch: React.FC = () => (
  <button type="button" className="ds-hsearch" onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))} aria-label="Search the admin (Ctrl K)">
    <Search size={15} aria-hidden />
    <span>Search…</span>
    <kbd>⌘K</kbd>
  </button>
)
export default HeaderSearch
