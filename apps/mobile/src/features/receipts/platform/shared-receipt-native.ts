import { requireOptionalNativeModule } from "expo"
import { File } from "expo-file-system"
import type { ReceiptProofFile } from "../api/receipt-proof-api"

export type SharedReceipt = ReceiptProofFile & {
  id: string
  expiresAt: number
}

type ReceiptShareModule = {
  addListener: (
    event: "onReceiptShared",
    listener: () => void
  ) => { remove: () => void }
  take: () => Promise<SharedReceipt | null>
}

export const receiptShareNative =
  requireOptionalNativeModule<ReceiptShareModule>("ReceiptShare")

export function deleteSharedReceipt(receipt: SharedReceipt) {
  try {
    const file = new File(receipt.uri)
    if (file.exists) file.delete()
  } catch {
    // Native intake prunes expired files if immediate removal fails.
  }
}
