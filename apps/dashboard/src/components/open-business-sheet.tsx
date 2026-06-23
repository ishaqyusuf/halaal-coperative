"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@halaalvest/ui/components/button"
import { ShareBusinessForm } from "@/components/forms/tenant-finance-forms"

type DividendPeriodOption = {
  id: string
  label: string
}

export function OpenBusinessSheet({
  disabled,
  dividendPeriods,
  financeStartDate,
}: {
  disabled: boolean
  dividendPeriods: DividendPeriodOption[]
  financeStartDate?: string | null
}) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  const sheet = isOpen ? (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/10 text-xs/relaxed supports-backdrop-filter:backdrop-blur-xs"
      onClick={() => setIsOpen(false)}
      role="dialog"
    >
      <div
        className="fixed top-0 right-0 bottom-0 flex w-full flex-col overflow-y-auto border-l bg-popover bg-clip-padding text-popover-foreground shadow-lg sm:w-3/4 sm:max-w-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-0.5 p-4">
          <h2 className="font-heading text-sm font-medium text-foreground">
            Record business
          </h2>
          <p className="text-xs/relaxed text-muted-foreground">
            Historical business and profit entries are migration inputs used for
            member dividend and share profit computation.
          </p>
        </div>

        <div className="px-6">
          <ShareBusinessForm
            dividendPeriods={dividendPeriods}
            financeStartDate={financeStartDate}
            onSuccess={() => setIsOpen(false)}
          />
        </div>

        <Button
          aria-label="Close"
          className="absolute top-3 right-3"
          onClick={() => setIsOpen(false)}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
        </Button>
      </div>
    </div>
  ) : null

  return (
    <div>
      <Button
        aria-label="Record business"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        size="icon"
        type="button"
        variant="outline"
      >
        <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
      </Button>

      {typeof document !== "undefined" && sheet
        ? createPortal(sheet, document.body)
        : null}
    </div>
  )
}
