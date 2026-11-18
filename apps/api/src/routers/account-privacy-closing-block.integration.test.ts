import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionToken,
  platformSessionScope,
} from "@halaalvest/auth"
import {
  ACCOUNT_DELETION_NOTICE_VERSION,
  createPrismaClient,
} from "@halaalvest/db"

import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "./_app"

/**
 * Closing an account is like closing a bank account (owner, 18 Nov 2026):
 * the cooperative settles the member's money first. The operator sees the
 * money position, and the server refuses to close the login until it is
 * zero or the cooperative has marked the member exited. Local Postgres.
 */
const prisma = createPrismaClient()
const runIntegration = prisma ? describe : describe.skip
const slug = `closing-block-${crypto.randomUUID().slice(0, 8)}`
const createCaller = createCallerFactory(appRouter)

type Identity = { membershipId: string; tenantId: string; userId: string }

async function callerFor(identity: Identity) {
  const token = await createSignedSessionToken({
    ...identity,
    scope: platformSessionScope,
  })
  return createCaller(
    await buildRequestContext(
      new Headers({
        authorization: `Bearer ${token}`,
        host: "api.halaalvest.localhost",
      })
    )
  )
}

runIntegration("closing a login waits for the cooperative to settle", () => {
  let tenantId = ""
  let member: Identity
  let operator: Identity
  let memberId = ""
  let loanRequestId = ""
  let requestId = ""

  beforeAll(async () => {
    const db = prisma!
    tenantId = (
      await db.tenant.create({
        data: { name: "Closing Block Cooperative", slug, status: "active" },
      })
    ).id
    const memberUser = await db.user.create({
      data: {
        email: `${slug}-member@onepath.qa.test`,
        fullName: "Aisha Bello",
        tenantId,
      },
    })
    member = {
      membershipId: (
        await db.membership.create({
          data: {
            isDefault: true,
            role: "member",
            tenantId,
            userId: memberUser.id,
          },
        })
      ).id,
      tenantId,
      userId: memberUser.id,
    }
    const operatorUser = await db.user.create({
      data: {
        email: `${slug}-operator@example.test`,
        fullName: "Platform Operator",
        isPlatformOwner: true,
        tenantId,
      },
    })
    operator = {
      membershipId: (
        await db.membership.create({
          data: {
            isDefault: true,
            role: "tenant_admin",
            tenantId,
            userId: operatorUser.id,
          },
        })
      ).id,
      tenantId,
      userId: operatorUser.id,
    }
    memberId = (
      await db.member.create({
        data: {
          tenantId,
          userId: memberUser.id,
          memberNumber: `${slug}-1`,
          fullName: "Aisha Bello",
          memberType: "individual",
          joinedAt: new Date("2025-01-01T00:00:00.000Z"),
          totalSavingsSnapshot: 5000,
        },
      })
    ).id
    // Aisha guarantees another member's loan that is still under review.
    const borrowerId = (
      await db.member.create({
        data: {
          tenantId,
          memberNumber: `${slug}-2`,
          fullName: "Borrowing Member",
          memberType: "individual",
          joinedAt: new Date("2025-01-01T00:00:00.000Z"),
        },
      })
    ).id
    const product = await db.loanProduct.create({
      data: {
        tenantId,
        name: "Normal",
        loanType: "normal",
        termMonths: 12,
        maxSavingsMultiple: 2,
      },
    })
    loanRequestId = (
      await db.loanRequest.create({
        data: {
          tenantId,
          memberId: borrowerId,
          loanProductId: product.id,
          createdByUserId: operatorUser.id,
          requestedAmount: 20000,
          requestedTermMonths: 12,
          estimatedMonthlyServicing: 1667,
          eligibleAmountSnapshot: 20000,
          availablePoolSnapshot: 100000,
          requestedAt: new Date(),
          status: "under_review",
        },
      })
    ).id
    await db.loanGuarantorApproval.create({
      data: {
        tenantId,
        loanRequestId,
        guarantorMemberId: memberId,
        requestedByUserId: operatorUser.id,
        respondedByUserId: memberUser.id,
        status: "approved",
        requestedAt: new Date(),
        respondedAt: new Date(),
      },
    })
  })

  afterAll(async () => {
    if (prisma && tenantId) {
      await prisma.loanGuarantorApproval.deleteMany({ where: { tenantId } })
      await prisma.loanRequest.deleteMany({ where: { tenantId } })
      await prisma.loanProduct.deleteMany({ where: { tenantId } })
      await prisma.accountPrivacyRequest.deleteMany({ where: { tenantId } })
      await prisma.auditLog.deleteMany({ where: { tenantId } })
      await prisma.tenant.delete({ where: { id: tenantId } })
    }
    await prisma?.$disconnect()
  })

  async function closeLogin() {
    const asOperator = await callerFor(operator)
    const scope = await asOperator.accountPrivacy.revocationScope({
      requestId,
    })
    return asOperator.accountPrivacy.revokeAccess({
      requestId,
      confirmed: true,
      handoverAndRetentionEvidence:
        "Ordinary member; money records stay in the cooperative's books.",
      reviewedMemberships: scope.memberships.map(({ id, role, tenantId }) => ({
        id,
        role,
        tenantId,
      })),
    })
  }

  test("the operator sees what the cooperative still has to settle", async () => {
    const asMember = await callerFor(member)
    requestId = (
      await asMember.accountPrivacy.request({
        idempotencyKey: crypto.randomUUID(),
        noticeVersion: ACCOUNT_DELETION_NOTICE_VERSION,
        confirmed: true,
      })
    ).id
    const asOperator = await callerFor(operator)
    await asOperator.accountPrivacy.verify({
      requestId,
      verificationEvidence: "Called the member on their registered phone.",
    })
    const scope = await asOperator.accountPrivacy.revocationScope({
      requestId,
    })
    expect(scope.moneyPosition.canCloseLogin).toBe(false)
    const [position] = scope.moneyPosition.members
    expect(position).toMatchObject({
      memberId,
      tenantName: "Closing Block Cooperative",
      exited: false,
      settled: false,
    })
    const outstanding = position!.lines.filter((line) => line.outstanding)
    expect(outstanding).toEqual([
      expect.objectContaining({ kind: "savings", amount: 5000 }),
      expect.objectContaining({ kind: "guarantees", count: 1 }),
    ])
  })

  test("closing the login is refused while money is outstanding", async () => {
    await expect(closeLogin()).rejects.toThrow(
      /must settle their money.*savings ₦5,000\.00.*1 active guarantee/
    )
    const user = await prisma!.user.findUniqueOrThrow({
      where: { id: member.userId },
    })
    expect(user.deletedAt).toBeNull()
  })

  test("a guarantee on a rejected loan request no longer counts", async () => {
    await prisma!.loanRequest.update({
      where: { id: loanRequestId },
      data: { status: "rejected" },
    })
    const scope = await (
      await callerFor(operator)
    ).accountPrivacy.revocationScope({ requestId })
    expect(
      scope.moneyPosition.members[0]!.lines.find(
        (line) => line.kind === "guarantees"
      )
    ).toMatchObject({ count: 0, outstanding: false })
    await expect(closeLogin()).rejects.toThrow(/savings ₦5,000\.00/)
  })

  test("once the cooperative marks the member exited, the login closes", async () => {
    await prisma!.member.update({
      where: { id: memberId },
      data: { status: "exited", exitedAt: new Date() },
    })
    expect(await closeLogin()).toEqual({
      accessRevoked: true,
      erasureComplete: false,
    })
    const request = await prisma!.accountPrivacyRequest.findUniqueOrThrow({
      where: { id: requestId },
    })
    expect(request.processingEvidence).toMatchObject({
      cooperativeMoneyCheck: [
        { tenantId, memberId, result: "member_exited" },
      ],
    })
    // Money records stay.
    const kept = await prisma!.member.findUniqueOrThrow({
      where: { id: memberId },
    })
    expect(Number(kept.totalSavingsSnapshot)).toBe(5000)
  })
})
