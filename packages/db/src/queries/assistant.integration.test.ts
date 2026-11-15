import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { createPrismaClient } from "../prisma"
import {
  beginAssistantTurn,
  claimAssistantProposalConfirmation,
  completeAssistantTurn,
  createAssistantConversation,
  createAssistantProposal,
  listAssistantConversations,
  readAssistantConversation,
  readAssistantProposal,
  resolveAssistantLink,
  reviseAssistantProposal,
  saveAssistantProposalResult,
  searchAssistantMembers,
} from "./assistant"

/**
 * Shared-boundary checks from plan §6: tenant/member isolation, replayed
 * turns, and tampered/stale/expired/replayed confirmation.
 */
const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const slug = `assistant-it-${crypto.randomUUID().slice(0, 8)}`
const tenants: string[] = []
let owner = { tenantId: "", userId: "", membershipId: "" }
let otherTenant = { tenantId: "", userId: "", membershipId: "" }

async function seedTenant(suffix: string) {
  const tenant = await db!.tenant.create({
    data: { name: `Assistant ${suffix}`, slug: `${slug}-${suffix}`, status: "active" },
  })
  tenants.push(tenant.id)
  const user = await db!.user.create({
    data: {
      email: `${slug}-${suffix}@example.test`,
      fullName: `Assistant ${suffix}`,
      passwordHash: "test-only",
      tenantId: tenant.id,
    },
  })
  const membership = await db!.membership.create({
    data: { tenantId: tenant.id, userId: user.id, role: "finance_officer" },
  })
  await db!.member.create({
    data: {
      fullName: `Aisha ${suffix}`,
      joinedAt: new Date("2026-01-01T00:00:00.000Z"),
      memberNumber: `HV-${suffix === "a" ? "1048" : "2048"}`,
      memberType: "individual",
      tenantId: tenant.id,
    },
  })
  return { tenantId: tenant.id, userId: user.id, membershipId: membership.id }
}

