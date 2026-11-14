"use client"

import { BusinessDetails } from "@/components/business/business-details"
import { BusinessForm, ProfitEntryForm } from "@/components/business/business-forms"
import { useBusinessFormContext } from "@/components/business/form-context"
import { ReviewNoBusinessProfitForm } from "@/components/business/review-no-business-profit-form"
import { useBusinessParams } from "@/hooks/use-business-params"

function Notice({ children }: { children: string }) {
  return <p className="text-base text-muted-foreground">{children}</p>
}

/** The body of the business sheet for each `businessType`. */
export function BusinessContent() {
  const { businessId, businessType, profitEntryId } = useBusinessParams()
  const { business, isBusinessError, isBusinessLoading, setup } =
    useBusinessFormContext()
  const isLocked = setup.isLocked

  if (businessType === "create") {
    return <BusinessForm disabled={isLocked} />
  }

  if (businessType === "reviewNone") {
    return setup.canReviewNoProfit ? (
      <ReviewNoBusinessProfitForm />
    ) : (
      <Notice>This step is already done.</Notice>
    )
  }

  if (!businessId) return <Notice>Pick a business from the list.</Notice>
  if (isBusinessLoading) return <Notice>Loading...</Notice>
  if (isBusinessError || !business) {
    return <Notice>This business could not be loaded.</Notice>
  }

  if (businessType === "edit") {
    return <BusinessForm business={business} disabled={isLocked} />
  }

  if (businessType === "profit") {
    return (
      <ProfitEntryForm business={business} disabled={isLocked} setup={setup} />
    )
  }

  if (businessType === "editProfit") {
    const entry = business.profitEntries.find(
      (item) => item.id === profitEntryId
    )

    if (!entry) return <Notice>This profit could not be found.</Notice>
    if (entry.isShared) {
      return <Notice>{"This profit has been shared and can't be changed."}</Notice>
    }
    if (
      entry.sourceType !== "manual" ||
      (entry.status !== "draft" && entry.status !== "pending")
    ) {
      return <Notice>{"Its season is closed, so it can't be changed."}</Notice>
    }

    return (
      <ProfitEntryForm
        business={business}
        disabled={isLocked}
        entry={entry}
        setup={setup}
      />
    )
  }

  return (
    <BusinessDetails
      business={business}
      canRecordProfit={setup.currentProfitSeason.canRecordProfit}
      isLocked={isLocked}
    />
  )
}
