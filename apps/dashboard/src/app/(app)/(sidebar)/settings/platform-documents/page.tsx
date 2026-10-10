import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  getPublishedLegalBundle,
  listOwnLegalAcceptances,
} from "@halaalvest/db"
import { PlatformDocumentsView } from "@/components/platform-documents-view"
import { getDashboardServerContext } from "@/lib/server-context"

export const metadata: Metadata = {
  title: "Platform documents | HalaalVest",
}

export default async function PlatformDocumentsPage() {
  const context = await getDashboardServerContext()
  if (!context.auth.user || !context.auth.membership || !context.tenant)
    notFound()

  const bundle = getPublishedLegalBundle()
  const records = bundle.available
    ? await listOwnLegalAcceptances({
        tenantId: context.tenant.id,
        userId: context.auth.user.id,
      }).catch(() => null)
    : []

  return (
    <PlatformDocumentsView
      key={`${context.auth.user.id}:${context.tenant.id}:${bundle.documents.map((document) => document.contentHash).join(":")}`}
      bundle={bundle}
      records={records}
    />
  )
}
