const legacyAdminReportKeys = [
  "members",
  "memberStatements",
  "contributions",
  "specialSavings",
  "charges",
  "financing",
  "repayments",
  "paymentReceipts",
  "procurement",
  "foodPurchase",
  "projectFinancing",
  "shares",
  "profit",
  "support",
  "openingBalances",
  "audit",
] as const

const legacyStatementFilename =
  /^[a-z0-9][a-z0-9._-]*-[a-zA-Z0-9._-]+-statement\.csv$/

export function isLegacyPrivateReportFilename(filename: string) {
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) return false
  if (legacyStatementFilename.test(filename)) return true
  return legacyAdminReportKeys.some(
    (key) =>
      filename.endsWith(`-${key}-report.csv`) &&
      filename.length > `-${key}-report.csv`.length
  )
}
