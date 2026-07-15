import { Button } from "@halaalvest/ui/components/button"
import {
  NativeSelect,
  NativeSelectOption,
} from "@halaalvest/ui/components/native-select"

export function MonthlyRecordYearControl({
  selectedYear,
}: {
  selectedYear: number
}) {
  const currentYear = new Date().getUTCFullYear()
  const startYear = Math.min(selectedYear, currentYear) - 3
  const years = Array.from({ length: 8 }, (_, index) => startYear + index)

  return (
    <form className="flex w-full items-center gap-2">
      <NativeSelect
        name="year"
        defaultValue={String(selectedYear)}
        className="w-full"
      >
        {years.map((year) => (
          <NativeSelectOption key={year} value={String(year)}>
            {year}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Button type="submit" size="sm" variant="outline">
        View
      </Button>
    </form>
  )
}
