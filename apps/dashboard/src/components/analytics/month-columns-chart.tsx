"use client"

import { formatCurrency } from "@halaalvest/utils"
import { cn } from "@halaalvest/ui/lib/utils"
import { formatCompactNaira } from "@/utils/format"

export type MonthColumnsSeries<K extends string> = {
  key: K
  label: string
  /** Bar colour (light and dark), checked with the dataviz palette validator. */
  barClassName: string
}

export type MonthColumnsRow<K extends string> = {
  key: string
  label: string
  shortLabel: string
} & Record<K, number>

/** A round top for the scale: 13,038,334 -> 14,000,000. */
function getScaleMax(value: number) {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]
  const step = steps.find((item) => item * magnitude >= value) ?? 10
  return step * magnitude
}

/**
 * Two money series per month as side-by-side columns, with a legend, a
 * three-line naira scale and the exact numbers in a table below.
 * Plain HTML, so labels stay large and the page never scrolls sideways.
 */
export function MonthColumnsChart<K extends string>({
  months,
  series,
  title,
}: {
  months: Array<MonthColumnsRow<K>>
  series: [MonthColumnsSeries<K>, MonthColumnsSeries<K>]
  title: string
}) {
  const max = getScaleMax(
    Math.max(0, ...months.flatMap((month) => series.map((s) => month[s.key])))
  )
  const ticks = [max, max / 2, 0]

  return (
    <figure className="grid min-w-0 gap-4">
      <figcaption className="sr-only">{title}</figcaption>
      <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Key">
        {series.map((item) => (
          <li className="flex items-center gap-2 text-base" key={item.key}>
            <span
              aria-hidden="true"
              className={cn("size-4 rounded-sm", item.barClassName)}
            />
            {item.label}
          </li>
        ))}
      </ul>

      <div
        aria-hidden="true"
        className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2"
      >
        <div className="relative h-52 w-11 sm:w-14">
          {ticks.map((tick, index) => (
            <span
              className="absolute right-0 -translate-y-1/2 text-sm text-muted-foreground tabular-nums"
              key={tick}
              style={{ top: `${(index / (ticks.length - 1)) * 100}%` }}
            >
              {formatCompactNaira(tick)}
            </span>
          ))}
        </div>
        <div className="relative h-52 border-b border-border">
          {ticks.slice(0, -1).map((tick, index) => (
            <span
              className="absolute inset-x-0 border-t border-dashed border-border"
              key={tick}
              style={{ top: `${(index / (ticks.length - 1)) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-1 sm:gap-3">
            {months.map((month) => (
              <div
                className="flex h-full min-w-0 flex-1 items-end justify-center gap-0.5"
                key={month.key}
                title={`${month.label}: ${series
                  .map(
                    (item) => `${item.label} ${formatCurrency(month[item.key])}`
                  )
                  .join(", ")}`}
              >
                {series.map((item) => {
                  const value = month[item.key]
                  const height =
                    value > 0 ? Math.max(2, (value / max) * 100) : 0

                  return (
                    <span
                      className={cn(
                        "w-full max-w-7 rounded-t-[4px]",
                        item.barClassName
                      )}
                      key={item.key}
                      style={{ height: `${height}%` }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        <span />
        <div className="flex gap-1 pt-2 sm:gap-3">
          {months.map((month, index) => (
            <span
              className={cn(
                "min-w-0 flex-1 text-center text-sm whitespace-nowrap text-muted-foreground",
                // Phones show every other month when there are many.
                months.length > 6 &&
                  (months.length - 1 - index) % 2 === 1 &&
                  "max-sm:invisible"
              )}
              key={month.key}
            >
              {month.shortLabel}
            </span>
          ))}
        </div>
      </div>

      <details className="group border-y border-border">
        <summary className="flex min-h-11 cursor-pointer items-center text-base font-medium text-primary">
          Show the numbers
        </summary>
        <table className="mb-3 w-full text-base">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2 pr-2 font-normal" scope="col">
                Month
              </th>
              {series.map((item) => (
                <th
                  className="py-2 pl-2 text-right font-normal"
                  key={item.key}
                  scope="col"
                >
                  {item.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[...months].reverse().map((month) => (
              <tr key={month.key}>
                <th className="py-2 pr-2 text-left font-medium" scope="row">
                  {month.label}
                </th>
                {series.map((item) => (
                  <td
                    className="py-2 pl-2 text-right tabular-nums"
                    key={item.key}
                  >
                    {formatCurrency(month[item.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
