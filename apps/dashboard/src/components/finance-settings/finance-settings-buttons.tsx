"use client"

import { Button } from "@halaalvest/ui/components/button"
import { ChevronRight } from "lucide-react"
import { useChargeParams } from "@/hooks/use-charge-params"
import { useShareParams } from "@/hooks/use-share-params"

/** Opens the share model sheet. */
export function OpenShareModelButton({ label = "Change" }: { label?: string }) {
  const { setParams } = useShareParams()

  return (
    <Button
      size="touch"
      className="text-base"
      onClick={() => setParams({ shareId: null, shareType: "policy" })}
      type="button"
      variant="outline"
    >
      {label}
    </Button>
  )
}

/** Opens the "new monthly share amount" sheet. */
export function AddShareAmountButton() {
  const { setParams } = useShareParams()

  return (
    <Button
      size="touch"
      className="text-base"
      onClick={() => setParams({ shareId: null, shareType: "create" })}
      type="button"
    >
      Add an amount
    </Button>
  )
}

/** A dated amount row that opens its edit sheet (or just shows when locked). */
export function ShareAmountRow({
  children,
  id,
  isLocked,
}: {
  children: React.ReactNode
  id: string
  isLocked: boolean
}) {
  const { setParams } = useShareParams()

  if (isLocked) {
    return (
      <div className="flex items-center gap-3 px-1 py-4 sm:px-3">
        {children}
      </div>
    )
  }

  return (
    <button
      className="flex min-h-11 w-full items-center gap-3 px-1 py-4 text-left hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3"
      onClick={() => setParams({ shareId: id, shareType: "edit" })}
      type="button"
    >
      {children}
      <ChevronRight
        aria-hidden="true"
        className="size-5 shrink-0 text-muted-foreground"
      />
    </button>
  )
}

/** Opens the "new charge" sheet. */
export function AddChargeButton() {
  const { setParams } = useChargeParams()

  return (
    <Button
      size="touch"
      className="text-base"
      onClick={() =>
        setParams({
          chargeId: null,
          chargeType: "create",
          chargeVersionId: null,
        })
      }
      type="button"
    >
      Add a charge
    </Button>
  )
}

/** A charge row that opens its sheet (amounts by date). */
export function ChargeRowButton({
  children,
  id,
}: {
  children: React.ReactNode
  id: string
}) {
  const { setParams } = useChargeParams()

  return (
    <button
      className="flex min-h-11 w-full items-center gap-3 px-1 py-4 text-left hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:gap-4 sm:px-3"
      onClick={() =>
        setParams({ chargeId: id, chargeType: "edit", chargeVersionId: null })
      }
      type="button"
    >
      {children}
      <ChevronRight
        aria-hidden="true"
        className="size-5 shrink-0 text-muted-foreground"
      />
    </button>
  )
}
