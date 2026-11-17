import { AppSheet } from "@/components/app/app-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import {
  ReviewRow,
  ReviewSummary,
  SubmittingState,
} from "@/components/app/result-screen"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Pressable } from "@/components/ui/pressable"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { mobileDevQuickFillIdentity } from "@/dev/mobile-dev-quick-fill-identity"
import { inviteAdminAccessUser } from "@/features/admin-reports-access/public/admin-access-api"
import type {
  AdminAccessInviteInput,
  AdminAccessInviteResult,
} from "@/features/admin-reports-access/public/admin-access-types"
import { useInvalidateAppQueries } from "@/hooks/use-app-query"
import { useColors } from "@/hooks/use-color"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import type { MobileProfile } from "@/lib/session-store"
import { cn } from "@/lib/utils"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useRef, useState } from "react"
import { Clipboard, Keyboard, Share, Switch, View } from "react-native"
import { settingsAccessKey } from "../api/workspace-access-api"
import type { SettingsAccessQaState } from "../model/settings-access-qa"
import { formatWorkspaceRoleLabel } from "../presentation/workspace-role-presentation"
import { SettingsTileIcon } from "./grouped-settings"

const roles = [
  {
    role: "tenant_admin",
    scope: "Administrative control over cooperative setup and operations.",
  },
  {
    role: "finance_officer",
    scope: "Financial operations, reports, collections, and reviews.",
  },
  {
    role: "operations_officer",
    scope: "Member operations, support, and coordination.",
  },
  {
    role: "member",
    scope: "Member-facing visibility into cooperative activity.",
  },
] as const

const emptyDraft = {
  inviteEmail: "",
  inviteFullName: "",
  inviteMakeDefault: false,
  inviteRole: "member" as AdminAccessInviteInput["role"],
}
const missingPrefix =
  "Configure this cooperative’s 3–5 letter prefix on the web before inviting mobile users."

