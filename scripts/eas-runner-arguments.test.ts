import { describe, expect, test } from "bun:test"
import { assertForwardedEasArgs } from "./eas-runner-arguments"

describe("scoped EAS runner arguments", () => {
  test("permits documented build and update controls", () => {
    expect(() =>
      assertForwardedEasArgs("build", [
        "--non-interactive",
        "--no-wait",
        "--local",
        "--clear-cache",
      ])
    ).not.toThrow()
    expect(() =>
      assertForwardedEasArgs("update", ["--non-interactive", "--json"])
    ).not.toThrow()
    expect(() =>
      assertForwardedEasArgs("submit", [
        "--id",
        "11111111-1111-4111-8111-111111111111",
        "--non-interactive",
      ])
    ).not.toThrow()
  })

  test("rejects options that can change the selected build, bypass inspection or auto-submit", () => {
    for (const args of [
      ["--auto-submit"],
      ["--profile", "production"],
      ["--profile=production"],
      ["--platform", "ios"],
      ["--artifact-path", "/tmp/app.aab"],
      ["--json"],
    ]) {
      expect(() => assertForwardedEasArgs("build", args)).toThrow(
        "Unsupported eas:build option"
      )
    }
    for (const args of [
      ["--latest"],
      ["--path", "/tmp/app.aab"],
      ["--url", "https://example.com/app.aab"],
      ["--profile=production"],
    ]) {
      expect(() => assertForwardedEasArgs("submit", args)).toThrow(
        "Unsupported eas:submit option"
      )
    }
  })

  test("rejects misspelled, repeated and valueless options before a command starts", () => {
    expect(() => assertForwardedEasArgs("build", ["--no-wiat"])).toThrow(
      "Unsupported eas:build option"
    )
    expect(() =>
      assertForwardedEasArgs("build", ["--local", "--local"])
    ).toThrow("Duplicate build option")
    expect(() =>
      assertForwardedEasArgs("submit", ["--id", "--non-interactive"])
    ).toThrow("Missing value for --id")
    expect(() => assertForwardedEasArgs("update", ["--skip-publsh"])).toThrow(
      "Unsupported eas:update option"
    )
    expect(() => assertForwardedEasArgs("update", ["--date="])).toThrow(
      "Unsupported eas:update option"
    )
  })
})
