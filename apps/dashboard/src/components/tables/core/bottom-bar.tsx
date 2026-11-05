"use client"

import dynamic from "next/dynamic"
import type { ReactNode } from "react"

export interface BottomBarProps {
  selectedCount: number
  onDeselect: () => void
  children: ReactNode
}

// framer-motion only loads once rows are selected; table routes import this
// through the `@/components/tables/core` barrel.
const BottomBarMotion = dynamic(
  () => import("./bottom-bar-motion").then((module) => module.BottomBarMotion),
  { ssr: false }
)

export function BottomBar(props: BottomBarProps) {
  return <BottomBarMotion {...props} />
}
