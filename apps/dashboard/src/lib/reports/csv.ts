export type CsvCell =
  | boolean
  | null
  | number
  | string
  | undefined
  | { toString(): string }

function escapeCsvCell(value: CsvCell) {
  const stringValue = value == null ? "" : String(value)
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

export function toCsvLine(row: CsvCell[]) {
  return row.map(escapeCsvCell).join(",")
}

export function toCsv(headers: string[], rows: CsvCell[][]) {
  return [toCsvLine(headers), ...rows.map(toCsvLine)].join("\n")
}

/**
 * The same text as `toCsv`, produced batch by batch so a download never holds
 * every row in memory. The first batch is read before the stream starts, so a
 * failing read still fails the request instead of a half-written file.
 */
export async function toCsvStream(
  headers: string[],
  batches: AsyncIterable<CsvCell[][]>,
  /** Lines written before the header row, such as which date a file uses. */
  preamble: CsvCell[][] = []
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder()
  const iterator = batches[Symbol.asyncIterator]()
  let pending: IteratorResult<CsvCell[][]> | null = await iterator.next()
  let started = false

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!started) {
        started = true
        controller.enqueue(
          encoder.encode(
            [...preamble, headers].map((line) => toCsvLine(line)).join("\n")
          )
        )
      }

      try {
        // A stream only pulls again after something is enqueued, so skip
        // empty batches here instead of returning with nothing.
        for (;;) {
          const next = pending ?? (await iterator.next())
          pending = null

          if (next.done) {
            controller.close()
            return
          }

          if (next.value.length > 0) {
            controller.enqueue(
              encoder.encode(
                next.value.map((row) => `\n${toCsvLine(row)}`).join("")
              )
            )
            return
          }
        }
      } catch (error) {
        controller.error(error)
      }
    },
    async cancel() {
      await iterator.return?.()
    },
  })
}

/**
 * Reads rows `batchSize` at a time by keyset cursor, up to `maxRows` in all.
 * `readBatch` returns one batch and the cursor for the next (none at the end).
 */
export async function* readCursorBatches<T>(
  readBatch: (input: {
    cursor: string | undefined
    limit: number
  }) => Promise<{ nextCursor: string | null | undefined; rows: T[] }>,
  options: { batchSize: number; maxRows: number }
): AsyncGenerator<T[]> {
  let cursor: string | undefined
  let remaining = options.maxRows

  while (remaining > 0) {
    const limit = Math.min(options.batchSize, remaining)
    const { nextCursor, rows } = await readBatch({ cursor, limit })

    if (rows.length > 0) yield rows
    remaining -= rows.length
    if (!nextCursor || rows.length < limit) return
    cursor = nextCursor
  }
}

/** Next cursor for id-cursor reads: the last row's id when the batch was full. */
export function lastIdCursor<T extends { id: string }>(
  rows: T[],
  limit: number
) {
  return rows.length === limit ? rows.at(-1)?.id : undefined
}

export type ReportDateFilters = {
  from?: string
  fromDate?: Date
  to?: string
  toDate?: Date
}
