import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = { title: 'Made Design', robots: { index: false, follow: false } }

/** Minimal shell for the public root. The admin has its own layout under (payload). */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
