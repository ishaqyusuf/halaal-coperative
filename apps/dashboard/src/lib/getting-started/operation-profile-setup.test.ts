import { describe, expect, test } from "bun:test"
import type {
  TenantOperationProfileReadModel,
  TenantServiceAccessMode,
} from "@halaalvest/db"
import { accessModeFromServiceChoice } from "./operation-profile-flow"
import {
  buildOperationProfileSetupFields,
  buildOperationProfileSetupFormData,
  commitmentCollectionChoices,
  commitmentCollectionLabels,
  getOperationProfileSetupInitialValues,
  operationProfileSetupChangeReason,
  operationProfileSetupFieldNames,
  serviceOfferedChoices,
  serviceOfferedLabels,
  serviceRequestChannelChoices,
  serviceRequestChannelLabels,
  supportAccessChoices,
  supportAccessLabels,
  type OperationProfileSetupValues,
} from "./operation-profile-setup"

type ServiceModes = Partial<
  Record<
    keyof TenantOperationProfileReadModel["services"],
    TenantServiceAccessMode
  >
>

// Mirrors `defaultTenantServiceAccessModes` and the default policy in
// packages/db/src/queries/operation-profile.ts.
function profileFixture(
  services: ServiceModes = {},
  policy: Partial<TenantOperationProfileReadModel["policy"]> = {}
): TenantOperationProfileReadModel {
  const modes = {
    collection_source_batch_posting: "disabled",
    collection_sources: "disabled",
    food_purchase: "disabled",
    payment_receipts: "office_only",
    procurement: "disabled",
    support_cases: "member_self_service",
    ...services,
  } satisfies Record<string, TenantServiceAccessMode>

  return {
    policy: {
      foodPurchaseMaximumActiveObligationsPerMember: 1,
      foodPurchaseRequiresOpenCycle: true,
      procurementMaximumActiveObligationsPerMember: 1,
      ...policy,
    },
    reviewedAt: null,
    reviewedByUserId: null,
    services: Object.fromEntries(
      Object.entries(modes).map(([key, accessMode]) => [
        key,
        {
          accessMode,
          canMemberCreate: accessMode === "member_self_service",
          canSettleExisting: accessMode !== "disabled",
        },
      ])
    ) as unknown as TenantOperationProfileReadModel["services"],
    tenantId: "tenant_1",
  }
}

const sampleValues: OperationProfileSetupValues = {
  commitmentCollection: "mixed",
  foodPurchaseOffered: "yes",
  foodPurchaseRequestChannel: "member",
  procurementOffered: "yes",
  procurementRequestChannel: "office",
  supportAccess: "office",
}

describe("operation profile setup labels", () => {
  test("every real option has a plain label", () => {
    expect(Object.keys(commitmentCollectionLabels).sort()).toEqual(
      [...commitmentCollectionChoices].sort()
    )
    expect(Object.keys(serviceOfferedLabels).sort()).toEqual(
      [...serviceOfferedChoices].sort()
    )
    expect(Object.keys(serviceRequestChannelLabels).sort()).toEqual(
      [...serviceRequestChannelChoices].sort()
    )
    expect(Object.keys(supportAccessLabels).sort()).toEqual(
      [...supportAccessChoices].sort()
    )
  })

  test("uses the spec's plain wording", () => {
    expect(commitmentCollectionLabels).toEqual({
      collection_sources: "In bulk from an employer, ministry or payroll list",
      member_receipts: "Members upload payment receipts",
      mixed: "A mix of these",
      office: "Staff record each payment",
    })
    expect(serviceOfferedLabels).toEqual({ no: "No", yes: "Yes, we do this" })
    expect(serviceRequestChannelLabels).toEqual({
      member: "Members, from the app",
      office: "Our office",
    })
    expect(supportAccessLabels).toEqual({
      member: "They message us in the app",
      office: "They contact the office",
    })
  })
})

