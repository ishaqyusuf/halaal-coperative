import { describe, expect, test } from "bun:test"
import {
  type CsvCell,
  lastIdCursor,
  readCursorBatches,
  toCsv,
  toCsvStream,
} from "./csv"

async function* batchesOf(batches: CsvCell[][][]) {
  for (const batch of batches) yield batch
}

describe("streamed CSV exports", () => {
  test("streams the same text as toCsv, batch by batch", async () => {
    const headers = ["When", "Member", "Notes"]
    const batches: CsvCell[][][] = [
      [
        ["2026-11-01", "Aisha Bello", 'said "yes", then left'],
        ["2026-11-02", "Musa, Ibrahim", null],
      ],
      [],
      [["2026-11-03", "Zainab", "line\nbreak"]],
    ]

    const stream = await toCsvStream(headers, batchesOf(batches))
    const text = await new Response(stream).text()

    expect(text).toBe(toCsv(headers, batches.flat()))
  })

  test("writes preamble lines above the header row", async () => {
    const stream = await toCsvStream(
      ["Record Type", "Date"],
      batchesOf([[["loan", "2026-11-02"]]]),
      [["Loans are listed by the date they were paid out, see below."]]
    )

    expect(await new Response(stream).text()).toBe(
      '"Loans are listed by the date they were paid out, see below."\nRecord Type,Date\nloan,2026-11-02'
    )
  })

  test("an export with no rows is just the header line", async () => {
    const stream = await toCsvStream(["A", "B"], batchesOf([]))

    expect(await new Response(stream).text()).toBe("A,B")
  })

  test("a failing first read fails before the download starts", async () => {
    async function* failing(): AsyncGenerator<CsvCell[][]> {
      throw new Error("read failed")
    }

    await expect(toCsvStream(["A"], failing())).rejects.toThrow("read failed")
  })

  test("reads by cursor until a short batch and passes each cursor on", async () => {
    const rows = Array.from({ length: 5 }, (_, index) => ({ id: `r${index}` }))
    const calls: Array<{ cursor: string | undefined; limit: number }> = []
    const batches: Array<Array<{ id: string }>> = []

    for await (const batch of readCursorBatches(
      async ({ cursor, limit }) => {
        calls.push({ cursor, limit })
        const start = cursor
          ? rows.findIndex((row) => row.id === cursor) + 1
          : 0
        const page = rows.slice(start, start + limit)
        return { nextCursor: lastIdCursor(page, limit), rows: page }
      },
      { batchSize: 2, maxRows: 100 }
    )) {
      batches.push(batch)
    }

    expect(batches.map((batch) => batch.map((row) => row.id))).toEqual([
      ["r0", "r1"],
      ["r2", "r3"],
      ["r4"],
    ])
    expect(calls).toEqual([
      { cursor: undefined, limit: 2 },
      { cursor: "r1", limit: 2 },
      { cursor: "r3", limit: 2 },
    ])
  })

  test("stops at the row ceiling", async () => {
    const limits: number[] = []
    let total = 0

    for await (const batch of readCursorBatches(
      async ({ limit }) => {
        limits.push(limit)
        const page = Array.from({ length: limit }, (_, index) => ({
          id: `r${total + index}`,
        }))
        return { nextCursor: lastIdCursor(page, limit), rows: page }
      },
      { batchSize: 4, maxRows: 10 }
    )) {
      total += batch.length
    }

    expect(total).toBe(10)
    expect(limits).toEqual([4, 4, 2])
  })
})
