import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import type { MemberShareApplicationRow } from "@halaalvest/db"

export function MemberShareApplicationSheetHeader({
  application,
  mode = "create",
}: {
  application?: MemberShareApplicationRow
  mode?: "create" | "details"
}) {
  const isDetails = mode === "details"

  return (
    <SheetHeader>
      <SheetTitle>
        {isDetails ? "Share request details" : "Request optional shares"}
      </SheetTitle>
      <SheetDescription>
        {isDetails
          ? `${application?.requestedUnits ?? ""} optional share units and the recorded finance decision.`
          : "Request optional share units for finance review."}
      </SheetDescription>
    </SheetHeader>
  )
}
