'use client'
import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'

const DELAY_MS = 1500

/** The root has no public site: show a short loading state, then continue to the admin. */
export default function Home() {
  const router = useRouter()
  useEffect(() => {
    const timer = window.setTimeout(() => router.replace('/admin'), DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [router])

  return (
    <main className="boot" role="status" aria-live="polite">
      <noscript>
        <meta httpEquiv="refresh" content="2;url=/admin" />
      </noscript>
      <span className="boot__spinner" aria-hidden />
      <p className="boot__text">Taking you to the dashboard…</p>
      <a className="boot__link" href="/admin">Go now</a>
      <style>{`
        .boot{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;
          font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;background:#fafafa;color:#111}
        .boot__spinner{width:28px;height:28px;border-radius:50%;border:2px solid #d8d8dc;border-top-color:#111;animation:boot-spin .8s linear infinite}
        .boot__text{margin:0;font-size:14px;color:#555}
        .boot__link{font-size:13px;color:inherit;text-underline-offset:3px}
        @keyframes boot-spin{to{transform:rotate(360deg)}}
        @media (prefers-color-scheme:dark){.boot{background:#111;color:#f4f4f5}.boot__spinner{border-color:#333;border-top-color:#f4f4f5}.boot__text{color:#a1a1aa}}
        @media (prefers-reduced-motion:reduce){.boot__spinner{animation-duration:2.4s}}
      `}</style>
    </main>
  )
}
