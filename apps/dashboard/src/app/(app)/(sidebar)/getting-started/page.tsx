import type { Metadata } from "next"
import type { SearchParams } from "nuqs"
import { GettingStartedPageContent } from "@/lib/getting-started/getting-started-page-content"

export const metadata: Metadata = {
  title: "Getting started | Halaalvest",
}

export default function GettingStartedPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  return <GettingStartedPageContent searchParams={searchParams} />
}
