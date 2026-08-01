"use client"

import type { ReactNode } from "react"
import { useMobileViewport } from "@/hooks/use-mobile"

export function ResponsiveDataView({
  desktop,
  fallback = null,
  mobile,
}: {
  desktop: ReactNode
  fallback?: ReactNode
  mobile: ReactNode
}) {
  const isMobile = useMobileViewport()

  if (isMobile === undefined) {
    return fallback
  }

  return isMobile ? mobile : desktop
}
