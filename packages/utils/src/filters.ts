export type PageFilterOption = {
  label: string
  subLabel?: string
  value: string
}

export type PageFilterData<TValue = string> = {
  icon?: string
  label?: string
  options?: PageFilterOption[]
  type: "checkbox" | "date" | "date-range" | "input"
  value: TValue
}

function normalizeOptions(options: Array<PageFilterOption | string>): PageFilterOption[] {
  return options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  )
}

export function inputFilter<TValue extends string>(
  value: TValue,
  label = "Search",
): PageFilterData<TValue> {
  return {
    label,
    type: "input",
    value,
  }
}

export function optionFilter<TValue extends string>(
  value: TValue,
  label: string,
  options: Array<PageFilterOption | string>,
): PageFilterData<TValue> {
  return {
    label,
    options: normalizeOptions(options),
    type: "checkbox",
    value,
  }
}

export function dateFilter<TValue extends string>(
  value: TValue,
  label: string,
): PageFilterData<TValue> {
  return {
    label,
    type: "date",
    value,
  }
}

export function dateRangeFilter<TValue extends string>(
  value: TValue,
  label: string,
): PageFilterData<TValue> {
  return {
    label,
    type: "date-range",
    value,
  }
}