export function InviteUserSheet({
  offline,
  onClose,
  profile,
  qa,
  visible,
}: {
  offline: boolean
  onClose: () => void
  profile: MobileProfile
  qa: SettingsAccessQaState | null
  visible: boolean
}) {
  const [draft, setDraft] = useState(emptyDraft)
  const [restored, setRestored] = useState(false)
  const [validated, setValidated] = useState(false)
  const [phase, setPhase] = useState<
    "form" | "review" | "sending" | "result" | "error"
  >("form")
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AdminAccessInviteResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [wasDefault, setWasDefault] = useState(false)
  const inFlight = useRef(false)
  const runtime = useMobileRuntime()
  const colors = useColors()
  const invalidate = useInvalidateAppQueries()
  const clearDraft = useMobileFormDraft({
    enabled: visible && phase !== "result",
    freezeAfterClear: true,
    key: "admin.access.invite",
    onHydrate: (stored) => {
      setDraft(stored)
      setRestored(
        Boolean(
          stored.inviteFullName ||
          stored.inviteEmail ||
          stored.inviteMakeDefault ||
          stored.inviteRole !== "member"
        )
      )
    },
    value: draft,
  })

  const fullName = draft.inviteFullName.trim()
  const email = draft.inviteEmail.trim()
  const invalidName = fullName.length < 2 || fullName.length > 160
  const invalidEmail = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const dirty = Boolean(
    fullName ||
    email ||
    draft.inviteMakeDefault ||
    draft.inviteRole !== "member"
  )

  function reset() {
    setDraft(emptyDraft)
    setValidated(false)
    setRestored(false)
    setPhase("form")
    setError(null)
    setResult(null)
    setCopied(false)
    setWasDefault(false)
  }

  function close() {
    if (dirty) void clearDraft().catch(() => undefined)
    reset()
    onClose()
  }

  function review() {
    setValidated(true)
    if (invalidName || invalidEmail) return
    Keyboard.dismiss()
    setPhase("review")
  }

  async function send() {
    if (inFlight.current || offline) return
    inFlight.current = true
    setPhase("sending")
    const input = {
      email,
      fullName,
      makeDefault: draft.inviteMakeDefault,
      role: draft.inviteRole,
    }
    try {
      if (qa === "missing-prefix") throw new Error(missingPrefix)
      const response =
        qa === "invite-failed"
          ? {
              ...input,
              cooperativeNumber: "ABC-0123",
              deliveryStatus: "failed" as const,
              id: "ticket-09-invite-failed",
              setupUrl: "",
              status: "invited" as const,
            }
          : await runtime.runOnlineOperation("command", () =>
              inviteAdminAccessUser(input)
            )
      await clearDraft().catch(() => undefined)
      setResult(response)
      setWasDefault(Boolean(input.makeDefault))
      setPhase("result")
      setDraft(emptyDraft)
      const account = `${profile.user.id}:${profile.tenant.id}:${profile.activeMembershipId}`
      void invalidate(
        settingsAccessKey(account, "count"),
        settingsAccessKey(account, "stats"),
        settingsAccessKey(account, "directory")
      )
    } catch (cause) {
      const prefix =
        cause instanceof Error &&
        cause.message.toLowerCase().includes("cooperative prefix")
      setError(
        prefix
          ? missingPrefix
          : "Workspace invitation could not be saved. Try again."
      )
      setPhase("error")
    } finally {
      inFlight.current = false
    }
  }

  function fill() {
    const person = mobileDevQuickFillIdentity()
    setDraft({
      inviteEmail: person.email,
      inviteFullName: person.fullName,
      inviteMakeDefault: true,
      inviteRole: mobileDevQuickFill.adminInvite.role,
    })
  }

  const confirmedDelivery =
    result?.deliveryStatus === "sent" || result?.deliveryStatus === "queued"
  const deliveryTitle =
    result?.deliveryStatus === "sent"
      ? "Invitation sent"
      : result?.deliveryStatus === "queued"
        ? "Invitation queued"
        : result?.deliveryStatus === "development_fixture"
          ? "Development fixture only"
          : "Share the number manually"
  const deliveryDetail = confirmedDelivery
    ? `${result.fullName} can open the setup link, request a recovery code and choose a password.`
    : result?.deliveryStatus === "development_fixture"
      ? "No email was sent. This handoff is available for native UI verification."
      : "Email delivery was not confirmed. Give the recipient this cooperative number and ask them to use Forgot password with the invited email address."

  return (
    <AppSheet
      dirty={
        phase === "form" || phase === "review" || phase === "error"
          ? dirty
          : false
      }
      footer={
        phase === "form" || phase === "review" ? (
          <Button
            disabled={offline}
            onPress={phase === "form" ? review : () => void send()}
            size="lg"
          >
            <Icon className="size-base text-primary-foreground" name="Send" />
            <Text>{phase === "form" ? "Review invite" : "Send invite"}</Text>
          </Button>
        ) : phase === "result" ? (
          <View className="gap-[8px]">
            <Button onPress={close} size="lg">
              <Text>Done</Text>
            </Button>
            <Button onPress={reset} variant="ghost">
              <Text className="text-primary">Invite another</Text>
            </Button>
          </View>
        ) : phase === "error" ? (
          <View className="gap-[8px]">
            <Button onPress={() => setPhase("form")} size="lg">
              <Text>Back to the form</Text>
            </Button>
            <Button onPress={close} variant="ghost">
              <Text>Close</Text>
            </Button>
          </View>
        ) : null
      }
      isSubmitting={phase === "sending"}
      onBack={phase === "review" ? () => setPhase("form") : undefined}
      onClose={close}
      overlay={
        phase === "form" ? (
          <DevQuickFill
            bottomOffset={92}
            label="Quick fill access invitation"
            onPress={fill}
            portal={false}
          />
        ) : undefined
      }
      title="Invite user"
      variant="form"
      visible={visible}
    >
      {phase === "form" ? (
        <View className="gap-[18px]">
          {offline ? (
            <StatusBanner
              description="Connect to send this invite. Your draft stays on this phone."
              kind="offline"
              title="You’re offline"
            />
          ) : null}
          {restored ? (
            <StatusBanner
              description="From your last visit on this phone."
              kind="info"
              title="Draft restored"
            />
          ) : null}
          <View className="flex-row items-center gap-[8px] self-start rounded-full bg-card pr-[12px] pl-[4px]">
            <View className="size-[20px] items-center justify-center rounded-full bg-accent">
              <Text className="text-accent-foreground" variant="caption">
                {profile.tenant.branding.mark}
              </Text>
            </View>
            <Text className="text-foreground-soft shrink" variant="label">
              {profile.tenant.name}
            </Text>
          </View>
          <FormField
            error={
              validated && invalidName
                ? "Enter a full name between 2 and 160 characters."
                : undefined
            }
            label="Full name"
          >
            <Input
              accessibilityLabel="Invite full name"
              autoComplete="name"
              onChangeText={(inviteFullName) =>
                setDraft((current) => ({ ...current, inviteFullName }))
              }
              placeholder="Full name"
              value={draft.inviteFullName}
            />
          </FormField>
          <FormField
            error={
              validated && invalidEmail
                ? "Enter a valid email address."
                : undefined
            }
            helper="We email them a setup link and their cooperative number."
            label="Email address"
          >
            <Input
              accessibilityLabel="Invite email address"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              leading={
                <Icon className="size-base text-muted-foreground" name="Mail" />
              }
              onChangeText={(inviteEmail) =>
                setDraft((current) => ({ ...current, inviteEmail }))
              }
              placeholder="name@example.com"
              value={draft.inviteEmail}
            />
          </FormField>
          <View accessibilityRole="radiogroup" className="gap-[8px]">
            <Text
              accessibilityRole="header"
              className="font-bold"
              variant="body"
            >
              Workspace role
            </Text>
            {roles.map(({ role, scope }) => {
              const selected = draft.inviteRole === role
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  className={cn(
                    "flex-row items-start gap-[12px] rounded-[14px] px-[13px] py-[12px]",
                    selected
                      ? "border-2 border-primary bg-accent/60"
                      : "border border-border bg-card"
                  )}
                  key={role}
                  onPress={() =>
                    setDraft((current) => ({ ...current, inviteRole: role }))
                  }
                >
                  <View
                    className={cn(
                      "mt-[2px] size-[20px] items-center justify-center rounded-full border-2",
                      selected ? "border-primary" : "border-muted-foreground"
                    )}
                  >
                    {selected ? (
                      <View className="size-[8px] rounded-full bg-primary" />
                    ) : null}
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="font-bold" variant="body">
                      {formatWorkspaceRoleLabel(role)}
                    </Text>
                    <Text className="text-muted-foreground" variant="small">
                      {scope}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
          <View className="flex-row items-center gap-[12px] rounded-[14px] bg-card p-[14px]">
            <SettingsTileIcon icon="Star" tone="amber" />
            <View className="min-w-0 flex-1">
              <Text className="font-semibold" variant="body">
                Set as default role
              </Text>
              <Text className="text-muted-foreground" variant="small">
                Opens this workspace first after sign-in
              </Text>
            </View>
            <Switch
              accessibilityLabel="Set as default role"
              onValueChange={(inviteMakeDefault) =>
                setDraft((current) => ({ ...current, inviteMakeDefault }))
              }
              trackColor={{ true: colors.primary }}
              value={draft.inviteMakeDefault}
            />
          </View>
        </View>
      ) : null}
      {phase === "review" ? (
        <ReviewSummary
          onEdit={() => setPhase("form")}
          title="Review invitation"
        >
          <ReviewRow label="Name" value={fullName} />
          <ReviewRow label="Email" value={email} />
          <ReviewRow
            label="Role"
            value={formatWorkspaceRoleLabel(draft.inviteRole)}
          />
          <ReviewRow
            label="Default role"
            value={draft.inviteMakeDefault ? "Yes" : "No"}
          />
        </ReviewSummary>
      ) : null}
      {phase === "sending" ? <SubmittingState title="Sending invite…" /> : null}
      {phase === "result" && result ? (
        <View className="gap-[16px]">
          <View className="items-center gap-[8px] rounded-[20px] bg-accent p-[16px]">
            <Text className="text-accent-foreground" variant="label">
              Cooperative number
            </Text>
            <Text
              className="text-accent-foreground"
              selectable
              tabular
              variant="hero"
            >
              {result.cooperativeNumber}
            </Text>
            <View className="flex-row gap-[8px]">
              <Button
                onPress={() => {
                  Clipboard.setString(result.cooperativeNumber)
                  setCopied(true)
                }}
                size="sm"
                variant="ghost"
              >
                <Text>{copied ? "Copied" : "Copy"}</Text>
              </Button>
              <Button
                onPress={() =>
                  void Share.share({
                    message: result.cooperativeNumber,
                  }).catch(() => undefined)
                }
                size="sm"
                variant="ghost"
              >
                <Text>Share</Text>
              </Button>
            </View>
          </View>
          <StatusBanner
            description={deliveryDetail}
            kind={confirmedDelivery ? "info" : "stale"}
            title={deliveryTitle}
          />
          <ReviewSummary title="Invitation details">
            <ReviewRow label="Name" value={result.fullName} />
            <ReviewRow label="Email" value={result.email} />
            <ReviewRow
              label="Role"
              value={
                formatWorkspaceRoleLabel(result.role) +
                (wasDefault ? " · default" : "")
              }
            />
          </ReviewSummary>
        </View>
      ) : null}
      {phase === "error" ? (
        <View className="items-center gap-[12px] pt-[16px]">
          <View className="bg-tint-danger size-[60px] items-center justify-center rounded-full">
            <Icon
              className="size-lg text-tint-danger-foreground"
              name="CircleAlert"
            />
          </View>
          <Text accessibilityRole="header" variant="title">
            Invite not sent
          </Text>
          <Text
            accessibilityRole="alert"
            className="text-center text-muted-foreground"
            variant="body"
          >
            {error}
          </Text>
        </View>
      ) : null}
    </AppSheet>
  )
}
