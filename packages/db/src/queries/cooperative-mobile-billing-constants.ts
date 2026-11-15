export const mobileAccessChargeCode = "system-mobile-app-access"
export const mobileAccessExpenseAccountCode = "5200"
/** Halaalvest bills payable (all platform bill lines). */
export const mobileAccessPayableAccountCode = "2100"
export const platformBillsPayableAccountCode = mobileAccessPayableAccountCode
/** Seat fee charged to members when the cooperative chooses "members pay". */
export const platformSeatFeeChargeCode = "system-platform-seat-fee"
/** Halaalvest platform fees: seat fee and assistant usage. */
export const platformFeesExpenseAccountCode = "5210"
/** Charges that only billing assesses; never edited, imported or applied by hand. */
export const systemBillingChargeCodes = [
  mobileAccessChargeCode,
  platformSeatFeeChargeCode,
]
