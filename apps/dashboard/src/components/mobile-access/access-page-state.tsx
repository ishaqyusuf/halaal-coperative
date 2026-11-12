import { Button } from "@halaalvest/ui/components/button"
import { Skeleton } from "@halaalvest/ui/components/skeleton"

export function MobileAccessLoading({ label }: { label: string }) {
  return (
    <div role="status" className="space-y-3 py-4">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-5 w-44" />
      <Skeleton className="h-4 w-64 max-w-full" />
    </div>
  )
}

export function MobileAccessLoadError({
  message,
  retry,
}: {
  message: string
  retry: () => void
}) {
  return (
    <div className="space-y-3 border-y border-border py-4" role="alert">
      <p className="text-sm">{message}</p>
      <Button type="button" variant="outline" onClick={retry}>
        Retry
      </Button>
    </div>
  )
}
