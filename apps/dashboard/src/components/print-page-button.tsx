"use client"

import { Button } from "@halaalvest/ui/components/button"
import { PrinterIcon } from "lucide-react"

export function PrintPageButton({ className }: { className?: string }) {
  return (
    <Button
      className={className}
      onClick={() => window.print()}
      type="button"
      variant="outline"
    >
      <PrinterIcon data-icon="inline-start" />
      Print
    </Button>
  )
}
