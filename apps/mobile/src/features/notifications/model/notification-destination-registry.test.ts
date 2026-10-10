import { describe, expect, test } from "bun:test"
import type { MobileProfile } from "@/lib/session-store"
import { resolveNotificationDestination } from "./notification-destination-registry"

function profile(
  role: "member" | "admin",
  cooperativeRole: MobileProfile["cooperativeRole"]
): MobileProfile {
  return {
    activeMembershipId: `${role}-membership`,
    cooperativeRole,
    role,
    tenant: {
      branding: {
        accentColor: null,
        logoUrl: null,
        mark: "HC",
        primaryColor: null,
      },
      currencyCode: "NGN",
      id: "tenant-1",
      name: "HalaalVest Cooperative",
      slug: "halaalvest",
      timezone: "Africa/Lagos",
    },
    token: `${role}-token`,
    user: {
      email: `${role}@example.com`,
      id: `${role}-1`,
      name: role === "member" ? "Yusuf Member" : "Ishaq Admin",
    },
  }
}

const memberProfile = profile("member", "member")
const payload = {
  action: "open_receipts",
  intendedRole: "member",
  notificationId: "notification-1",
  tenantId: memberProfile.tenant.id,
  version: 1,
}

describe("notification destination registry", () => {
  test("maps a valid member action to an allowlisted route", () => {
    expect(resolveNotificationDestination(payload, memberProfile)).toMatchObject({
      href: "/(member)/receipts",
      ok: true,
    })
  })

  test("preserves a validated record context in the allowlisted route", () => {
    expect(
      resolveNotificationDestination(
        { ...payload, entityId: "receipt-123" },
        memberProfile
      )
    ).toMatchObject({
      href: "/(member)/receipts?notificationEntityId=receipt-123",
      ok: true,
    })
  })

  test("maps specialized cooperative-finance actions without collapsing context", () => {
    expect(
      resolveNotificationDestination(
        { ...payload, action: "open_procurement", entityId: "request-1" },
        memberProfile
      )
    ).toMatchObject({
      href: "/(member)/procurement?notificationEntityId=request-1",
      ok: true,
    })
  })

  test("rejects signed-out, wrong-tenant, wrong-role and unknown actions", () => {
    expect(resolveNotificationDestination(payload, null)).toMatchObject({
      ok: false,
      reason: "signed_out",
    })
    expect(
      resolveNotificationDestination(
        { ...payload, tenantId: "another-tenant" },
        memberProfile
      )
    ).toMatchObject({ ok: false, reason: "tenant_mismatch" })
    expect(
      resolveNotificationDestination(
        { ...payload, intendedRole: "tenant_admin" },
        memberProfile
      )
    ).toMatchObject({ ok: false, reason: "role_mismatch" })
    expect(
      resolveNotificationDestination({ ...payload, action: "open_anything" }, memberProfile)
    ).toMatchObject({ ok: false, reason: "invalid" })
  })

  test("never exposes the member route to an administrator", () => {
    const admin = profile("admin", "tenant_admin")
    expect(
      resolveNotificationDestination(
        {
          ...payload,
          intendedRole: "tenant_admin",
          tenantId: admin.tenant.id,
        },
        admin
      )
    ).toMatchObject({ href: "/(admin)/(tabs)/finance", ok: true })
  })
})
