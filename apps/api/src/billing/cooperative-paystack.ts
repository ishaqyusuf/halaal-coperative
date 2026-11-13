import {
  findCooperativeMobilePaystackCheckout,
  recordVerifiedCooperativeMobilePaystackPayment,
  reserveCooperativeMobilePaystackCheckout,
  saveCooperativeMobilePaystackAuthorization,
} from "@halaalvest/db"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

export const cooperativePaystackReference = z
  .string()
  .regex(/^hv-invoice-[a-f0-9-]{36}$/)

const checkoutUrl = z.url().refine((value) => {
  const url = new URL(value)
  return (
    url.origin === "https://checkout.paystack.com" &&
    !url.username &&
    !url.password
  )
})

const nigeriaPaymentDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Africa/Lagos",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

export function cooperativePaystackConfig(env = process.env) {
  const environment =
    env.VERCEL_ENV ||
    env.APP_ENV ||
    env.DEPLOYMENT_ENVIRONMENT ||
    env.HALAALVEST_ENV ||
    env.NODE_ENV
  const mode = environment === "production" ? "live" : "test"
  const secret = env.PAYSTACK_SECRET_KEY?.trim()
  if (!secret || !secret.startsWith(`sk_${mode}_`)) return null

  return {
    mode,
    secret,
    signingSecret: env.PAYSTACK_WEBHOOK_SIGNING_SECRET?.trim(),
    sandboxTenantId: z.uuid().safeParse(env.PAYSTACK_SANDBOX_TENANT_ID).data,
    checkoutEnabled: env.PAYSTACK_CHECKOUT_ENABLED === "true",
  } as const
}

type PaystackConfig = NonNullable<ReturnType<typeof cooperativePaystackConfig>>

export function canUseCooperativePaystack(
  config: PaystackConfig,
  tenantId: string
) {
  return config.mode === "live" || config.sandboxTenantId === tenantId
}

async function paystackRequest(
  config: PaystackConfig,
  path: string,
  body?: object
) {
  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/${path}`,
      {
        method: body ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${config.secret}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      }
    )
    if (response.ok) return (await response.json()) as unknown
  } catch {
    // Provider responses and request headers can contain private data.
  }
  throw new TRPCError({
    code: "BAD_GATEWAY",
    message: "Paystack could not complete this request. Please try again.",
  })
}

export async function startCooperativePaystackCheckout(input: {
  invoiceId: string
  tenantId: string
  email: string
  callback: URL
}) {
  const config = cooperativePaystackConfig()
  if (
    !config?.checkoutEnabled ||
    !canUseCooperativePaystack(config, input.tenantId)
  )
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Online invoice payments are unavailable.",
    })

  if (
    input.callback.protocol !== "https:" &&
    !(config.mode === "test" && input.callback.hostname.endsWith(".localhost"))
  )
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The invoice checkout return URL is unavailable.",
    })

  const reservation = {
    invoiceId: input.invoiceId,
    tenantId: input.tenantId,
    mode: config.mode,
  }
  let checkout = await reserveCooperativeMobilePaystackCheckout(reservation)
  if (checkout.authorizationUrl) {
    const status = await reconcileCooperativePaystackCheckout(config, {
      invoiceId: input.invoiceId,
      tenantId: input.tenantId,
      reference: checkout.reference,
    })
    if (status === "paid") return { status }
    if (status !== "failed")
      return {
        status: "checkout" as const,
        url: checkoutUrl.parse(checkout.authorizationUrl),
      }

    checkout = await reserveCooperativeMobilePaystackCheckout({
      ...reservation,
      replaceReference: checkout.reference,
    })
    if (checkout.authorizationUrl)
      return {
        status: "checkout" as const,
        url: checkoutUrl.parse(checkout.authorizationUrl),
      }
  }

  const result = z
    .object({
      status: z.literal(true),
      data: z.object({
        authorization_url: checkoutUrl,
        reference: z.literal(checkout.reference),
      }),
    })
    .safeParse(
      await paystackRequest(config, "initialize", {
        email: input.email,
        amount: String(checkout.amount),
        currency: "NGN",
        reference: checkout.reference,
        callback_url: input.callback.href,
      })
    )
  if (!result.success)
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "Paystack did not return a valid checkout link.",
    })

  const url = result.data.data.authorization_url
  await saveCooperativeMobilePaystackAuthorization(checkout.reference, url)
  return { status: "checkout" as const, url }
}

const verification = z.object({
  status: z.literal(true),
  data: z.object({
    status: z.string(),
    domain: z.enum(["test", "live"]),
    reference: cooperativePaystackReference,
    currency: z.string(),
    amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    paid_at: z.iso.datetime({ offset: true }).nullish(),
  }),
})

export async function reconcileCooperativePaystackCheckout(
  config: PaystackConfig,
  input:
    | { reference: string }
    | { reference?: string; invoiceId: string; tenantId: string }
): Promise<"paid" | "pending" | "failed" | "unavailable"> {
  const checkout = await findCooperativeMobilePaystackCheckout({
    ...input,
    mode: config.mode,
  })
  if (!checkout) return "unavailable"
  if (!canUseCooperativePaystack(config, checkout.invoice.tenantId))
    return "unavailable"
  if (checkout.verifiedAt) return "paid"

  const result = verification.safeParse(
    await paystackRequest(config, `verify/${checkout.reference}`)
  )
  if (!result.success)
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "Paystack did not return a valid payment status.",
    })

  const payment = result.data.data
  if (
    payment.domain !== config.mode ||
    payment.reference !== checkout.reference
  )
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Paystack returned a payment for a different checkout.",
    })
  if (payment.status === "failed") return "failed"
  if (payment.status !== "success" || !payment.paid_at) return "pending"

  await recordVerifiedCooperativeMobilePaystackPayment({
    invoiceId: checkout.invoiceId,
    reference: payment.reference,
    paidAt: nigeriaPaymentDate.format(new Date(payment.paid_at)),
    mode: payment.domain,
    amount: payment.amount,
    currency: payment.currency,
  })
  return "paid"
}
