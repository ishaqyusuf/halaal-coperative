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
 * A privacy request is "done" (ADR-20261116 privacy request completion)
 * end to end through the API: the member asks, the platform operator checks
 * identity, ends access, records what outside services did, then finishes.
 * Contact and ID details go; the cooperative's money records stay under
 * the member's name and number (close-my-account plan, decision 2); the person is emailed; the request is completed with
 * an audit entry. Runs against local Postgres.
 */
const prisma = createPrismaClient()
const runIntegration = prisma ? describe : describe.skip
const slug = `privacy-done-${crypto.randomUUID().slice(0, 8)}`
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

async function requestAndEndAccess(person: Identity, operator: Identity) {
  const asMember = await callerFor(person)
  const request = await asMember.accountPrivacy.request({
    idempotencyKey: crypto.randomUUID(),
    noticeVersion: ACCOUNT_DELETION_NOTICE_VERSION,
    confirmed: true,
  })
  const asOperator = await callerFor(operator)
  await asOperator.accountPrivacy.verify({
    requestId: request.id,
    verificationEvidence: "Called the member on their registered phone.",
  })
  const scope = await asOperator.accountPrivacy.revocationScope({
    requestId: request.id,
  })
  await asOperator.accountPrivacy.revokeAccess({
    requestId: request.id,
    confirmed: true,
    handoverAndRetentionEvidence:
      "Ordinary member; contributions stay in the cooperative's books.",
    reviewedMemberships: scope.memberships.map(({ id, role, tenantId }) => ({
      id,
      role,
      tenantId,
    })),
  })
  return request.id
}

