import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { money, routeIntent } from "@halaalvest/assistant"
import {
  createAssistantConversation,
  createAssistantProposal,
  createDashboardEvidenceUpload,
  createPrismaClient,
  finalizeDashboardEvidenceUpload,
  getPaymentReceiptMemberAudienceSettings,
  updatePaymentReceiptMemberAudience,
} from "@halaalvest/db"
import type { AssistantPrincipal } from "./principal"
import { confirmProposal, startReceiptSubmission } from "./proposals"

const db = createPrismaClient()
const databaseUrl = process.env.HALAALVEST_DATABASE_URL
const isLocal = databaseUrl
  ? ["localhost", "127.0.0.1", "[::1]"].includes(new URL(databaseUrl).hostname)
  : false
const run =
  db && isLocal && process.env.RUN_LOCAL_DB_INTEGRATION === "1"
    ? describe
    : describe.skip

run("assistant financial confirmation policies", () => {
  let principal: AssistantPrincipal
  let memberId: string
  let tenantId: string
  let adminId: string

  beforeAll(async () => {
    const slug = `assistant-policy-it-${crypto.randomUUID().slice(0, 8)}`
    const tenant = await db!.tenant.create({
      data: {
        name: "Assistant Policy Test Cooperative",
        slug,
        status: "active",
        initialMigrationStatus: "live_operations",
        startDate: new Date("2025-01-01T00:00:00Z"),
      },
    })
    tenantId = tenant.id
    const user = await db!.user.create({
      data: {
        tenantId,
        email: `${slug}@example.test`,
        fullName: "Assistant Policy Test Member",
        passwordHash: "test-only",
      },
    })
    const membership = await db!.membership.create({
      data: { tenantId, userId: user.id, role: "member" },
    })
    const admin = await db!.user.create({
      data: {
        tenantId,
        email: `${slug}-admin@example.test`,
        fullName: "Assistant Policy Test Admin",
        passwordHash: "test-only",
        memberships: { create: { tenantId, role: "tenant_admin" } },
      },
    })
    adminId = admin.id
    const member = await db!.member.create({
      data: {
        tenantId,
        userId: user.id,
        fullName: user.fullName,
        memberNumber: "IT-0001",
        memberType: "individual",
        joinedAt: new Date(),
        status: "active",
        kycStatus: "verified",
      },
    })
    memberId = member.id
    principal = {
      tenantId,
      tenantName: tenant.name,
      userId: user.id,
      membershipId: membership.id,
      role: "member",
      channel: "web",
      channelLinkId: null,
    }
    await db!.tenantOperationProfile.create({
      data: {
        tenantId,
        serviceSettings: {
          create: [
            {
              tenantId,
              serviceKey: "payment_receipts",
              accessMode: "member_self_service",
            },
            {
              tenantId,
              serviceKey: "support_cases",
              accessMode: "member_self_service",
            },
          ],
        },
      },
    })
    await db!.tenantPolicy.create({ data: { tenantId } })
  })

  afterAll(async () => {
    if (tenantId) {
      await db!.$transaction([
        db!.dashboardEvidenceUpload.deleteMany({ where: { tenantId } }),
        db!.tenant.delete({ where: { id: tenantId } }),
      ])
    }
    await db?.$disconnect()
  })

  async function stageReceipt(
    paymentReference: string,
    evidenceUploadId: string | null = null
  ) {
    const conversation = await createAssistantConversation(principal)
    const now = new Date()
    return createAssistantProposal({
      ...principal,
      conversationId: conversation.id,
      capabilityId: "M04",
      kind: "receipt-submission",
      status: "review",
      fields: {
        kind: "receipt-submission",
        amount: money(100),
        paidOn: now.toISOString().slice(0, 10),
        paymentReference,
        allocations: [
          {
            targetId: "special_savings",
            label: "Special savings",
            amount: money(100),
          },
        ],
        evidenceUploadId,
      },
      expiresAt: new Date(now.getTime() + 60_000),
    })
  }

  test("rechecks required payment proof before saving a receipt", async () => {
    const paymentReference = "QA-PROOF-100"
    const draft = await stageReceipt(paymentReference)
    // Tightening the policy after the draft was prepared must still apply.
    await db!.tenantPolicy.update({
      where: { tenantId },
      data: { paymentReceiptProofRequired: true },
    })
    const result = await confirmProposal(principal, {
      proposalId: draft.id,
      revision: draft.revision,
      confirmationKey: crypto.randomUUID(),
    })
    expect(result).toMatchObject({ outcome: "not_saved", reference: null })
    expect(result.message).toContain("requires proof of payment")
    expect(
      await db!.memberPaymentReceipt.count({
        where: { tenantId, memberId, paymentReference },
      })
    ).toBe(0)
  })

  test("only accepts a real, owned proof upload on a receipt draft", async () => {
    const unregisteredReference = "QA-PROOF-101"
    const unregistered = await stageReceipt(
      unregisteredReference,
      crypto.randomUUID()
    )
    const denied = await confirmProposal(principal, {
      proposalId: unregistered.id,
      revision: unregistered.revision,
      confirmationKey: crypto.randomUUID(),
    })
    expect(denied).toMatchObject({ outcome: "not_saved", reference: null })
    expect(
      await db!.memberPaymentReceipt.count({
        where: { tenantId, memberId, paymentReference: unregisteredReference },
      })
    ).toBe(0)

    const evidence = {
      id: crypto.randomUUID(),
      tenantId,
      uploaderUserId: principal.userId,
      purpose: "payment_receipt_proof",
      contentType: "application/pdf",
    }
    await createDashboardEvidenceUpload({
      ...evidence,
      originalName: "synthetic-proof.pdf",
      declaredSize: 100,
    })
    await finalizeDashboardEvidenceUpload({ ...evidence, storedSize: 100 })
    const paymentReference = "QA-PROOF-102"
    const draft = await stageReceipt(paymentReference, evidence.id)
    const saved = await confirmProposal(principal, {
      proposalId: draft.id,
      revision: draft.revision,
      confirmationKey: crypto.randomUUID(),
    })
    expect(saved.outcome).toBe("saved")
    const receipt = await db!.memberPaymentReceipt.findFirst({
      where: { tenantId, memberId, paymentReference },
      select: { id: true, status: true },
    })
    expect(receipt?.status).toBe("submitted")
    const claimed = await db!.dashboardEvidenceUpload.findUnique({
      where: { id: evidence.id },
    })
    expect(claimed?.linkedEntityId).toBe(receipt?.id)
  })

  test("rechecks support self-service before opening a reviewed payment case", async () => {
    const conversation = await createAssistantConversation(principal)
    const draft = await createAssistantProposal({
      ...principal,
      conversationId: conversation.id,
      capabilityId: "M05",
      kind: "payment-request",
      status: "review",
      fields: {
        kind: "payment-request",
        purpose: "special_savings_refund",
        amount: money(100),
        note: null,
      },
      expiresAt: new Date(Date.now() + 60_000),
    })
    await db!.tenantServiceSetting.update({
      where: { tenantId_serviceKey: { tenantId, serviceKey: "support_cases" } },
      data: { accessMode: "office_only" },
    })
    const result = await confirmProposal(
      { ...principal, channel: "native" },
      {
        proposalId: draft.id,
        revision: draft.revision,
        confirmationKey: crypto.randomUUID(),
      }
    )
    expect(result).toMatchObject({ outcome: "not_saved", reference: null })
    expect(result.message).toContain("Support requests are closed")
    expect(await db!.supportCase.count({ where: { tenantId, memberId } })).toBe(
      0
    )
  })

  test("blocks a receipt draft and its confirmation after selected access is removed", async () => {
    await updatePaymentReceiptMemberAudience({
      tenantId,
      actorUserId: adminId,
      audience: "selected_members",
      memberIds: [memberId],
      expectedRevision: 0,
      changeReason: "QA selected-member rollout",
    })
    const selected = await getPaymentReceiptMemberAudienceSettings(tenantId)
    const conversation = await createAssistantConversation(principal)
    const paymentReference = "QA-SELECTED-100"
    const { candidates } = routeIntent(
      `I paid ₦100 today, reference ${paymentReference}`,
      "member"
    )
    const draft = await startReceiptSubmission(
      principal,
      conversation.id,
      candidates
    )
    if (draft.kind !== "proposal")
      throw new Error("Selected member could not start a receipt.")

    await updatePaymentReceiptMemberAudience({
      tenantId,
      actorUserId: adminId,
      audience: "selected_members",
      memberIds: [],
      expectedRevision: selected.revision,
      changeReason: "QA selected-member removal",
    })
    const result = await confirmProposal(principal, {
      proposalId: draft.proposal.id,
      revision: draft.proposal.revision,
      confirmationKey: crypto.randomUUID(),
    })
    expect(result).toMatchObject({ outcome: "not_saved", reference: null })
    expect(result.message).toContain("cannot submit receipts online")
    expect(
      await db!.memberPaymentReceipt.count({
        where: { tenantId, memberId, paymentReference },
      })
    ).toBe(0)
    expect(
      await startReceiptSubmission(principal, conversation.id, candidates)
    ).toMatchObject({ kind: "answer", answer: { tone: "unavailable" } })
  })
})
