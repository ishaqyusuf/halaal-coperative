export function formatShareUnitCount(value: number) {
  return `${value} ${value === 1 ? "unit" : "units"}`
}

export function describeOptionalShareUnits(pendingUnits: number) {
  return pendingUnits > 0
    ? `${formatShareUnitCount(pendingUnits)} awaiting review`
    : "No pending requests"
}

const shareDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
})

export function formatShareDate(value: string) {
  return shareDate.format(new Date(value))
}