runIntegration("finishing a privacy request", () => {
  let tenantId = ""
  let member: Identity
  let operator: Identity
  let memberId = ""
  let plainCaseId = ""
  let moneyCaseId = ""
  let requestId = ""
  let unreachable: Identity

  beforeAll(async () => {
    const db = prisma!
    const tenant = await db.tenant.create({
      data: { name: "Privacy Done Cooperative", slug, status: "active" },
    })
    tenantId = tenant.id
    const memberUser = await db.user.create({
      data: {
        email: `${slug}-member@onepath.qa.test`,
        fullName: "Zainab Musa",
        phoneNumber: "+2348000000001",
        tenantId,
      },
    })
    const memberMembership = await db.membership.create({
      data: {
        isDefault: true,
        role: "member",
        tenantId,
        userId: memberUser.id,
      },
    })
    member = {
      membershipId: memberMembership.id,
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
    const operatorMembership = await db.membership.create({
      data: {
        isDefault: true,
        role: "tenant_admin",
        tenantId,
        userId: operatorUser.id,
      },
    })
    operator = {
      membershipId: operatorMembership.id,
      tenantId,
      userId: operatorUser.id,
    }
    const unreachableUser = await db.user.create({
      data: {
        // Local QA mail refuses this domain, so the confirmation email fails.
        email: `${slug}-unreachable@example.test`,
        fullName: "Unreachable Member",
        tenantId,
      },
    })
    unreachable = {
      membershipId: (
        await db.membership.create({
          data: {
            isDefault: true,
            role: "member",
            tenantId,
            userId: unreachableUser.id,
          },
        })
      ).id,
      tenantId,
      userId: unreachableUser.id,
    }
    memberId = (
      await db.member.create({
        data: {
          tenantId,
          userId: memberUser.id,
          memberNumber: `${slug}-1`,
          fullName: "Zainab Musa",
          memberType: "individual",
          joinedAt: new Date("2025-01-01T00:00:00.000Z"),
          email: `${slug}-member@onepath.qa.test`,
          phoneNumber: "+2348000000001",
          address: "12 Example Street, Ilorin",
          occupation: "Teacher",
          governmentIdNumber: "NIN-TEST-0001",
          kycDocumentUrl: "https://example.test/id.pdf",
        },
      })
    ).id
    await db.memberDocument.create({
      data: {
        tenantId,
        memberId,
        documentType: "id_card",
        documentUrl: "https://example.test/id-card.pdf",
      },
    })
    await db.contribution.create({
      data: {
        tenantId,
        memberId,
        amount: 5000,
        channel: "transfer",
        postedAt: new Date("2025-02-01T00:00:00.000Z"),
        periodLabel: "February 2025",
        status: "posted",
      },
    })
    plainCaseId = (
      await db.supportCase.create({
        data: {
          tenantId,
          memberId,
          openedByUserId: memberUser.id,
          category: "account_update",
          subject: "Change my phone to +2348000000002",
          description: "My new phone number is +2348000000002.",
          messages: {
            create: {
              tenantId,
              authorUserId: memberUser.id,
              authorType: "member",
              message: "Please call me on +2348000000002.",
            },
          },
        },
      })
    ).id
    moneyCaseId = (
      await db.supportCase.create({
        data: {
          tenantId,
          memberId,
          openedByUserId: memberUser.id,
          category: "account_update",
          subject: "February contribution posted twice",
          description: "I paid once but see two entries.",
          moneyImpactRequested: true,
          messages: {
            create: {
              tenantId,
              authorUserId: memberUser.id,
              authorType: "member",
              message: "Receipt reference TRX-1 shows one payment.",
            },
          },
        },
      })
    ).id
  })

  afterAll(async () => {
    if (prisma && tenantId) {
      await prisma.accountPrivacyRequest.deleteMany({ where: { tenantId } })
      await prisma.auditLog.deleteMany({ where: { tenantId } })
      await prisma.tenant.delete({ where: { id: tenantId } })
    }
    await prisma?.$disconnect()
  })

  test("the member asks and the operator ends their access", async () => {
    requestId = await requestAndEndAccess(member, operator)
  })

  test("finishing needs a note on outside services first", async () => {
    const asOperator = await callerFor(operator)
    await expect(
      asOperator.accountPrivacy.complete({
        requestId,
        confirmed: true,
        retentionSummary: "One contribution kept for the cooperative's audit.",
      })
    ).rejects.toThrow(/outside services and backups/)
    const untouched = await prisma!.member.findUniqueOrThrow({
      where: { id: memberId },
    })
    expect(untouched.phoneNumber).toBe("+2348000000001")
  })

  test("finishing erases contact and ID details, keeps money records under the name and emails the person", async () => {
    const asOperator = await callerFor(operator)
    await asOperator.accountPrivacy.recordProcessingNote({
      requestId,
      category: "external_processors_backups",
      evidence:
        "No processor holds this member's data; backups roll off in 7 days.",
    })
    const result = await asOperator.accountPrivacy.complete({
      requestId,
      confirmed: true,
      retentionSummary: "One contribution kept for the cooperative's audit.",
    })
    expect(result).toMatchObject({ completed: true, confirmation: "email" })

    const db = prisma!
    const profile = await db.member.findUniqueOrThrow({
      where: { id: memberId },
    })
    expect(profile).toMatchObject({
      // Decision 2 of the close-my-account plan: name and number stay.
      fullName: "Zainab Musa",
      memberNumber: `${slug}-1`,
      email: null,
      phoneNumber: null,
      address: null,
      occupation: null,
      governmentIdNumber: null,
      kycDocumentUrl: null,
    })
    expect(await db.memberDocument.count({ where: { memberId } })).toBe(0)
    // The money record stays, pointing at the anonymised profile.
    expect(await db.contribution.count({ where: { memberId } })).toBe(1)

    const plain = await db.supportCase.findUniqueOrThrow({
      where: { id: plainCaseId },
      include: { messages: true },
    })
    expect(plain.subject).toBe("Support case (details removed)")
    expect(plain.description).not.toContain("+234")
    expect(plain.messages.every((m) => !m.message.includes("+234"))).toBe(true)
    const money = await db.supportCase.findUniqueOrThrow({
      where: { id: moneyCaseId },
      include: { messages: true },
    })
    expect(money.subject).toBe("February contribution posted twice")
    expect(money.messages[0]?.message).toContain("TRX-1")

    const user = await db.user.findUniqueOrThrow({
      where: { id: member.userId },
    })
    expect(user.email).not.toContain(slug)
    expect(user.deletedAt).not.toBeNull()

    const done = await db.accountPrivacyRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { supportCase: true },
    })
    expect(done.status).toBe("completed")
    expect(done.completedAt).not.toBeNull()
    expect(done.completionSummary).toContain("One contribution kept")
    expect(JSON.stringify(done.processingEvidence)).not.toContain(
      `${slug}-member@onepath.qa.test`
    )
    expect(done.processingEvidence).toMatchObject({
      personalDetails: "erased",
      completionNotification: "email_sent",
      completedWithinResponseWindow: true,
    })
    expect(done.supportCase?.status).toBe("closed")

    const audits = await db.auditLog.findMany({
      where: { entityId: requestId },
      select: { action: true },
    })
    expect(audits.map((audit) => audit.action)).toEqual(
      expect.arrayContaining([
        "privacy.personal_data_erased",
        "privacy.request_completed",
      ])
    )
    // No audit row anywhere keeps the person's real email address.
    const anyAudit = await db.auditLog.findMany({ where: { tenantId } })
    expect(JSON.stringify(anyAudit)).not.toContain(
      `${slug}-member@onepath.qa.test`
    )
  })

  test("a finished request cannot be finished again", async () => {
    const asOperator = await callerFor(operator)
    await expect(
      asOperator.accountPrivacy.complete({
        requestId,
        confirmed: true,
        retentionSummary: "One contribution kept for the cooperative's audit.",
      })
    ).rejects.toThrow()
    const inventory = await asOperator.accountPrivacy.processingInventory({
      requestId,
    })
    expect(inventory).toMatchObject({
      erasureComplete: true,
      externalProcessorsReviewed: true,
      completionNotification: "email_sent",
    })
  })

  test("a failed confirmation email leaves the request open until the operator records another way", async () => {
    const otherId = await requestAndEndAccess(unreachable, operator)
    const asOperator = await callerFor(operator)
    await asOperator.accountPrivacy.recordProcessingNote({
      requestId: otherId,
      category: "external_processors_backups",
      evidence:
        "No processor holds this member's data; backups roll off in 7 days.",
    })
    const first = await asOperator.accountPrivacy.complete({
      requestId: otherId,
      confirmed: true,
      retentionSummary: "Nothing financial was recorded for this member.",
    })
    expect(first).toEqual({ completed: false, confirmation: "email_failed" })
    const open = await prisma!.accountPrivacyRequest.findUniqueOrThrow({
      where: { id: otherId },
    })
    expect(open.status).toBe("processing")
    expect(open.processingEvidence).toMatchObject({
      personalDetails: "erased",
      completionNotification: "failed",
    })

    const second = await asOperator.accountPrivacy.complete({
      requestId: otherId,
      confirmed: true,
      retentionSummary: "Nothing financial was recorded for this member.",
      operatorConfirmationNote:
        "Told them by phone on 16 Nov; their email address no longer works.",
    })
    expect(second).toMatchObject({ completed: true, confirmation: "operator" })
    const done = await prisma!.accountPrivacyRequest.findUniqueOrThrow({
      where: { id: otherId },
    })
    expect(done.status).toBe("completed")
    expect(done.processingEvidence).toMatchObject({
      completionNotification: "operator_recorded",
    })
    expect(JSON.stringify(done.processingEvidence)).not.toContain(
      `${slug}-unreachable@example.test`
    )
    const audits = await prisma!.auditLog.findMany({
      where: { entityId: otherId },
      select: { action: true },
    })
    expect(audits.map((audit) => audit.action)).toEqual(
      expect.arrayContaining([
        "privacy.completion_notice_failed",
        "privacy.request_completed",
      ])
    )
  })
})
