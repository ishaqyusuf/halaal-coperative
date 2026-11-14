import { TRPCError } from "@trpc/server"
import {
  type ChargeWorkflow,
  getMemberByUserId,
  quoteApplicableCharges,
} from "@halaalvest/db"

type MemberScopeContext = {
  auth: {
    activeMembership: { role: string }
    session: { user: { id: string } }
  }
  tenant: { current: { id: string } }
}

/**
 * Members only ever see their own records. Staff get `undefined` (no member
 * filter). A member without a linked profile gets an id that matches nothing.
 */
export async function getScopedMemberId(ctx: MemberScopeContext) {
  if (ctx.auth.activeMembership.role !== "member") {
    return undefined
  }

  const member = await getMemberByUserId({
    tenantId: ctx.tenant.current.id,
    userId: ctx.auth.session.user.id,
  })

  return member?.id ?? "__missing_member_profile__"
}

/**
 * Charge options for a request form, loaded only when the form opens. Members
 * may read submission charges (what they pay to ask); approval charges are for
 * staff reviewing a request.
 */
export async function getRequestChargeOptions(
  ctx: MemberScopeContext,
  input: { trigger: "approval" | "submission"; workflow: ChargeWorkflow }
) {
  if (
    input.trigger === "approval" &&
    ctx.auth.activeMembership.role === "member"
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Staff access is required for this action.",
    })
  }

  return quoteApplicableCharges({
    basisAmount: 100,
    tenantId: ctx.tenant.current.id,
    trigger: input.trigger,
    workflow: input.workflow,
  })
}
