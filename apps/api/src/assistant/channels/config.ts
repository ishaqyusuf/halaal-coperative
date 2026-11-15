/**
 * Env-only channel flags. Both channels are off unless their flag is "true"
 * and every required value is present. Nothing here is a secret default.
 */

export type ChannelProvider = "telegram" | "whatsapp"

export type TelegramChannelConfig = {
  botToken: string
  webhookSecret: string
  botUsername: string
}

export type WhatsAppChannelConfig = {
  appSecret: string
  verifyToken: string
  accessToken: string
  phoneNumberId: string
  /** E.164 digits for `wa.me` links. Without it the app shows the code only. */
  displayNumber: string | null
}

export type AssistantChannelConfig = {
  environment: string
  /** Signed-in app origin for protected links. */
  appUrl: string
  telegram: TelegramChannelConfig | null
  whatsapp: WhatsAppChannelConfig | null
}

type Env = Record<string, string | undefined>

function value(env: Env, name: string) {
  const current = env[name]?.trim()
  return current ? current : null
}

function flag(env: Env, name: string) {
  return value(env, name)?.toLowerCase() === "true"
}

export function readAssistantChannelConfig(
  env: Env = process.env
): AssistantChannelConfig {
  const telegram = (() => {
    if (!flag(env, "ASSISTANT_TELEGRAM_ENABLED")) return null
    const botToken = value(env, "ASSISTANT_TELEGRAM_BOT_TOKEN")
    const webhookSecret = value(env, "ASSISTANT_TELEGRAM_WEBHOOK_SECRET")
    const botUsername = value(env, "ASSISTANT_TELEGRAM_BOT_USERNAME")
    if (!botToken || !webhookSecret || !botUsername) return null
    return {
      botToken,
      webhookSecret,
      botUsername: botUsername.replace(/^@/, ""),
    }
  })()
  const whatsapp = (() => {
    if (!flag(env, "ASSISTANT_WHATSAPP_ENABLED")) return null
    const appSecret = value(env, "ASSISTANT_WHATSAPP_APP_SECRET")
    const verifyToken = value(env, "ASSISTANT_WHATSAPP_VERIFY_TOKEN")
    const accessToken = value(env, "ASSISTANT_WHATSAPP_ACCESS_TOKEN")
    const phoneNumberId = value(env, "ASSISTANT_WHATSAPP_PHONE_NUMBER_ID")
    if (!appSecret || !verifyToken || !accessToken || !phoneNumberId)
      return null
    const displayNumber =
      value(env, "ASSISTANT_WHATSAPP_DISPLAY_NUMBER")?.replace(/\D/g, "") ||
      null
    return { appSecret, verifyToken, accessToken, phoneNumberId, displayNumber }
  })()
  return {
    environment: value(env, "HALAALVEST_ENV") ?? "local",
    appUrl: (
      value(env, "DASHBOARD_APP_URL") ?? "http://localhost:1441"
    ).replace(/\/+$/, ""),
    telegram,
    whatsapp,
  }
}

export function providerEnabled(
  config: AssistantChannelConfig,
  provider: ChannelProvider
) {
  return provider === "telegram"
    ? Boolean(config.telegram)
    : Boolean(config.whatsapp)
}

export const providerLabel: Record<ChannelProvider, string> = {
  telegram: "Telegram",
  whatsapp: "WhatsApp",
}

/**
 * Signed-in app paths the channel links open. Saved answers and drafts use
 * `assistantHrefs.message` / `assistantHrefs.proposal` from `@halaalvest/assistant`.
 */
export const assistantChannelPaths = {
  connect: "/assistant/channels",
} as const
