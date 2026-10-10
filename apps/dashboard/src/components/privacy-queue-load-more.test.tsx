import { describe, expect, it } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { PrivacyQueueLoadMore } from "./privacy-queue-load-more"

describe("privacy queue paging control", () => {
  it("offers an accessible way to reach additional requests", () => {
    const html = renderToStaticMarkup(
      <PrivacyQueueLoadMore
        hasNextPage
        isFetchingNextPage={false}
        isFetchNextPageError={false}
        onLoadMore={() => {}}
      />
    )
    expect(html).toContain("Load more requests")
    expect(html).toContain("<button")
  })

  it("shows a retryable page error without hiding the load control", () => {
    const html = renderToStaticMarkup(
      <PrivacyQueueLoadMore
        hasNextPage
        isFetchingNextPage={false}
        isFetchNextPageError
        onLoadMore={() => {}}
      />
    )
    expect(html).toContain("Load more requests")
    expect(html).toContain('role="alert"')
  })
})
