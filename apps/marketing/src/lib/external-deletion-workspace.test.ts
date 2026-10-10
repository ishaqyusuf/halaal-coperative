import { expect, test } from "bun:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { ExternalDeletionRequestForm } from "../components/external-deletion-request-form"
import {
  externalDeletionWorkspacePattern,
  normalizeExternalDeletionWorkspace,
} from "./external-deletion-workspace"

test("pasted workspace identifiers normalize to the same value the request API accepts", () => {
  for (const [entered, expected] of [
    ["  Amanah  ", "amanah"],
    ["  Cooperative.NG  ", "cooperative.ng"],
    ["north-east.example.ng", "north-east.example.ng"],
  ] as const) {
    const value = normalizeExternalDeletionWorkspace(entered)
    expect(value).toBe(expected)
    expect(value.length).toBeGreaterThanOrEqual(2)
    expect(externalDeletionWorkspacePattern.test(value)).toBe(true)
  }
})

test("invalid host labels are rejected before a deletion-link request", () => {
  for (const value of ["a..ng", "-amanah", "amanah-", "a._ng", "legal name"]) {
    expect(externalDeletionWorkspacePattern.test(value)).toBe(false)
  }
})

test("the public request form applies the server's workspace format and length", () => {
  const html = renderToStaticMarkup(createElement(ExternalDeletionRequestForm))
  expect(html).toContain(`pattern="${externalDeletionWorkspacePattern.source}"`)
  expect(html).toContain('minLength="2"')
})
