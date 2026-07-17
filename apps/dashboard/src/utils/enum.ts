export function getEnumValue<TValue extends string>(
  value: string | null | undefined,
  validValues: readonly TValue[]
): TValue | undefined {
  return validValues.includes(value as TValue) ? (value as TValue) : undefined
}
