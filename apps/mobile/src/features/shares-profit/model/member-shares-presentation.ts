export function formatShareUnitCount(value: number) {
  return `${value} ${value === 1 ? "unit" : "units"}`
}

export function describeOptionalShareUnits(pendingUnits: number) {
  return pendingUnits > 0
    ? `${formatShareUnitCount(pendingUnits)} awaiting review`
    : "No pending requests"
}