run("assistant persistence boundary", () => {
  beforeAll(async () => {
    owner = await seedTenant("a")
    otherTenant = await seedTenant("b")
  })

  afterAll(async () => {
    if (db && tenants.length) await db.tenant.deleteMany({ where: { id: { in: tenants } } })
    await db?.$disconnect()
  })

  it("isolates chats and member search by tenant and owner", async () => {
    const conversation = await createAssistantConversation({ ...owner, channel: "web" })
    expect(
      await readAssistantConversation({ ...otherTenant, conversationId: conversation.id })
    ).toBeNull()
    expect(
      await readAssistantConversation({
        ...owner,
        membershipId: otherTenant.membershipId,
        conversationId: conversation.id,
      })
    ).toBeNull()
    const list = await listAssistantConversations({ ...otherTenant, channel: "web" })
    expect(list.items.find((item) => item.id === conversation.id)).toBeUndefined()

    const found = await searchAssistantMembers({ tenantId: otherTenant.tenantId, query: "HV-1048" })
    expect(found.items).toHaveLength(0)
    const own = await searchAssistantMembers({ tenantId: owner.tenantId, query: "hv-1048" })
    expect(own.items.map((item) => item.memberNumber)).toEqual(["HV-1048"])
  })

  it("replays a turn by requestId and refuses another tenant's chat", async () => {
    const conversation = await createAssistantConversation({ ...owner, channel: "web" })
    const input = {
      ...owner,
      conversationId: conversation.id,
      requestId: "req-replay-0001",
      userParts: [{ type: "text", text: "hello" }],
      title: null,
    }
    const first = await beginAssistantTurn(input)
    expect(first.kind).toBe("started")
    if (first.kind !== "started") throw new Error("unreachable")
    await completeAssistantTurn({
      turnId: first.turnId,
      tenantId: owner.tenantId,
      conversationId: conversation.id,
      status: "completed",
      replyParts: [{ type: "text", text: "hi" }],
      capabilityId: "X01",
      provider: "deterministic",
      model: null,
      durationMs: 1,
    })
    const replay = await beginAssistantTurn(input)
    expect(replay.kind).toBe("replay")
    if (replay.kind !== "replay") throw new Error("unreachable")
    expect(replay.reply?.parts).toEqual([{ type: "text", text: "hi" }])

    await expect(
      beginAssistantTurn({ ...input, ...otherTenant, requestId: "req-other-0001" })
    ).rejects.toThrow("Chat not found.")
  })

  it("confirms only the exact reviewed revision, once", async () => {
    const conversation = await createAssistantConversation({ ...owner, channel: "web" })
    const fields = { kind: "payment-request", purpose: "money_owed", amount: null, note: null }
    const proposal = await createAssistantProposal({
      ...owner,
      conversationId: conversation.id,
      capabilityId: "M05",
      kind: "payment-request",
      status: "review",
      fields,
      expiresAt: new Date(Date.now() + 60_000),
    })

    // Another tenant's actor cannot read or claim it.
    expect(await readAssistantProposal({ ...otherTenant, proposalId: proposal.id })).toBeNull()
    await expect(
      claimAssistantProposalConfirmation({
        ...otherTenant,
        proposalId: proposal.id,
        revision: 1,
        confirmationKey: "confirm-other-1",
      })
    ).rejects.toThrow()

    // An edit invalidates the old review.
    await reviseAssistantProposal({
      ...owner,
      proposalId: proposal.id,
      expectedRevision: 1,
      fields: { ...fields, note: "edited" },
      status: "review",
      expiresAt: new Date(Date.now() + 60_000),
    })
    const stale = await claimAssistantProposalConfirmation({
      ...owner,
      proposalId: proposal.id,
      revision: 1,
      confirmationKey: "confirm-key-0001",
    })
    expect(stale).toEqual({ kind: "refused", reason: "stale" })

    const [a, b] = await Promise.all([
      claimAssistantProposalConfirmation({
        ...owner,
        proposalId: proposal.id,
        revision: 2,
        confirmationKey: "confirm-key-0002",
      }),
      claimAssistantProposalConfirmation({
        ...owner,
        proposalId: proposal.id,
        revision: 2,
        confirmationKey: "confirm-key-0003",
      }),
    ])
    const kinds = [a.kind, b.kind].sort()
    expect(kinds).toEqual(["claimed", "refused"])
    const winner = a.kind === "claimed" ? "confirm-key-0002" : "confirm-key-0003"

    const result = { outcome: "saved", reference: "CASE-1" }
    await saveAssistantProposalResult({
      proposalId: proposal.id,
      confirmationKey: winner,
      outcome: "saved",
      result,
      resultReference: "CASE-1",
    })
    const retry = await claimAssistantProposalConfirmation({
      ...owner,
      proposalId: proposal.id,
      revision: 2,
      confirmationKey: winner,
    })
    expect(retry.kind).toBe("already")
    if (retry.kind === "already") expect(retry.proposal.result).toEqual(result)
  })

  it("refuses an expired review", async () => {
    const conversation = await createAssistantConversation({ ...owner, channel: "web" })
    const proposal = await createAssistantProposal({
      ...owner,
      conversationId: conversation.id,
      capabilityId: "M05",
      kind: "payment-request",
      status: "review",
      fields: { kind: "payment-request", purpose: "money_owed", amount: null, note: null },
      expiresAt: new Date(Date.now() - 1_000),
    })
    const claim = await claimAssistantProposalConfirmation({
      ...owner,
      proposalId: proposal.id,
      revision: 1,
      confirmationKey: "confirm-expired-1",
    })
    expect(claim).toEqual({ kind: "refused", reason: "expired" })
  })
  it("resolves saved-answer and draft links only for the chat's owner", async () => {
    const conversation = await createAssistantConversation({ ...owner, channel: "telegram" })
    const begun = await beginAssistantTurn({
      ...owner,
      conversationId: conversation.id,
      requestId: "req-link-0001",
      userParts: [{ type: "text", text: "hello" }],
      title: null,
    })
    if (begun.kind !== "started") throw new Error("expected a new turn")
    const reply = await completeAssistantTurn({
      turnId: begun.turnId,
      tenantId: owner.tenantId,
      conversationId: conversation.id,
      status: "completed",
      replyParts: [{ type: "text", text: "hi" }],
      capabilityId: null,
      provider: "deterministic",
      model: null,
      errorCode: null,
      durationMs: 1,
    })
    const proposal = await createAssistantProposal({
      ...owner,
      conversationId: conversation.id,
      capabilityId: "M05",
      kind: "payment-request",
      status: "review",
      fields: { kind: "payment-request", purpose: "money_owed", amount: null, note: null },
      expiresAt: new Date(Date.now() + 60_000),
    })

    // A messaging chat's answer opens for the same person in the app.
    expect(await resolveAssistantLink({ ...owner, target: { kind: "message", id: reply.id } })).toEqual({
      conversationId: conversation.id,
      channel: "telegram",
      messageId: reply.id,
      proposalId: null,
    })
    expect(
      (await resolveAssistantLink({ ...owner, target: { kind: "proposal", id: proposal.id } }))?.proposalId
    ).toBe(proposal.id)
    // Another cooperative, or another membership in the same one, gets nothing.
    expect(await resolveAssistantLink({ ...otherTenant, target: { kind: "message", id: reply.id } })).toBeNull()
    expect(
      await resolveAssistantLink({
        ...owner,
        membershipId: otherTenant.membershipId,
        target: { kind: "proposal", id: proposal.id },
      })
    ).toBeNull()
  })
})
