const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
})

/** "November 2026" for the loan month that starts on `periodStart`. */
export function getLoanMonthLabel(periodStart: string | null) {
  return periodStart ? monthFormatter.format(new Date(periodStart)) : "This month"
}
