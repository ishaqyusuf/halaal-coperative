export function ProcurementEmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center border-y border-border px-4 text-center md:border-y-0">
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-medium">
            {filtered ? "No matching requests" : "No procurement requests"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {filtered
              ? "Try another search or clear the current filters."
              : "Procurement requests will appear here after they are submitted."}
          </p>
        </div>
      </div>
    </div>
  )
}
