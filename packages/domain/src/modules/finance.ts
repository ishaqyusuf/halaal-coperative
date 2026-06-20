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

export type ShareLedgerAmount = {
  amount: number
  effectiveDate: Date | string
  memberId: string
}

export type MemberShareBalance = {
  memberId: string
  shareBalance: number
}

export type ShareProfitAllocationInput = {
  memberId: string
  shareBalance: number
}

export type ShareProfitAllocationResult = {
  allocatedProfitAmount: number
  memberId: string
  shareBalance: number
  sharePercentage: number
}

function toTime(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime()
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function resolveMemberShareBalance(
  entries: ShareLedgerAmount[],
  memberId: string,
  asOfDate: Date | string,
) {
  const asOfTime = toTime(asOfDate)

  return roundCurrency(
    entries.reduce((total, entry) => {
      if (entry.memberId !== memberId || toTime(entry.effectiveDate) > asOfTime) {
        return total
      }

      return total + entry.amount
    }, 0),
  )
}

export function resolveShareBalancesAtDate(
  entries: ShareLedgerAmount[],
  asOfDate: Date | string,
): MemberShareBalance[] {
  const balances = new Map<string, number>()
  const asOfTime = toTime(asOfDate)

  for (const entry of entries) {
    if (toTime(entry.effectiveDate) > asOfTime) continue
    balances.set(entry.memberId, (balances.get(entry.memberId) ?? 0) + entry.amount)
  }

  return Array.from(balances.entries())
    .map(([memberId, shareBalance]) => ({
      memberId,
      shareBalance: roundCurrency(shareBalance),
    }))
    .filter((balance) => balance.shareBalance > 0)
    .sort((a, b) => a.memberId.localeCompare(b.memberId))
}

export function calculateSharePercentage(memberShareBalance: number, totalShareBalance: number) {
  if (memberShareBalance <= 0 || totalShareBalance <= 0) {
    return 0
  }

  return memberShareBalance / totalShareBalance
}

export function allocateBusinessProfitByShare(input: {
  balances: ShareProfitAllocationInput[]
  profitAmount: number
}): ShareProfitAllocationResult[] {
  const eligibleBalances = input.balances.filter((balance) => balance.shareBalance > 0)
  const totalShareBalance = eligibleBalances.reduce((total, balance) => total + balance.shareBalance, 0)

  if (input.profitAmount <= 0 || totalShareBalance <= 0) {
    return []
  }

  const allocations = eligibleBalances.map((balance) => {
    const sharePercentage = calculateSharePercentage(balance.shareBalance, totalShareBalance)

    return {
      allocatedProfitAmount: roundCurrency(input.profitAmount * sharePercentage),
      memberId: balance.memberId,
      shareBalance: roundCurrency(balance.shareBalance),
      sharePercentage,
    }
  })

  const allocatedTotal = allocations.reduce(
    (total, allocation) => total + allocation.allocatedProfitAmount,
    0,
  )
  const remainder = roundCurrency(input.profitAmount - allocatedTotal)

  if (allocations.length > 0 && remainder !== 0) {
    allocations.sort(
      (a, b) => b.shareBalance - a.shareBalance || a.memberId.localeCompare(b.memberId),
    )
    const firstAllocation = allocations[0]
    if (!firstAllocation) return allocations

    allocations[0] = {
      ...firstAllocation,
      allocatedProfitAmount: roundCurrency(firstAllocation.allocatedProfitAmount + remainder),
    }
  }

  return allocations.sort((a, b) => a.memberId.localeCompare(b.memberId))
}
