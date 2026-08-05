import { describe, expect, test } from "bun:test"
import {
  addMemberSupportCaseMessage,
  addSupportCaseMessage,
  createMemberSupportCase,
  createSupportCase,
  getMemberSupportCaseSummary,
  getSupportCase,
  getSupportCaseSummary,
  listSupportCases,
  reviewSupportCaseFinancialAdjustment,
  updateSupportCaseStatus,
} from "./support"

function supportCaseRow(overrides: Record<string, unknown> = {}) {
  return {
    assignedToUser: null,
    assignedToUserId: null,
    category: "payment_issue",
    closedAt: null,
    createdAt: new Date("2026-07-08T10:00:00.000Z"),
    description: "Member says a receipt was posted to the wrong month.",
    financialAdjustmentApprovalNotes: null,
    financialAdjustmentApprovalStatus: "not_required",
    financialAdjustmentApprovedAt: null,
    financialAdjustmentApprovedByUser: null,
    financialAdjustmentApprovedByUserId: null,
    id: "support-1",
    linkedRecordId: null,
    linkedRecordType: null,
    member: {
      email: "aisha@example.com",
      fullName: "Aisha Bello",
      id: "member-1",
      memberNumber: "M-001",
    },
    memberId: "member-1",
    messages: [],
    moneyImpactRequested: true,
    openedByUserId: "user-1",
    priority: "high",
    requiresFinancialAdjustment: false,
    resolutionSummary: null,
    resolvedAt: null,
    status: "open",
    subject: "Payment mistake",
    updatedAt: new Date("2026-07-08T10:00:00.000Z"),
    ...overrides,
  }
}

