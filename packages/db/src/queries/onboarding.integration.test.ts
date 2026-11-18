import { afterAll, describe, expect, test } from "bun:test"
import { buildTenantSiteHostname } from "@halaalvest/utils"
import { getPublishedLegalBundle } from "../legal-publication"
import { createPrismaClient } from "../prisma"
import { getMemberSignupLinkAccess } from "./member-signup-links"
import {
  createTenantWorkspaceBootstrap,
  getTenantOnboardingState,
} from "./onboarding"
import {
  defaultTenantServiceAccessModes,
  tenantServiceKeys,
} from "./operation-profile"
import { checkTenantSignupAvailability } from "./tenants"

const prisma =
  process.env.RUN_ONBOARDING_DB_TESTS === "1" && createPrismaClient()
const integration = prisma ? describe : describe.skip
const slug = `onboarding-db-${crypto.randomUUID().slice(0, 8)}`

integration("workspace bootstrap and onboarding reads", () => {
  afterAll(async () => {
    if (!prisma) return
    await prisma.tenant.deleteMany({
      where: { slug: { in: [slug, `${slug}-domain-holder`] } },
    })
    await prisma.$disconnect()
  })

  test("creates defaults and legal evidence atomically, and reads tenant-scoped status", async () => {
    if (!prisma) throw new Error("Database integration test is not configured.")

    const input = {
      cooperativeCodePrefix: "ZXQON",
      name: `Cooperative ${slug}`,
      ownerEmail: `${slug}@example.test`,
      ownerFullName: "Fixture Owner",
      ownerMemberNumber: "ZXQON-0001",
      slug,
      legalAcknowledgement: {
        confirmed: true as const,
        documents: getPublishedLegalBundle().documents.map(
          ({ documentType, documentVersion, contentHash }) => ({
            documentType,
            documentVersion,
            contentHash,
          })
        ),
      },
    }
    const availabilityInput = {
      cooperativeName: input.name.toUpperCase(),
      cooperativeCodePrefix: input.cooperativeCodePrefix.toLowerCase(),
      workspaceSlug: input.slug,
    }
    const readAvailability = () =>
      checkTenantSignupAvailability(availabilityInput)
    expect(await readAvailability()).toMatchObject({
      cooperativeCodePrefix: { available: true, normalized: "ZXQON" },
      cooperativeName: { available: true },
      workspaceSlug: {
        available: true,
        hostname: buildTenantSiteHostname(slug),
      },
    })

    const other = await prisma.tenant.create({
      data: { name: "Domain holder", slug: `${slug}-domain-holder` },
    })
    const claimedHostname = await prisma.tenantDomain.create({
      data: {
        hostname: buildTenantSiteHostname(slug),
        tenantId: other.id,
        kind: "site",
      },
    })
    expect(await readAvailability()).toMatchObject({
      cooperativeCodePrefix: { available: true },
      cooperativeName: { available: true },
      workspaceSlug: { available: false },
    })
    await expect(createTenantWorkspaceBootstrap(input)).rejects.toMatchObject({
      code: "P2002",
    })
    expect(await prisma.tenant.findUnique({ where: { slug } })).toBeNull()
    await prisma.tenantDomain.delete({ where: { id: claimedHostname.id } })

    const workspace = await createTenantWorkspaceBootstrap(input)
    const tenantId = workspace.tenant.id
    const userId = workspace.ownerUserId
    expect(workspace.onboarding.completedStepCount).toBe(6)
    expect(await getTenantOnboardingState(tenantId)).toEqual(
      workspace.onboarding
    )
    expect(await getTenantOnboardingState(crypto.randomUUID())).toMatchObject({
      completedStepCount: 0,
      primarySiteHostname: null,
    })
    expect(await readAvailability()).toMatchObject({
      cooperativeCodePrefix: { available: false },
      cooperativeName: { available: false },
      workspaceSlug: { available: false },
    })
    await expect(createTenantWorkspaceBootstrap(input)).rejects.toThrow(
      "That workspace subdomain is not available."
    )
    expect(
      await prisma.legalAcceptance.count({ where: { tenantId, userId } })
    ).toBe(2)
    expect(
      await prisma.auditLog.count({
        where: { tenantId, action: "legal.platform_documents_acknowledged" },
      })
    ).toBe(1)
    expect(
      await prisma.member.count({
        where: { tenantId, userId, memberNumber: input.ownerMemberNumber },
      })
    ).toBe(1)
    expect(await prisma.ledgerAccount.count({ where: { tenantId } })).toBe(7)
    const settings = await prisma.tenantServiceSetting.findMany({
      where: { tenantId },
    })
    expect(settings).toHaveLength(tenantServiceKeys.length)
    expect(
      Object.fromEntries(
        settings.map(({ serviceKey, accessMode }) => [serviceKey, accessMode])
      )
    ).toEqual(defaultTenantServiceAccessModes)

    const link = await prisma.memberSignupLink.create({
      data: { maxSignups: 1, name: "Fixture link", tenantId },
    })
    await prisma.memberOnboardingRequest.create({
      data: {
        email: input.ownerEmail,
        fullName: input.ownerFullName,
        memberNumber: input.ownerMemberNumber,
        signupLinkId: link.id,
        tenantId,
        userId,
      },
    })
    const linkAccess = {
      linkId: link.id,
      tenantId,
      tokenVersion: link.tokenVersion,
    }
    expect(await getMemberSignupLinkAccess(linkAccess)).toMatchObject({
      currentSignupCount: 1,
      maxSignups: 1,
    })
    expect(
      await getMemberSignupLinkAccess({ ...linkAccess, tenantId: other.id })
    ).toBeNull()
    expect(
      await getMemberSignupLinkAccess({ ...linkAccess, tokenVersion: 0 })
    ).toBeNull()

    await prisma.chargeDefinition.create({
      data: {
        tenantId,
        name: "Monthly levy",
        code: "levy",
        kind: "fixed",
        amount: 500,
      },
    })
    expect(await getTenantOnboardingState(tenantId)).toMatchObject({
      status: "complete",
      completedStepCount: 7,
    })
  })
})
