import { describe, expect, test } from "bun:test"
import { resolveMemberOperationalReadiness } from "./member-readiness"

import {
  countLateProcurementScheduleItems,
  deriveMobileFoodPurchaseAvailability,
  deriveMobileProcurementAvailability,
  getMobileMemberFoodPurchaseApplicationDetail,
  getMobileMemberFoodPurchaseApplicationPage,
  getMobileMemberProcurementRequestDetail,
  getMobileMemberProcurementRequestPage,
  getMobileMemberProjectFinancingRequestDetail,
  getMobileMemberProjectFinancingRequestPage,
  quoteMobileMemberProjectFinancingCharges,
} from "./mobile-member-cooperative-services"

describe("mobile project-financing charge quote", () => {
  test("quotes percentage charges for the signed member's tenant and amount", async () => {
    const prisma = {
      member: {
        findFirst: async ({ where }: { where: Record<string, string> }) =>
          where.tenantId === "tenant-1" && where.userId === "user-1"
            ? { id: "member-1" }
            : null,
      },
      chargeApplicability: {
        findMany: async ({ where }: { where: Record<string, string> }) => {
          expect(where).toMatchObject({
            tenantId: "tenant-1",
            trigger: "submission",
            workflow: "project_financing_request",
          })
          return [
            {
              chargeDefinition: {
                code: "PROJECT_REVIEW",
                id: "definition-1",
                name: "Project review",
                versions: [{ amount: 2.5, chargeValueType: "percentage" }],
              },
              collectionMode: "pay_separately",
              id: "applicability-1",
              isRequired: true,
            },
          ]
        },
      },
    }

    const quote = await quoteMobileMemberProjectFinancingCharges(
      { requestedAmount: 1010, tenantId: "tenant-1", userId: "user-1" },
      prisma as never
    )
    expect(quote.charges).toEqual([
      {
        amount: 25.25,
        collectionMode: "pay_separately",
        id: "applicability-1",
        name: "Project review",
      },
    ])
    expect(quote.feeTotal).toBe(25.25)
    expect(quote.chargeQuoteHash).toMatch(/^[a-f0-9]{64}$/)

    await expect(
      quoteMobileMemberProjectFinancingCharges(
        { requestedAmount: 1010, tenantId: "tenant-1", userId: "other" },
        prisma as never
      )
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" })
  })
})

const accessModes = [
  "disabled",
  "office_only",
  "member_self_service",
  "read_only",
] as const

describe("mobile member cooperative-service availability", () => {
  test.each(["member_inactive", "kyc_unverified", "migration_incomplete"] as const)(
    "blocks procurement when authoritative readiness reports %s",
    (issue) => {
      const readiness = resolveMemberOperationalReadiness({
        joinedAt: new Date(issue === "migration_incomplete" ? "2026-01-01" : "2026-09-01"),
        kycStatus: issue === "kyc_unverified" ? "not_started" : "verified",
        memberStatus: issue === "member_inactive" ? "suspended" : "active",
        migrationSetupMode: "historical_backfill",
      }, new Date("2026-09-05"))
      expect(readiness.issues).toEqual([issue])

      for (const accessMode of accessModes) {
        const availability = deriveMobileProcurementAvailability({
          accessMode,
          activeFinancingBlocksProcurement: false,
          activeFinancingCount: 0,
          activeObligationCount: 0,
          hasMember: true,
          memberOperationalReady: readiness.isReady,
          maximumActiveObligationsPerMember: 1,
        })
        expect(availability.canCreateRequest).toBe(false)
        expect(availability.restrictionReasons).toContain(
          "Member verification is required before financial or operational actions can continue."
        )
      }
    }
  )

  test("missing readiness fails closed even when a member is linked", () => {
    expect(deriveMobileProcurementAvailability({
      accessMode: "member_self_service",
      activeFinancingBlocksProcurement: false,
      activeFinancingCount: 0,
      activeObligationCount: 0,
      hasMember: true,
      memberOperationalReady: false,
      maximumActiveObligationsPerMember: 1,
    }).canCreateRequest).toBe(false)
  })

  test.each(accessModes)(
    "reflects procurement access mode %s",
    (accessMode) => {
      const availability = deriveMobileProcurementAvailability({
        accessMode,
        activeFinancingBlocksProcurement: true,
        activeFinancingCount: 0,
        activeObligationCount: 0,
        hasMember: true,
        memberOperationalReady: true,
        maximumActiveObligationsPerMember: 1,
      })

      expect(availability.canCreateRequest).toBe(
        accessMode === "member_self_service"
      )
      expect(availability.restrictionReasons.length).toBe(
        accessMode === "member_self_service" ? 0 : 1
      )
    }
  )

  test("blocks procurement for active obligations and active financing", () => {
    const availability = deriveMobileProcurementAvailability({
      accessMode: "member_self_service",
      activeFinancingBlocksProcurement: true,
      activeFinancingCount: 1,
      activeObligationCount: 2,
      hasMember: true,
      memberOperationalReady: true,
      maximumActiveObligationsPerMember: 2,
    })

    expect(availability.canCreateRequest).toBe(false)
    expect(availability.restrictionReasons).toHaveLength(2)
    expect(availability.restrictionReasons.join(" ")).toContain(
      "active procurement obligation"
    )
    expect(availability.restrictionReasons.join(" ")).toContain(
      "active financing obligation"
    )
  })

  test.each(accessModes)(
    "reflects Foodstuff Purchase access mode %s",
    (accessMode) => {
      const availability = deriveMobileFoodPurchaseAvailability({
        accessMode,
        activeObligationCount: 0,
        hasMember: true,
        hasOpenCycle: true,
        maximumActiveObligationsPerMember: 1,
      })

      expect(availability.canCreateApplication).toBe(
        accessMode === "member_self_service"
      )
    }
  )

  test("blocks Foodstuff Purchase for a closed cycle or obligation cap", () => {
    const availability = deriveMobileFoodPurchaseAvailability({
      accessMode: "member_self_service",
      activeObligationCount: 1,
      hasMember: true,
      hasOpenCycle: false,
      maximumActiveObligationsPerMember: 1,
    })

    expect(availability.canCreateApplication).toBe(false)
    expect(availability.restrictionReasons).toHaveLength(2)
    expect(availability.restrictionReasons.join(" ")).toContain("open")
  })

  test("fails closed when the signed user has no linked member", () => {
    expect(
      deriveMobileProcurementAvailability({
        accessMode: "member_self_service",
        activeFinancingBlocksProcurement: false,
        activeFinancingCount: 0,
        activeObligationCount: 0,
        hasMember: false,
        memberOperationalReady: false,
        maximumActiveObligationsPerMember: 1,
      }).canCreateRequest
    ).toBe(false)
    expect(
      deriveMobileFoodPurchaseAvailability({
        accessMode: "member_self_service",
        activeObligationCount: 0,
        hasMember: false,
        hasOpenCycle: true,
        maximumActiveObligationsPerMember: 1,
      }).canCreateApplication
    ).toBe(false)
  })

  test("derives page and detail ownership from the signed tenant user", async () => {
    const memberLookups: unknown[] = []
    const prisma = {
      member: {
        findFirst: async (input: unknown) => {
          memberLookups.push(input)
          return null
        },
      },
    } as never
    const identity = { tenantId: "tenant-1", userId: "user-1" }

    const pages = await Promise.all([
      getMobileMemberProcurementRequestPage(identity, prisma),
      getMobileMemberFoodPurchaseApplicationPage(identity, prisma),
      getMobileMemberProjectFinancingRequestPage(identity, prisma),
    ])
    const details = await Promise.all([
      getMobileMemberProcurementRequestDetail(
        { ...identity, procurementRequestId: "procurement-1" },
        prisma
      ),
      getMobileMemberFoodPurchaseApplicationDetail(
        { ...identity, foodPurchaseApplicationId: "food-1" },
        prisma
      ),
      getMobileMemberProjectFinancingRequestDetail(
        { ...identity, projectFinancingRequestId: "project-1" },
        prisma
      ),
    ])

    for (const page of pages) {
      expect(page).toEqual({
        data: [],
        nextCursor: null,
        state: "member_profile_missing",
      })
    }
    expect(details).toEqual([null, null, null])
    expect(memberLookups).toHaveLength(6)
    expect(memberLookups[0]).toMatchObject({
      where: { tenantId: "tenant-1", userId: "user-1" },
    })
  })
})

describe("mobile procurement late installments", () => {
  test("counts unpaid installments due before today, not the stored overdue status", () => {
    const asOf = new Date("2026-11-16T00:00:00.000Z")
    const requests = [
      {
        scheduleItems: [
          // Late: unpaid and due before today, whatever status was saved.
          { dueDate: "2026-10-01T00:00:00.000Z", status: "overdue" },
          { dueDate: "2026-10-15T00:00:00.000Z", status: "pending" },
          { dueDate: "2026-11-01T00:00:00.000Z", status: "partially_paid" },
          // Not late: a stored "overdue" on an installment not yet due.
          { dueDate: "2026-12-01T00:00:00.000Z", status: "overdue" },
          // Not late: due today, paid, or waived.
          { dueDate: "2026-11-16T00:00:00.000Z", status: "due" },
          { dueDate: "2026-09-01T00:00:00.000Z", status: "paid" },
          { dueDate: "2026-09-01T00:00:00.000Z", status: "waived" },
        ],
      },
      {
        scheduleItems: [
          { dueDate: new Date("2026-11-15T00:00:00.000Z"), status: "due" },
        ],
      },
    ]
    expect(countLateProcurementScheduleItems(requests, asOf)).toBe(4)
    expect(countLateProcurementScheduleItems([], asOf)).toBe(0)
  })
})