describe("support case queries", () => {
  test("lists support cases with tenant and created-date export filters", async () => {
    const reads: Record<string, unknown>[] = []
    const fromDate = new Date("2026-07-01T00:00:00.000Z")
    const toDate = new Date("2026-07-31T23:59:59.999Z")

    const supportCases = await listSupportCases(
      {
        category: "payment_issue",
        fromDate,
        limit: 500,
        status: "open",
        tenantId: "tenant-1",
        toDate,
      },
      {
        supportCase: {
          findMany: async (input: Record<string, unknown>) => {
            reads.push(input)
            return []
          },
        },
      } as never
    )

    expect(supportCases).toEqual([])
    expect(reads[0]).toMatchObject({
      take: 500,
      where: {
        category: "payment_issue",
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
        status: "open",
        tenantId: "tenant-1",
      },
    })
  })

  test("reads a support case with member email for notifications", async () => {
    const caseReads: Record<string, unknown>[] = []

    const supportCase = await getSupportCase(
      {
        supportCaseId: "support-1",
        tenantId: "tenant-1",
      },
      {
        supportCase: {
          findFirst: async (input: Record<string, unknown>) => {
            caseReads.push(input)
            return supportCaseRow()
          },
        },
      } as never
    )

    expect(caseReads[0]).toMatchObject({
      where: {
        id: "support-1",
        tenantId: "tenant-1",
      },
    })
    expect(supportCase.member).toMatchObject({
      email: "aisha@example.com",
      fullName: "Aisha Bello",
    })
  })

  test("creates a tenant-scoped support case with initial message and audit", async () => {
    const caseCreates: Record<string, unknown>[] = []
    const messageCreates: Record<string, unknown>[] = []
    const auditCreates: Record<string, unknown>[] = []

    const supportCase = await createSupportCase(
      {
        assignedToUserId: "staff-1",
        attachmentUrl: "https://example.com/support/payment-proof.pdf",
        category: "payment_issue",
        description: "Member says a receipt was posted to the wrong month.",
        linkedRecordId: "11111111-1111-1111-1111-111111111111",
        linkedRecordType: "contribution",
        memberId: "member-1",
        moneyImpactRequested: true,
        openedByUserId: "user-1",
        priority: "high",
        subject: "Payment mistake",
        tenantId: "tenant-1",
      },
      {
        $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
          callback({
            auditLog: {
              create: async (input: Record<string, unknown>) => {
                auditCreates.push(input)
                return input
              },
            },
            supportCase: {
              create: async (input: any) => {
                caseCreates.push(input)
                return supportCaseRow({
                  ...input.data,
                  id: "support-1",
                  messages: [],
                })
              },
              findFirst: async () =>
                supportCaseRow({
                  messages: [
                    {
                      attachmentUrl:
                        "https://example.com/support/payment-proof.pdf",
                      authorType: "staff",
                      authorUser: {
                        email: "staff@example.com",
                        fullName: "Staff User",
                        id: "user-1",
                      },
                      authorUserId: "user-1",
                      createdAt: new Date("2026-07-08T10:01:00.000Z"),
                      id: "message-1",
                      message:
                        "Member says a receipt was posted to the wrong month.",
                      supportCaseId: "support-1",
                    },
                  ],
                }),
            },
            supportCaseMessage: {
              create: async (input: Record<string, unknown>) => {
                messageCreates.push(input)
                return input
              },
            },
          }),
        member: {
          findFirst: async () => ({ id: "member-1" }),
        },
        user: {
          findFirst: async () => ({ id: "user-1" }),
        },
      } as never
    )

    expect(supportCase).toMatchObject({
      category: "payment_issue",
      id: "support-1",
      memberId: "member-1",
      messages: [
        {
          attachmentUrl: "https://example.com/support/payment-proof.pdf",
          authorType: "staff",
          message: "Member says a receipt was posted to the wrong month.",
        },
      ],
      moneyImpactRequested: true,
      priority: "high",
      status: "open",
      subject: "Payment mistake",
    })
    expect(caseCreates[0]).toMatchObject({
      data: {
        assignedToUserId: "staff-1",
        category: "payment_issue",
        linkedRecordId: "11111111-1111-1111-1111-111111111111",
        linkedRecordType: "contribution",
        memberId: "member-1",
        moneyImpactRequested: true,
        openedByUserId: "user-1",
        priority: "high",
        subject: "Payment mistake",
        tenantId: "tenant-1",
      },
    })
    expect(messageCreates[0]).toMatchObject({
      data: {
        attachmentUrl: "https://example.com/support/payment-proof.pdf",
        authorType: "staff",
        authorUserId: "user-1",
        message: "Member says a receipt was posted to the wrong month.",
        supportCaseId: "support-1",
        tenantId: "tenant-1",
      },
    })
    expect(auditCreates[0]).toMatchObject({
      data: {
        action: "support.case_created",
        actorType: "user",
        actorUserId: "user-1",
        entityId: "support-1",
        entityType: "SupportCase",
        metadata: {
          category: "payment_issue",
          linkedRecordType: "contribution",
          memberId: "member-1",
          moneyImpactRequested: true,
          priority: "high",
          subject: "Payment mistake",
        },
        tenantId: "tenant-1",
      },
    })
  })

  test("creates audited feature request cases for product feedback triage", async () => {
    const caseCreates: Record<string, unknown>[] = []
    const auditCreates: Record<string, unknown>[] = []

    const supportCase = await createSupportCase(
      {
        category: "feature_request",
        description: "Please add WhatsApp reminders for monthly payments.",
        openedByUserId: "staff-1",
        priority: "normal",
        subject: "WhatsApp payment reminders",
        tenantId: "tenant-1",
      },
      {
        $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
          callback({
            auditLog: {
              create: async (input: Record<string, unknown>) => {
                auditCreates.push(input)
                return input
              },
            },
            supportCase: {
              create: async (input: any) => {
                caseCreates.push(input)
                return supportCaseRow({
                  ...input.data,
                  id: "support-feature-1",
                  messages: [],
                })
              },
              findFirst: async () =>
                supportCaseRow({
                  category: "feature_request",
                  description:
                    "Please add WhatsApp reminders for monthly payments.",
                  id: "support-feature-1",
                  member: null,
                  memberId: null,
                  messages: [],
                  moneyImpactRequested: false,
                  openedByUserId: "staff-1",
                  priority: "normal",
                  subject: "WhatsApp payment reminders",
                }),
            },
            supportCaseMessage: {
              create: async () => ({}),
            },
          }),
        user: {
          findFirst: async () => ({ id: "staff-1" }),
        },
      } as never
    )

    expect(supportCase).toMatchObject({
      category: "feature_request",
      moneyImpactRequested: false,
      subject: "WhatsApp payment reminders",
    })
    expect(caseCreates[0]).toMatchObject({
      data: {
        category: "feature_request",
        moneyImpactRequested: false,
        openedByUserId: "staff-1",
        priority: "normal",
        subject: "WhatsApp payment reminders",
        tenantId: "tenant-1",
      },
    })
    expect(auditCreates[0]).toMatchObject({
      data: {
        action: "support.case_created",
        metadata: {
          category: "feature_request",
          moneyImpactRequested: false,
          priority: "normal",
          subject: "WhatsApp payment reminders",
        },
      },
    })
  })

  test("rejects support cases for members outside the tenant", async () => {
    await expect(
      createSupportCase(
        {
          category: "payment_issue",
          description: "Wrong account balance.",
          memberId: "member-outside",
          subject: "Balance issue",
          tenantId: "tenant-1",
        },
        {
          member: {
            findFirst: async () => null,
          },
          user: {
            findFirst: async () => null,
          },
        } as never
      )
    ).rejects.toThrow("Member does not belong to this cooperative")
  })

  test("creates member self-service support cases with member-authored initial message", async () => {
    const caseCreates: Record<string, unknown>[] = []
    const messageCreates: Record<string, unknown>[] = []
    const auditCreates: Record<string, unknown>[] = []

    const supportCase = await createMemberSupportCase(
      {
        attachmentUrl: "https://example.com/support/member-document.pdf",
        category: "payment_issue",
        description: "My payment receipt was applied to the wrong month.",
        memberId: "member-1",
        moneyImpactRequested: true,
        openedByUserId: "member-user-1",
        subject: "Payment month correction",
        tenantId: "tenant-1",
      },
      {
        $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
          callback({
            auditLog: {
              create: async (input: Record<string, unknown>) => {
                auditCreates.push(input)
                return input
              },
            },
            supportCase: {
              create: async (input: any) => {
                caseCreates.push(input)
                return supportCaseRow({
                  ...input.data,
                  id: "support-1",
                  messages: [],
                })
              },
              findFirst: async () =>
                supportCaseRow({
                  messages: [
                    {
                      attachmentUrl:
                        "https://example.com/support/member-document.pdf",
                      authorType: "member",
                      authorUser: {
                        email: "member@example.com",
                        fullName: "Aisha Bello",
                        id: "member-user-1",
                      },
                      authorUserId: "member-user-1",
                      createdAt: new Date("2026-07-08T10:01:00.000Z"),
                      id: "message-1",
                      message:
                        "My payment receipt was applied to the wrong month.",
                      supportCaseId: "support-1",
                    },
                  ],
                  openedByUserId: "member-user-1",
                  priority: "normal",
                  subject: "Payment month correction",
                }),
            },
            supportCaseMessage: {
              create: async (input: Record<string, unknown>) => {
                messageCreates.push(input)
                return input
              },
            },
          }),
        member: {
          findFirst: async () => ({ id: "member-1" }),
        },
        user: {
          findFirst: async () => ({ id: "member-user-1" }),
        },
      } as never
    )

    expect(supportCase).toMatchObject({
      messages: [
        {
          attachmentUrl: "https://example.com/support/member-document.pdf",
          authorType: "member",
          authorUserId: "member-user-1",
        },
      ],
      priority: "normal",
      subject: "Payment month correction",
    })
    expect(caseCreates[0]).toMatchObject({
      data: {
        assignedToUserId: null,
        memberId: "member-1",
        openedByUserId: "member-user-1",
        priority: "normal",
        tenantId: "tenant-1",
      },
    })
    expect(messageCreates[0]).toMatchObject({
      data: {
        attachmentUrl: "https://example.com/support/member-document.pdf",
        authorType: "member",
        authorUserId: "member-user-1",
        supportCaseId: "support-1",
      },
    })
    expect(auditCreates[0]).toMatchObject({
      data: {
        action: "support.case_created",
        actorUserId: "member-user-1",
        metadata: {
          memberId: "member-1",
          openedByAuthorType: "member",
          priority: "normal",
        },
      },
    })
  })

  test("creates member self-service support cases linked to owned receipts", async () => {
    const caseCreates: Record<string, unknown>[] = []
    const auditCreates: Record<string, unknown>[] = []

    const supportCase = await createMemberSupportCase(
      {
        category: "payment_issue",
        description: "This receipt was allocated to the wrong category.",
        linkedRecordId: "receipt-1",
        linkedRecordType: "receipt",
        memberId: "member-1",
        moneyImpactRequested: true,
        openedByUserId: "member-user-1",
        subject: "Receipt allocation issue",
        tenantId: "tenant-1",
      },
      {
        $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
          callback({
            auditLog: {
              create: async (input: Record<string, unknown>) => {
                auditCreates.push(input)
                return input
              },
            },
            supportCase: {
              create: async (input: any) => {
                caseCreates.push(input)
                return supportCaseRow({
                  ...input.data,
                  id: "support-1",
                  messages: [],
                })
              },
              findFirst: async () =>
                supportCaseRow({
                  description:
                    "This receipt was allocated to the wrong category.",
                  linkedRecordId: "receipt-1",
                  linkedRecordType: "receipt",
                  messages: [],
                  openedByUserId: "member-user-1",
                  priority: "normal",
                  subject: "Receipt allocation issue",
                }),
            },
            supportCaseMessage: {
              create: async () => ({}),
            },
          }),
        member: {
          findFirst: async () => ({ id: "member-1" }),
        },
        memberPaymentReceipt: {
          findFirst: async () => ({ id: "receipt-1" }),
        },
        user: {
          findFirst: async () => ({ id: "member-user-1" }),
        },
      } as never
    )

    expect(supportCase).toMatchObject({
      linkedRecordId: "receipt-1",
      linkedRecordType: "receipt",
      memberId: "member-1",
      subject: "Receipt allocation issue",
    })
    expect(caseCreates[0]).toMatchObject({
      data: {
        linkedRecordId: "receipt-1",
        linkedRecordType: "receipt",
        memberId: "member-1",
        moneyImpactRequested: true,
      },
    })
    expect(auditCreates[0]).toMatchObject({
      data: {
        metadata: {
          linkedRecordId: "receipt-1",
          linkedRecordType: "receipt",
          memberId: "member-1",
        },
      },
    })
  })

  test("blocks member support cases linked to receipts outside the member profile", async () => {
    const caseCreates: unknown[] = []

    await expect(
      createMemberSupportCase(
        {
          category: "payment_issue",
          description: "This is not my receipt.",
          linkedRecordId: "receipt-outside",
          linkedRecordType: "receipt",
          memberId: "member-1",
          openedByUserId: "member-user-1",
          subject: "Receipt issue",
          tenantId: "tenant-1",
        },
        {
          member: {
            findFirst: async () => ({ id: "member-1" }),
          },
          memberPaymentReceipt: {
            findFirst: async () => null,
          },
          supportCase: {
            create: async (input: unknown) => {
              caseCreates.push(input)
              return input
            },
          },
          user: {
            findFirst: async () => ({ id: "member-user-1" }),
          },
        } as never
      )
    ).rejects.toThrow("Linked receipt does not belong")

    expect(caseCreates).toHaveLength(0)
  })

  test("summarizes support cases for a tenant feature-request queue", async () => {
    const countWheres: unknown[] = []

    const summary = await getSupportCaseSummary("tenant-1", {
      supportCase: {
        count: async (input: Record<string, unknown>) => {
          countWheres.push(input.where)
          return countWheres.length
        },
      },
    } as never)

    expect(summary).toEqual({
      closedCases: 3,
      featureRequestOpenCases: 6,
      highPriorityOpenCases: 4,
      openCases: 2,
      totalCases: 1,
      urgentOpenCases: 5,
    })
    expect(countWheres).toHaveLength(6)
    expect(countWheres[5]).toMatchObject({
      category: "feature_request",
      status: {
        in: ["open", "in_progress", "waiting_on_member"],
      },
      tenantId: "tenant-1",
    })
  })

  test("summarizes support cases within a member boundary", async () => {
    const countWheres: unknown[] = []

    const summary = await getMemberSupportCaseSummary(
      {
        memberId: "member-1",
        tenantId: "tenant-1",
      },
      {
        supportCase: {
          count: async (input: Record<string, unknown>) => {
            countWheres.push(input.where)
            return countWheres.length
          },
        },
      } as never
    )

    expect(summary).toEqual({
      closedCases: 3,
      featureRequestOpenCases: 6,
      highPriorityOpenCases: 4,
      openCases: 2,
      totalCases: 1,
      urgentOpenCases: 5,
    })
    expect(countWheres).toHaveLength(6)
    for (const where of countWheres) {
      expect(where).toMatchObject({
        memberId: "member-1",
        tenantId: "tenant-1",
      })
    }
    expect(countWheres[5]).toMatchObject({
      category: "feature_request",
      status: {
        in: ["open", "in_progress", "waiting_on_member"],
      },
    })
  })

  test("adds member replies only to the member's own support case", async () => {
    const caseReads: Record<string, unknown>[] = []
    const messageCreates: Record<string, unknown>[] = []

    const message = await addMemberSupportCaseMessage(
      {
        authorUserId: "member-user-1",
        memberId: "member-1",
        message: "Please check the receipt again.",
        supportCaseId: "support-1",
        tenantId: "tenant-1",
      },
      {
        auditLog: {
          create: async () => ({}),
        },
        supportCase: {
          findFirst: async (input: Record<string, unknown>) => {
            caseReads.push(input)
            return supportCaseRow()
          },
        },
        supportCaseMessage: {
          create: async (input: Record<string, unknown>) => {
            messageCreates.push(input)
            return {
              ...input.data,
              authorUser: {
                email: "member@example.com",
                fullName: "Aisha Bello",
                id: "member-user-1",
              },
              createdAt: new Date("2026-07-08T10:05:00.000Z"),
              id: "message-2",
            }
          },
        },
        user: {
          findFirst: async () => ({ id: "member-user-1" }),
        },
      } as never
    )

    expect(caseReads[0]).toMatchObject({
      where: {
        id: "support-1",
        memberId: "member-1",
        tenantId: "tenant-1",
      },
    })
    expect(messageCreates[0]).toMatchObject({
      data: {
        authorType: "member",
        authorUserId: "member-user-1",
        message: "Please check the receipt again.",
        supportCaseId: "support-1",
        tenantId: "tenant-1",
      },
    })
    expect(message).toMatchObject({
      authorType: "member",
      message: "Please check the receipt again.",
    })
  })

  test("requires a resolution summary before resolving a support case", async () => {
    const updates: unknown[] = []

    await expect(
      updateSupportCaseStatus(
        {
          actorUserId: "user-1",
          status: "resolved",
          supportCaseId: "support-1",
          tenantId: "tenant-1",
        },
        {
          supportCase: {
            findFirst: async () => supportCaseRow(),
            update: async (input: unknown) => {
              updates.push(input)
              return input
            },
          },
          user: {
            findFirst: async () => ({ id: "user-1" }),
          },
        } as never
      )
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      message: expect.stringContaining("Resolution summary is required"),
      reportable: false,
    })

    expect(updates).toHaveLength(0)
  })

  test("blocks resolving money-impact support cases until financial adjustment is approved", async () => {
    const updates: unknown[] = []

    await expect(
      updateSupportCaseStatus(
        {
          actorUserId: "user-1",
          requiresFinancialAdjustment: true,
          resolutionSummary:
            "Payment mistake confirmed; finance adjustment request required.",
          status: "resolved",
          supportCaseId: "support-1",
          tenantId: "tenant-1",
        },
        {
          supportCase: {
            findFirst: async () => supportCaseRow(),
            update: async (input: unknown) => {
              updates.push(input)
              return input
            },
          },
          user: {
            findFirst: async () => ({ id: "user-1" }),
          },
        } as never
      )
    ).rejects.toThrow("Financial adjustment approval is required")

    expect(updates).toHaveLength(0)
  })

  test("blocks resolving rejected financial adjustment support cases", async () => {
    const updates: unknown[] = []

    await expect(
      updateSupportCaseStatus(
        {
          actorUserId: "user-1",
          resolutionSummary:
            "Payment mistake reviewed, but finance adjustment was rejected.",
          status: "resolved",
          supportCaseId: "support-1",
          tenantId: "tenant-1",
        },
        {
          supportCase: {
            findFirst: async () =>
              supportCaseRow({
                financialAdjustmentApprovalStatus: "rejected",
                requiresFinancialAdjustment: true,
              }),
            update: async (input: unknown) => {
              updates.push(input)
              return input
            },
          },
          user: {
            findFirst: async () => ({ id: "user-1" }),
          },
        } as never
      )
    ).rejects.toThrow("Financial adjustment approval is required")

    expect(updates).toHaveLength(0)
  })

  test("reviews financial adjustment requests with audit evidence", async () => {
    const auditCreates: Record<string, unknown>[] = []
    const updates: Record<string, unknown>[] = []

    const supportCase = await reviewSupportCaseFinancialAdjustment(
      {
        actorUserId: "user-1",
        approvalNotes: "Approved for finance correction workflow.",
        approvalStatus: "approved",
        supportCaseId: "support-1",
        tenantId: "tenant-1",
      },
      {
        auditLog: {
          create: async (input: Record<string, unknown>) => {
            auditCreates.push(input)
            return input
          },
        },
        supportCase: {
          findFirst: async () =>
            supportCaseRow({
              financialAdjustmentApprovalStatus: "pending",
              requiresFinancialAdjustment: true,
            }),
          update: async (input: any) => {
            updates.push(input)
            return supportCaseRow({
              ...input.data,
              id: "support-1",
              requiresFinancialAdjustment: true,
            })
          },
        },
        user: {
          findFirst: async () => ({ id: "user-1" }),
        },
      } as never
    )

    expect(supportCase).toMatchObject({
      financialAdjustmentApprovalNotes:
        "Approved for finance correction workflow.",
      financialAdjustmentApprovalStatus: "approved",
      financialAdjustmentApprovedByUserId: "user-1",
      requiresFinancialAdjustment: true,
    })
    expect(updates[0]).toMatchObject({
      data: {
        financialAdjustmentApprovalNotes:
          "Approved for finance correction workflow.",
        financialAdjustmentApprovalStatus: "approved",
        financialAdjustmentApprovedByUserId: "user-1",
      },
      where: {
        id: "support-1",
      },
    })
    expect(auditCreates[0]).toMatchObject({
      data: {
        action: "support.financial_adjustment_reviewed",
        actorUserId: "user-1",
        entityId: "support-1",
        entityType: "SupportCase",
        metadata: {
          nextApprovalStatus: "approved",
          previousApprovalStatus: "pending",
          requiresFinancialAdjustment: true,
        },
        tenantId: "tenant-1",
      },
    })
  })

  test("resolves approved financial adjustment support cases without posting money", async () => {
    const auditCreates: Record<string, unknown>[] = []
    const updates: Record<string, unknown>[] = []

    const supportCase = await updateSupportCaseStatus(
      {
        actorUserId: "user-1",
        resolutionSummary:
          "Payment mistake confirmed; approved finance correction will be handled separately.",
        status: "resolved",
        supportCaseId: "support-1",
        tenantId: "tenant-1",
      },
      {
        auditLog: {
          create: async (input: Record<string, unknown>) => {
            auditCreates.push(input)
            return input
          },
        },
        supportCase: {
          findFirst: async () =>
            supportCaseRow({
              financialAdjustmentApprovalStatus: "approved",
              requiresFinancialAdjustment: true,
            }),
          update: async (input: any) => {
            updates.push(input)
            return supportCaseRow({
              ...input.data,
              financialAdjustmentApprovalStatus: "approved",
              id: "support-1",
              requiresFinancialAdjustment: true,
              status: "resolved",
            })
          },
        },
        user: {
          findFirst: async () => ({ id: "user-1" }),
        },
      } as never
    )

    expect(supportCase).toMatchObject({
      financialAdjustmentApprovalStatus: "approved",
      requiresFinancialAdjustment: true,
      resolutionSummary:
        "Payment mistake confirmed; approved finance correction will be handled separately.",
      status: "resolved",
    })
    expect(updates[0]).toMatchObject({
      data: {
        resolutionSummary:
          "Payment mistake confirmed; approved finance correction will be handled separately.",
        status: "resolved",
      },
      where: {
        id: "support-1",
      },
    })
    expect(auditCreates[0]).toMatchObject({
      data: {
        action: "support.case_status_updated",
        actorUserId: "user-1",
        metadata: {
          financialAdjustmentApprovalStatus: "approved",
          nextStatus: "resolved",
          previousStatus: "open",
          requiresFinancialAdjustment: true,
        },
      },
    })
  })

  test("blocks messages on closed support cases", async () => {
    const messageCreates: unknown[] = []

    await expect(
      addSupportCaseMessage(
        {
          authorUserId: "user-1",
          message: "Please reopen this.",
          supportCaseId: "support-1",
          tenantId: "tenant-1",
        },
        {
          supportCase: {
            findFirst: async () => supportCaseRow({ status: "closed" }),
          },
          supportCaseMessage: {
            create: async (input: unknown) => {
              messageCreates.push(input)
              return input
            },
          },
          user: {
            findFirst: async () => ({ id: "user-1" }),
          },
        } as never
      )
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Closed support cases cannot receive new messages.",
      reportable: false,
    })

    expect(messageCreates).toHaveLength(0)
  })
})
