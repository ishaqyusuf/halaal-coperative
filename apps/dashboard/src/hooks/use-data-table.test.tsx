import { describe, expect, test } from "bun:test"
import {
  type ColumnDef,
  createTable,
  getCoreRowModel,
  type Table,
  type TableOptionsResolved,
  type Updater,
} from "@tanstack/react-table"
import { renderToStaticMarkup } from "react-dom/server"
import { DATA_TABLE_DEFAULTS, useDataTable } from "./use-data-table"

type Row = { id: string }

const columns: ColumnDef<Row>[] = [{ accessorKey: "id", header: "ID" }]
const pages = [[{ id: "a" }, { id: "b" }], [{ id: "c" }]]

// What an unmemoized `data.pages.flatMap(...)` hands the table on each render.
const freshRows = () => pages.flatMap((page) => page)

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0))

// Re-render the table the way a component does: new options, then read rows.
async function renderRepeatedly(table: Table<Row>, renders: number) {
  for (let index = 0; index < renders; index += 1) {
    table.setOptions((previous) => ({ ...previous, data: freshRows() }))
    table.getRowModel()
    await flushMicrotasks()
  }
}

function createPlainTable(
  extra: Partial<TableOptionsResolved<Row>>,
  onStateChange: (updater: Updater<unknown>) => void
) {
  return createTable<Row>({
    columns,
    data: freshRows(),
    getCoreRowModel: getCoreRowModel(),
    onStateChange,
    renderFallbackValue: null,
    state: {},
    ...extra,
  })
}

describe("useDataTable", () => {
  test("TanStack's defaults write table state whenever data changes identity", async () => {
    const updates: unknown[] = []
    const table = createPlainTable({}, (updater) => updates.push(updater))

    await renderRepeatedly(table, 3)

    // Each write is a new state object, which re-renders the component and
    // produces fresh rows again: the loop that froze dashboard tabs.
    expect(updates.length).toBeGreaterThan(0)
  })

  test("the dashboard defaults keep unstable data from writing table state", async () => {
    const updates: unknown[] = []
    const table = createPlainTable(DATA_TABLE_DEFAULTS, (updater) =>
      updates.push(updater)
    )

    await renderRepeatedly(table, 3)

    expect(updates).toEqual([])
  })

  test("the hook applies the defaults to the table it returns", async () => {
    const updates: unknown[] = []
    let table: Table<Row> | undefined

    function Probe({ onTable }: { onTable: (table: Table<Row>) => void }) {
      const probeTable = useDataTable({
        columns,
        data: freshRows(),
        getCoreRowModel: getCoreRowModel(),
        onStateChange: (updater) => updates.push(updater),
      })
      probeTable.getRowModel()
      onTable(probeTable)
      return null
    }

    renderToStaticMarkup(
      <Probe
        onTable={(rendered) => {
          table = rendered
        }}
      />
    )
    if (!table) throw new Error("Probe did not render")

    expect(table.options.autoResetAll).toBe(false)
    await renderRepeatedly(table, 3)
    expect(updates).toEqual([])
  })
})