describe("operation profile setup initial values", () => {
  test("screen defaults match today's database defaults", () => {
    expect(getOperationProfileSetupInitialValues(profileFixture())).toEqual({
      commitmentCollection: "office",
      foodPurchaseOffered: "no",
      foodPurchaseRequestChannel: "office",
      procurementOffered: "no",
      procurementRequestChannel: "office",
      supportAccess: "member",
    })
  })

  test("reads saved choices back from the profile", () => {
    expect(
      getOperationProfileSetupInitialValues(
        profileFixture({
          collection_source_batch_posting: "office_only",
          collection_sources: "office_only",
          food_purchase: "member_self_service",
          payment_receipts: "member_self_service",
          procurement: "office_only",
          support_cases: "office_only",
        })
      )
    ).toEqual(sampleValues)
  })

  test("derives each commitment collection choice", () => {
    expect(
      getOperationProfileSetupInitialValues(
        profileFixture({ payment_receipts: "member_self_service" })
      ).commitmentCollection
    ).toBe("member_receipts")
    expect(
      getOperationProfileSetupInitialValues(
        profileFixture({ collection_sources: "office_only" })
      ).commitmentCollection
    ).toBe("collection_sources")
  })

  test("read-only services start as not offered", () => {
    const values = getOperationProfileSetupInitialValues(
      profileFixture({ food_purchase: "read_only", procurement: "read_only" })
    )

    expect(values.procurementOffered).toBe("no")
    expect(values.foodPurchaseOffered).toBe("no")
  })
})

describe("operation profile setup fields", () => {
  test("emits every field the handler reads, once each", () => {
    const fields = buildOperationProfileSetupFields(
      sampleValues,
      profileFixture()
    )
    const names = fields.map(([name]) => name)

    expect([...names].sort()).toEqual(
      [...operationProfileSetupFieldNames].sort()
    )
    expect(new Set(names).size).toBe(names.length)
    for (const [, value] of fields) {
      expect(value.length).toBeGreaterThan(0)
    }
  })

  test("sends the four answers as chosen", () => {
    const fields = Object.fromEntries(
      buildOperationProfileSetupFields(sampleValues, profileFixture())
    )

    expect(fields.commitmentCollection).toBe("mixed")
    expect(fields.procurementOffered).toBe("yes")
    expect(fields.procurementRequestChannel).toBe("office")
    expect(fields.foodPurchaseOffered).toBe("yes")
    expect(fields.foodPurchaseRequestChannel).toBe("member")
    expect(fields.supportAccess).toBe("office")
  })

  test("preserves hidden limits and the open-cycle rule", () => {
    const withLimits = Object.fromEntries(
      buildOperationProfileSetupFields(
        sampleValues,
        profileFixture(
          {},
          {
            foodPurchaseMaximumActiveObligationsPerMember: 999,
            foodPurchaseRequiresOpenCycle: false,
            procurementMaximumActiveObligationsPerMember: 3,
          }
        )
      )
    )

    expect(withLimits.procurementMaximumActiveObligationsPerMember).toBe("3")
    expect(withLimits.foodPurchaseMaximumActiveObligationsPerMember).toBe("999")
    expect(withLimits.foodPurchaseRequiresOpenCycle).toBe("false")

    const defaults = Object.fromEntries(
      buildOperationProfileSetupFields(sampleValues, profileFixture())
    )

    expect(defaults.procurementMaximumActiveObligationsPerMember).toBe("1")
    expect(defaults.foodPurchaseMaximumActiveObligationsPerMember).toBe("1")
    expect(defaults.foodPurchaseRequiresOpenCycle).toBe("true")
  })

  test("always includes the setup change reason", () => {
    const fields = Object.fromEntries(
      buildOperationProfileSetupFields(sampleValues, profileFixture())
    )

    expect(fields.changeReason).toBe("Initial setup operation profile update.")
    expect(operationProfileSetupChangeReason).toBe(
      "Initial setup operation profile update."
    )
  })

  test("offered and channel answers map to the stored access modes", () => {
    // The handler's guided mapping matches the shared flow helper.
    expect(accessModeFromServiceChoice("no")).toBe("disabled")
    expect(accessModeFromServiceChoice("no", "office", true)).toBe("read_only")
    expect(accessModeFromServiceChoice("yes", "office")).toBe("office_only")
    expect(accessModeFromServiceChoice("yes", "member")).toBe(
      "member_self_service"
    )
  })

  test("builds FormData with the same entries", () => {
    const profile = profileFixture()
    const formData = buildOperationProfileSetupFormData(sampleValues, profile)

    expect(Array.from(formData.entries())).toEqual(
      buildOperationProfileSetupFields(sampleValues, profile)
    )
  })
})
