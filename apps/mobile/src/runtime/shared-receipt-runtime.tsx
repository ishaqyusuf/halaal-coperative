import { SharedReceiptProvider } from "@/features/receipts/public/shared-receipt-runtime"
import type { ReactNode } from "react"

export function SharedReceiptRuntime({ children }: { children: ReactNode }) {
  return <SharedReceiptProvider>{children}</SharedReceiptProvider>
}
