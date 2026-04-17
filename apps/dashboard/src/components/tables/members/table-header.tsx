import { Badge } from "@halaal-vest/ui/components/badge"

export function MembersDataTableHeader({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Registry
        </p>
        <h2 className="mt-1 text-lg font-medium tracking-tight text-foreground">
          Member records
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Search, filter, and act on member status, KYC, and cooperative identity from one denser registry surface.
        </p>
      </div>
      <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px]">
        {count} rows
      </Badge>
    </div>
  )
}
