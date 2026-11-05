"use client"

import dynamic from "next/dynamic"
import { type ReactNode, useState } from "react"

const AnimatePresence = dynamic(
  () => import("framer-motion").then((module) => module.AnimatePresence),
  { ssr: false }
)

// Lazy `AnimatePresence` for selection bottom bars: framer-motion loads the
// first time a bar is shown, then stays mounted so the exit animation runs.
export function BottomBarPresence({ children }: { children?: ReactNode }) {
  const [hasShown, setHasShown] = useState(false)

  if (children && !hasShown) {
    setHasShown(true)
  }

  if (!hasShown) return null

  return <AnimatePresence>{children}</AnimatePresence>
}
