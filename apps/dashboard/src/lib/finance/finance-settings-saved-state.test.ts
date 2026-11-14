import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

const formsSource = readFileSync(
  new URL("../../components/forms/tenant-finance-forms.tsx", import.meta.url),
  "utf8"
)
const presentationSource = readFileSync(
  new URL("../../components/workflow-presentation.tsx", import.meta.url),
  "utf8"
)

function functionBody(name: string) {
  const start = formsSource.indexOf(`export function ${name}(`)
  expect(start).toBeGreaterThan(-1)
  const next = formsSource.indexOf("\nexport ", start + 1)
  return formsSource.slice(start, next === -1 ? undefined : next)
}

// These finance settings forms keep their sheet open after a save, so they
// must clear the sheet's unsaved-changes guard themselves (QA F7).
const formsThatStayOpen = ["ChargeDefinitionVersionForm"]

// The plain Finance setup forms save through one hook that marks the
// overlay saved before it closes.
const plainForms = [
  "loan-product-form.tsx",
  "loan-rules-form.tsx",
  "loan-window-form.tsx",
  "profit-rules-form.tsx",
  "share-model-form.tsx",
]

describe("finance settings saved state", () => {
  test("the workflow shell lets a saved form clear the discard prompt", () => {
    expect(presentationSource).toContain("export function useMarkWorkflowSaved")
    expect(presentationSource).toContain(
      "<WorkflowPresentationContext.Provider value={{ markSaved }}>"
    )
  })

  test("the Finance setup save hook marks the overlay saved", () => {
    const hook = readFileSync(
      new URL(
        "../../components/finance-settings/use-finance-settings-save.ts",
        import.meta.url
      ),
      "utf8"
    )

    expect(hook).toContain("const markWorkflowSaved = useMarkWorkflowSaved()")
    expect(hook).toContain("markWorkflowSaved()")

    for (const file of plainForms) {
      const source = readFileSync(
        new URL(`../../components/finance-settings/${file}`, import.meta.url),
        "utf8"
      )

      expect(source).toContain("useFinanceSettingsSave(")
    }
  })

  for (const name of formsThatStayOpen) {
    test(`${name} marks the sheet saved after a successful save`, () => {
      const body = functionBody(name)

      expect(body).toContain("const markWorkflowSaved = useMarkWorkflowSaved()")
      expect(body).toContain("markWorkflowSaved()")
    })
  }
})
