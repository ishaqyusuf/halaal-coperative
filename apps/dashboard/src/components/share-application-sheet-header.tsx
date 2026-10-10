import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"

export function ShareApplicationSheetHeader({
  mode,
}: {
  mode: "create" | "details" | "review"
}) {
  const isReview = mode === "review"
  const isDetails = mode === "details"

  return (
    <SheetHeader>
      <SheetTitle>
        {isReview
          ? "Review share application"
          : isDetails
            ? "Share application details"
            : "Create share application"}
      </SheetTitle>
      <SheetDescription>
        {isReview
          ? "Review an optional share purchase request and record the finance decision."
          : isDetails
            ? "Review the request values, member note, and recorded finance decision."
            : "Stage an optional share purchase request for finance review."}
      </SheetDescription>
    </SheetHeader>
  )
}
