'use client'
import { Link, useNav } from '@payloadcms/ui'
import {
  BookOpen, Boxes, Building2, ChevronDown, FolderClosed, Images, LayoutDashboard, LayoutTemplate, type LucideIcon,
  PanelLeftClose, PanelLeftOpen, Package, Percent, Quote, Search, ShoppingCart, SlidersHorizontal, Star, Store, Tags, Ticket,
  Truck, UserCog, Users, X,
} from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation.js'
import { createPortal } from 'react-dom'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { OPEN_PALETTE_EVENT } from './HeaderSearch'
import type { IconName, NavLinkItem, NavSectionModel } from './navModel'

const ICONS: Record<IconName, LucideIcon> = {
  'layout-dashboard': LayoutDashboard, package: Package, tags: Tags, boxes: Boxes, 'shopping-cart': ShoppingCart, users: Users,
  ticket: Ticket, percent: Percent, star: Star, quote: Quote, 'book-open': BookOpen, 'layout-template': LayoutTemplate, images: Images,
  store: Store, truck: Truck, building: Building2, 'user-cog': UserCog, sliders: SlidersHorizontal, folder: FolderClosed, shield: UserCog,
}

type Brand = { name: string; caption: string; logo: string | null; logoDark: string | null; kind: 'tenant' | 'platform' }
type Props = {
  brand: Brand
  overview: { label: string; href: string }
  sections: NavSectionModel[]
  switcher: React.ReactNode
  logout: React.ReactNode
  userLabel: string
}

const COLLAPSE_KEY = 'ds-nav-collapsed'
const GROUPS_KEY = 'ds-nav-closed-groups'
const read = (key: string) => { try { return window.localStorage.getItem(key) } catch { return null } }
const write = (key: string, value: string) => { try { window.localStorage.setItem(key, value) } catch { /* private mode: state just doesn't persist */ } }

