import { Button } from "@halaalvest/ui/components/button"
import { Skeleton } from "@halaalvest/ui/components/skeleton"

export function MobileAccessLoading({ label }: { label: string }) {
  return (
    <div role="status" className="space-y-3 py-4">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-5 w-72 max-w-full" />
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
    <div className="space-y-3 py-4" role="alert">
      <p className="text-base">{message}</p>
      <Button className="h-11" type="button" variant="outline" onClick={retry}>
        Try again
      </Button>
    </div>
  )
}
