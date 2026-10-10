import { AppLockGate } from "@/features/app-lock/components/app-lock-gate"
import { AppLockProvider } from "@/features/app-lock/hooks/use-app-lock"
import type { ReactNode } from "react"

export function AppLockRuntime({ children }: { children: ReactNode }) {
  return (
    <AppLockProvider>
      {children}
      <AppLockGate />
    </AppLockProvider>
  )
}
