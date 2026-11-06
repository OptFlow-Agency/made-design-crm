'use client'
import React, { useEffect, useState } from 'react'

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const full = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Server render shows the UTC day; once mounted it switches to the viewer's own time zone. */
export const LocalTime: React.FC<{ iso: string }> = ({ iso }) => {
  const date = new Date(iso)
  const [text, setText] = useState(() => day.format(date))
  useEffect(() => { setText(full.format(date)) }, [iso]) // eslint-disable-line react-hooks/exhaustive-deps
  return <time dateTime={iso} title={date.toUTCString()}>{text}</time>
}

/** "Good morning" depends on the viewer's clock, so it's decided in the browser; the server sends a neutral line. */
export const Greeting: React.FC<{ name?: string }> = ({ name }) => {
  const [hello, setHello] = useState('Welcome back')
  useEffect(() => {
    const h = new Date().getHours()
    setHello(h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening')
  }, [])
  return <>{hello}{name ? `, ${name}` : ''}</>
}