export const Sidebar: React.FC<Props> = ({ brand, overview, sections, switcher, logout }) => {
  const { hydrated, navOpen, navRef, setNavOpen, shouldAnimate } = useNav()
  const pathname = usePathname()
  const search = useSearchParams()?.toString() ?? ''
  const [collapsed, setCollapsed] = useState(false)
  const [closed, setClosed] = useState<string[]>([])
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    setCollapsed(read(COLLAPSE_KEY) === '1')
    try { setClosed(JSON.parse(read(GROUPS_KEY) ?? '[]')) } catch { setClosed([]) }
  }, [])
  useEffect(() => { document.documentElement.toggleAttribute('data-nav-collapsed', collapsed) }, [collapsed])

  const toggleCollapsed = () => setCollapsed((c) => { write(COLLAPSE_KEY, c ? '0' : '1'); return !c })
  const toggleGroup = (key: string) => setClosed((c) => { const next = c.includes(key) ? c.filter((k) => k !== key) : [...c, key]; write(GROUPS_KEY, JSON.stringify(next)); return next })

  const isActive = useCallback((item: NavLinkItem) => {
    const path = item.href.split('?')[0]
    const onPath = pathname === path || pathname.startsWith(`${path}/`)
    if (!onPath) return false
    const decoded = decodeURIComponent(search)
    if (item.queryMatch) return pathname === path && decoded.includes(item.queryMatch)
    if (item.queryExclude) return !(pathname === path && decoded.includes(item.queryExclude))
    return true
  }, [pathname, search])
  const overviewActive = pathname === overview.href

  // Cmd/Ctrl+K, or the search field in the top bar, opens the quick-jump palette.
  useEffect(() => {
    const open = () => setPaletteOpen(true)
    window.addEventListener(OPEN_PALETTE_EVENT, open)
    return () => window.removeEventListener(OPEN_PALETTE_EVENT, open)
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const asideClass = ['nav', 'ds-nav', navOpen && 'nav--nav-open', shouldAnimate && 'nav--nav-animate', hydrated && 'nav--nav-hydrated'].filter(Boolean).join(' ')

  return (
    <aside className={asideClass} inert={!navOpen ? true : undefined} data-collapsed={collapsed ? '' : undefined}>
      <div className="nav__scroll ds-side" ref={navRef}>
        <div className="ds-side__brand">
          <BrandMark brand={brand} />
          <div className="ds-side__brand-text">
            <span className="ds-side__name">{brand.name}</span>
            <span className="ds-side__caption">{brand.caption}</span>
          </div>
          <button type="button" className="ds-icon-btn ds-side__close" aria-label="Close navigation" onClick={() => setNavOpen(false)}><X size={18} /></button>
        </div>

        <div className="ds-side__switcher">{switcher}</div>

        <nav className="ds-side__nav" aria-label="Main">
          <NavLink item={{ key: 'overview', label: overview.label, href: overview.href, icon: 'layout-dashboard' }} active={overviewActive} />
          {sections.map((section) => {
            const isClosed = closed.includes(section.key) && !section.items.some(isActive)
            const id = `ds-group-${section.key}`
            return (
              <div className="ds-group" key={section.key} data-closed={isClosed ? '' : undefined}>
                <button type="button" className="ds-group__toggle" aria-expanded={!isClosed} aria-controls={id} onClick={() => toggleGroup(section.key)}>
                  <span>{section.label}</span>
                  <ChevronDown size={14} aria-hidden />
                </button>
                <div className="ds-group__items" id={id} hidden={isClosed}>
                  {section.items.map((item) => <NavLink key={item.key} item={item} active={isActive(item)} />)}
                </div>
              </div>
            )
          })}
        </nav>

        <div className="ds-side__foot">
          <div className="ds-side__logout">{logout}</div>
          <button type="button" className="ds-icon-btn ds-side__collapse" onClick={toggleCollapsed} aria-pressed={collapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
      </div>
      {paletteOpen && <Palette sections={sections} overview={overview} onClose={() => setPaletteOpen(false)} />}
    </aside>
  )
}

const NavLink: React.FC<{ item: NavLinkItem; active: boolean }> = ({ item, active }) => {
  const Icon = ICONS[item.icon]
  return (
    <Link href={item.href} className="ds-link" aria-current={active ? 'page' : undefined} data-active={active ? '' : undefined} title={item.label} prefetch={false}>
      <Icon size={17} strokeWidth={1.75} aria-hidden />
      <span className="ds-side__label">{item.label}</span>
    </Link>
  )
}

const BrandMark: React.FC<{ brand: Brand }> = ({ brand }) => {
  if (brand.logo) {
    return (
      <span className={`ds-mark ds-mark--logo${brand.logoDark ? ' ds-mark--has-dark' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ds-mark__light" src={brand.logo} alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {brand.logoDark && <img className="ds-mark__dark" src={brand.logoDark} alt="" />}
      </span>
    )
  }
  return <span className="ds-mark" aria-hidden>{brand.name.trim().charAt(0).toUpperCase() || '·'}</span>
}

/** Keyboard "jump to" over the links the user can already see. Navigation only: no data is fetched. */
const Palette: React.FC<{ sections: NavSectionModel[]; overview: { label: string; href: string }; onClose: () => void }> = ({ sections, overview, onClose }) => {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const all = useMemo(() => [{ key: 'overview', label: overview.label, href: overview.href, group: 'Dashboard' }, ...sections.flatMap((s) => s.items.map((i) => ({ key: i.key, label: i.label, href: i.href, group: s.label })))], [sections, overview])
  const results = useMemo(() => all.filter((r) => `${r.label} ${r.group}`.toLowerCase().includes(query.trim().toLowerCase())), [all, query])
  useEffect(() => { input.current?.focus() }, [])
  useEffect(() => { setIndex(0) }, [query])

  const router = useRouter()
  const go = (href: string) => { onClose(); router.push(href) }
  return createPortal(
    <div className="ds-palette" role="dialog" aria-modal="true" aria-label="Jump to" onKeyDown={(e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && results[index]) go(results[index].href)
    }}>
      <button type="button" className="ds-palette__scrim" aria-label="Close" onClick={onClose} tabIndex={-1} />
      <div className="ds-palette__panel">
        <div className="ds-palette__field"><Search size={16} aria-hidden /><input ref={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Jump to a section…" aria-label="Jump to a section" role="combobox" aria-expanded="true" aria-controls="ds-palette-list" /></div>
        <ul id="ds-palette-list" role="listbox" className="ds-palette__list">
          {results.length === 0 && <li className="ds-palette__empty">No match</li>}
          {results.map((r, i) => (
            <li key={r.key} role="option" aria-selected={i === index} data-active={i === index ? '' : undefined} onMouseEnter={() => setIndex(i)} onClick={() => go(r.href)}>
              <span>{r.label}</span><small>{r.group}</small>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  )
}
