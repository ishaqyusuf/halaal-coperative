export function calculateOpeningShareCapitalFromUnits({
  shareUnits,
  unitAmount,
}: {
  shareUnits: number
  unitAmount: number
}) {
  if (
    !Number.isFinite(shareUnits) ||
    !Number.isFinite(unitAmount) ||
    shareUnits < 0 ||
    unitAmount < 0
  ) {
    return 0
  }

  return shareUnits * unitAmount
}
