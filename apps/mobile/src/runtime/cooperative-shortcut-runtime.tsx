import { CooperativeShortcutRuntimeProvider } from "@/features/cooperative-shortcuts/public/cooperative-shortcut-runtime"
import type { ReactNode } from "react"

/**
 * Root-shell adapter for launcher cooperative shortcuts. It sits inside auth,
 * personal access, app lock and the runtime gate so a shortcut can only ever
 * resolve through those ordinary controls.
 */
export function CooperativeShortcutRuntime({
  children,
}: {
  children: ReactNode
}) {
  return (
    <CooperativeShortcutRuntimeProvider>
      {children}
    </CooperativeShortcutRuntimeProvider>
  )
}
