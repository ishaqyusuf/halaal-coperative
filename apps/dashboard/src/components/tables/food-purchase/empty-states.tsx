export function FoodPurchaseEmptyState({
  filtered = false,
}: {
  filtered?: boolean
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 border-t px-4 text-center">
      <div>
        <p className="text-sm font-medium text-foreground">
          {filtered
            ? "No matching Foodstuff Purchase applications"
            : "No Foodstuff Purchase applications yet"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {filtered
            ? "Clear the active filters or try a different search."
            : "Member applications will appear here when they are submitted."}
        </p>
      </div>
    </div>
  )
}
