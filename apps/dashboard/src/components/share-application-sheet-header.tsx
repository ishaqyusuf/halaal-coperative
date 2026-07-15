import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"

export function ShareApplicationSheetHeader({
  mode,
}: {
  mode: "create" | "review"
}) {
  const isReview = mode === "review"

  return (
    <SheetHeader>
      <SheetTitle>
        {isReview ? "Review share application" : "Create share application"}
      </SheetTitle>
      <SheetDescription>
        {isReview
          ? "Review an optional share purchase request and record the finance decision."
          : "Stage an optional share purchase request for finance review."}
      </SheetDescription>
    </SheetHeader>
  )
}
