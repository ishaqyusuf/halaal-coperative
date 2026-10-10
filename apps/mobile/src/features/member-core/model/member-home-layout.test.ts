import { describe, expect, test } from "bun:test"
import { resolveMemberHomeLayoutPolicy } from "./member-home-layout"

describe("member Home layout policy", () => {
  test("preserves the compact normal-text dashboard", () => {
    expect(resolveMemberHomeLayoutPolicy(false, 1)).toEqual({
      actionDetailLineLimit: 2,
      metricColumns: 2,
      readinessMetadataLineLimit: 1,
      serviceLayout: "compact",
    })
  })

  test("uses two-column services at moderate large text", () => {
    expect(resolveMemberHomeLayoutPolicy(true, 1.6)).toEqual({
      actionDetailLineLimit: undefined,
      metricColumns: 1,
      readinessMetadataLineLimit: undefined,
      serviceLayout: "wide",
    })
  })

  test("uses full-width service rows at 200 percent text", () => {
    expect(resolveMemberHomeLayoutPolicy(true, 2)).toEqual({
      actionDetailLineLimit: undefined,
      metricColumns: 1,
      readinessMetadataLineLimit: undefined,
      serviceLayout: "full",
    })
  })
})
