"use client"

import { type ReactNode, useEffect, useState } from "react"
import { createPortal } from "react-dom"

interface PortalProps {
  children: ReactNode
}

export function Portal({ children }: PortalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true))

    return () => window.cancelAnimationFrame(frame)
  }, [])

  if (!mounted) return null

  return createPortal(children, document.body)
}
