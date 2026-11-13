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
const formsThatStayOpen = [
  "BusinessProfitPolicyForm",
  "ChargeDefinitionVersionForm",
  "FinancingCycleControlForm",
  "FinancingPolicyForm",
  "LoanProductSettingsForm",
  "SharePolicyForm",
]

describe("finance settings saved state", () => {
  test("the workflow shell lets a saved form clear the discard prompt", () => {
    expect(presentationSource).toContain("export function useMarkWorkflowSaved")
    expect(presentationSource).toContain(
      "<WorkflowPresentationContext.Provider value={{ markSaved }}>"
    )
  })

  for (const name of formsThatStayOpen) {
    test(`${name} marks the sheet saved after a successful save`, () => {
      const body = functionBody(name)

      expect(body).toContain("const markWorkflowSaved = useMarkWorkflowSaved()")
      expect(body).toContain("markWorkflowSaved()")
    })
  }
})
