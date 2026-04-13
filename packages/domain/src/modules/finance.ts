export function calculateBorrowingCapacity(totalSavings: number, multiple = 2) {
  return totalSavings * multiple
}

export function calculateAvailablePool(input: {
  totalContributions: number
  committedFunds: number
  reserveBuffer: number
}) {
  return Math.max(0, input.totalContributions - input.committedFunds - input.reserveBuffer)
}
