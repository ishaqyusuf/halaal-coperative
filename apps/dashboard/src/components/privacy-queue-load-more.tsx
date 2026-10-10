import { Button } from "@halaalvest/ui/components/button"

export function PrivacyQueueLoadMore({
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  onLoadMore,
}: {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isFetchNextPageError: boolean
  onLoadMore: () => void
}) {
  return (
    <>
      {hasNextPage ? (
        <Button
          disabled={isFetchingNextPage}
          onClick={onLoadMore}
          variant="outline"
        >
          {isFetchingNextPage ? "Loading…" : "Load more requests"}
        </Button>
      ) : null}
      {isFetchNextPageError ? (
        <p role="alert" className="text-sm text-destructive">
          More requests could not be loaded. Try again.
        </p>
      ) : null}
    </>
  )
}
