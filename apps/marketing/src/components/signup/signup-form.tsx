"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { QaNotificationPreview } from "@halaalvest/notifications"
import { useWatch } from "react-hook-form"
import { formatJourneyStepCounter } from "@halaalvest/domain"
import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaalvest/ui/components/form"
import { Input } from "@halaalvest/ui/components/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@halaalvest/ui/components/input-group"
import { QaQuickFillButton } from "@halaalvest/ui/components/qa-quick-fill-button"
import { Spinner } from "@halaalvest/ui/components/spinner"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import {
  QaNotificationPreviewCard,
  useNotifications,
} from "@halaalvest/notifications-react"
import type { QaQuickFillContext } from "@halaalvest/utils"
import { previewCooperativeAccessCode } from "@halaalvest/utils"
import { CheckCircle2Icon, CircleAlertIcon } from "lucide-react"
import { applyDevFormFill } from "@/lib/dev-form-fill"
import {
  getMarketingErrorMessage,
  type MarketingErrorEnvelope,
} from "@/lib/error-response"
import {
  formatInternationalPhone,
  movePhoneToCountry,
  normalizeInternationalPhone,
} from "@/lib/international-phone"
import {
  cooperativeCountryCode,
  createWorkspaceSlugSuggestion,
  normalizeWorkspaceSlug,
  signupIntentSchema,
  type SignupIntentInput,
} from "@/lib/signup-flow"
import { CountryCombobox } from "./country-combobox"
import { SignupPhoneInput } from "./signup-phone-input"
import { SignupWorkspacePreview } from "./signup-workspace-preview"

type SignupApiSuccess = {
  devMode: boolean
  emailDeliveryConfigured: boolean
  expiresAt: string
  onboardingUrl?: string
  qaPreviews?: QaNotificationPreview[]
  verificationDelivery: {
    attempts: number
    errorMessage?: string | null
    messageId: string
    status: "failed" | "queued" | "sent"
  }
  verificationEmail?: {
    actionLabel: string
    actionUrl: string
    bodyText: string
    previewText: string
    recipient: {
      displayName?: string
      value: string
    }
    subject: string
  }
}

type AvailabilityState =
  | { status: "idle" }
  | { status: "checking" }
  | {
      status: "ready"
      cooperativeName: {
        available: boolean
        normalized: string
      }
      cooperativeCodePrefix: {
        available: boolean
        normalized: string
      }
      workspaceSlug: {
        available: boolean
        hostname: string
        normalized: string
      }
    }
  | { status: "error"; message: string }

const DEFAULT_ADMIN_MEMBER_NUMBER = "0001"
const NIGERIA_PHONE = "NG"

function formatExpiry(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function Status({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: "bad" | "ok" | "wait"
}) {
  return (
    <p className="su-status" data-tone={tone} role="status">
      {tone === "ok" ? (
        <CheckCircle2Icon aria-hidden="true" />
      ) : tone === "bad" ? (
        <CircleAlertIcon aria-hidden="true" />
      ) : (
        <Spinner aria-hidden="true" className="size-3.5" />
      )}
      {children}
    </p>
  )
}

/**
 * Step 1 of the journey (Workshop marketing/signup-form-directions 03): the
 * form on the left, the workspace drawn from it on the right. After sending,
 * step 2 ("We sent you a link") replaces the form.
 */
export function SignupForm({
  defaultValues,
  legalUnavailable = false,
  quickFill,
  themeClassName,
  workspaceUrlSuffix,
}: {
  /** From an approved early-access link issued before sign-up opened. */
  defaultValues?: Partial<SignupIntentInput>
  /**
   * Terms and Privacy must be accepted (launch stage) but are still drafts:
   * the server would refuse with 412, so the button waits instead.
   */
  legalUnavailable?: boolean
  quickFill: QaQuickFillContext
  /** `.su` theme and font variables, for popovers that portal to <body>. */
  themeClassName: string
  workspaceUrlSuffix: string
}) {
  const initialWorkspaceSlug = defaultValues?.workspaceSlug
    ? normalizeWorkspaceSlug(defaultValues.workspaceSlug)
    : createWorkspaceSlugSuggestion(defaultValues?.cooperativeName ?? "")
  const form = useZodForm<SignupIntentInput>(signupIntentSchema, {
    defaultValues: {
      acceptedTerms: false,
      cooperativeCodePrefix: defaultValues?.cooperativeCodePrefix ?? "",
      cooperativeName: defaultValues?.cooperativeName ?? "",
      country: defaultValues?.country ?? "",
      primaryContactEmail: defaultValues?.primaryContactEmail ?? "",
      primaryContactFullName: defaultValues?.primaryContactFullName ?? "",
      // The preview shows this number, so the field starts with it too.
      primaryContactMemberNumber:
        defaultValues?.primaryContactMemberNumber ??
        DEFAULT_ADMIN_MEMBER_NUMBER,
      primaryContactPhone: "",
      primaryContactPhoneCountry: "",
      workspaceSlug: initialWorkspaceSlug,
    },
  })
  const { publishQaPreviews, showError, showSuccess } = useNotifications()
  const [result, setResult] = useState<SignupApiSuccess | null>(null)
  const [submittedValues, setSubmittedValues] =
    useState<SignupIntentInput | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [workspaceSlugEdited, setWorkspaceSlugEdited] = useState(
    Boolean(defaultValues?.workspaceSlug)
  )
  // Once the phone's own country is picked, the cooperative's country no
  // longer moves it.
  const [phoneCountryEdited, setPhoneCountryEdited] = useState(false)
  const [availability, setAvailability] = useState<AvailabilityState>({
    status: "idle",
  })
  const [
    cooperativeName,
    cooperativeCodePrefix,
    country,
    memberNumber,
    ownerEmail,
    ownerName,
    phone,
    phoneCountry,
    workspaceSlug,
  ] = useWatch({
    control: form.control,
    name: [
      "cooperativeName",
      "cooperativeCodePrefix",
      "country",
      "primaryContactMemberNumber",
      "primaryContactEmail",
      "primaryContactFullName",
      "primaryContactPhone",
      "primaryContactPhoneCountry",
      "workspaceSlug",
    ],
  })
  const normalizedWorkspaceSlug = normalizeWorkspaceSlug(workspaceSlug ?? "")
  const countryCode = cooperativeCountryCode(country)
  const accessCodePreview = previewCooperativeAccessCode(
    cooperativeCodePrefix,
    memberNumber
  )
  const prefix = accessCodePreview.prefix ?? ""
  const ownerCode =
    accessCodePreview.code ??
    `${prefix || "ABC"}-${memberNumber?.trim() ? memberNumber.trim().toUpperCase() : "····"}`
  const e164Phone =
    phone && phoneCountry
      ? normalizeInternationalPhone(phone, phoneCountry)
      : null
  const canSubmit =
    !legalUnavailable &&
    availability.status !== "checking" &&
    (availability.status !== "ready" ||
      (availability.cooperativeName.available &&
        availability.cooperativeCodePrefix.available &&
        availability.workspaceSlug.available))

  useEffect(() => {
    if (workspaceSlugEdited) return

    const suggestedSlug = createWorkspaceSlugSuggestion(cooperativeName ?? "")

    if (suggestedSlug !== form.getValues("workspaceSlug")) {
      form.setValue("workspaceSlug", suggestedSlug, {
        shouldValidate: form.formState.isSubmitted,
      })
    }
  }, [cooperativeName, form, workspaceSlugEdited])

  // The phone follows the cooperative's country until its own flag is picked.
  useEffect(() => {
    if (phoneCountryEdited || !countryCode) return
    const current = form.getValues("primaryContactPhoneCountry")
    if (current === countryCode) return
    form.setValue("primaryContactPhoneCountry", countryCode)
    form.setValue(
      "primaryContactPhone",
      movePhoneToCountry(
        form.getValues("primaryContactPhone") ?? "",
        current,
        countryCode
      )
    )
  }, [countryCode, form, phoneCountryEdited])

  useEffect(() => {
    const normalizedName = cooperativeName?.trim() ?? ""

    if (
      normalizedName.length < 2 ||
      !/^[a-zA-Z]{3,5}$/.test(cooperativeCodePrefix ?? "") ||
      normalizedWorkspaceSlug.length < 2
    ) {
      setAvailability({ status: "idle" })
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      try {
        setAvailability({ status: "checking" })

        const params = new URLSearchParams({
          cooperativeCodePrefix: cooperativeCodePrefix ?? "",
          cooperativeName: normalizedName,
          workspaceSlug: normalizedWorkspaceSlug,
        })
        const response = await fetch(`/api/signup/availability?${params}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("We couldn't check availability just now.")
        }

        setAvailability({
          status: "ready",
          ...((await response.json()) as Omit<
            Extract<AvailabilityState, { status: "ready" }>,
            "status"
          >),
        })
      } catch (error) {
        if (controller.signal.aborted) return

        setAvailability({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "We couldn't check availability just now.",
        })
      }
    }, 350)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [cooperativeCodePrefix, cooperativeName, normalizedWorkspaceSlug])

  async function requestVerification(values: SignupIntentInput) {
    try {
      setSubmitting(true)

      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const payload = (await response.json()) as
        | SignupApiSuccess
        | MarketingErrorEnvelope

      if (!response.ok || !("verificationDelivery" in payload)) {
        throw new Error(
          getMarketingErrorMessage(
            payload,
            "We could not prepare the verification step."
          )
        )
      }

      setSubmittedValues(values)
      setResult(payload)
      window.scrollTo({ top: 0 })
      publishQaPreviews(payload.qaPreviews)
      showSuccess(
        payload.verificationDelivery.status === "sent"
          ? "Verification email sent"
          : "Verification prepared",
        payload.emailDeliveryConfigured
          ? "Open the email to continue setup."
          : "Email delivery is not configured here. Use the secure link."
      )
    } catch (error) {
      showError(
        "Setup could not continue",
        error instanceof Error ? error.message : "Something went wrong."
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function onSubmit(values: SignupIntentInput) {
    if (
      availability.status === "ready" &&
      (!availability.cooperativeName.available ||
        !availability.cooperativeCodePrefix.available ||
        !availability.workspaceSlug.available)
    ) {
      showError(
        "Setup could not continue",
        "Choose an available member code, name and workspace address."
      )
      return
    }

    await requestVerification({
      ...values,
      // Send the E.164 number; an empty phone is left out.
      primaryContactPhone: values.primaryContactPhone
        ? (normalizeInternationalPhone(
            values.primaryContactPhone,
            values.primaryContactPhoneCountry ?? ""
          ) ?? values.primaryContactPhone)
        : "",
    })
  }

  const prefixAvailability =
    availability.status === "ready" ? availability.cooperativeCodePrefix : null
  const slugAvailability =
    availability.status === "ready" ? availability.workspaceSlug : null
  const nameAvailability =
    availability.status === "ready" ? availability.cooperativeName : null
  const checking = availability.status === "checking"

  const preview = (
    <SignupWorkspacePreview
      cooperativeName={cooperativeName ?? ""}
      countryCode={countryCode}
      countryName={countryCode ? (country ?? "") : ""}
      ownerCode={ownerCode}
      ownerEmail={ownerEmail ?? ""}
      ownerName={ownerName ?? ""}
      ownerPhone={e164Phone ? formatInternationalPhone(e164Phone) : ""}
      prefix={prefix}
      workspaceSlug={normalizedWorkspaceSlug}
      workspaceUrlSuffix={workspaceUrlSuffix}
    />
  )

  if (result) {
    const emailWasSent = result.verificationDelivery.status === "sent"
    const emailFailed = result.verificationDelivery.status === "failed"
    const recipient =
      result.verificationEmail?.recipient.value ??
      submittedValues?.primaryContactEmail ??
      "your email"
    const qaPreview = result.qaPreviews?.at(-1)
    const showSecureLink =
      result.devMode || !result.emailDeliveryConfigured || Boolean(qaPreview)

    return (
      <div className="su-split">
        <main className="su-left">
          <section aria-labelledby="su-sent-title" className="su-left-in su-sent">
            <p className="su-count">
              {formatJourneyStepCounter("verify-email")} · Verify email
            </p>
            <h2 id="su-sent-title">We sent you a link</h2>
            <p className="su-lede">
              Open the email we sent to <b>{recipient}</b> and select the
              button. The link works for 24 hours.
            </p>

            {emailFailed ? (
              <div className="su-notice" role="alert">
                <b>The email could not be delivered</b>
                Your secure link was still created. Send it again, or check the
                address.
              </div>
            ) : !emailWasSent ? (
              <div className="su-notice" role="status">
                <b>
                  {result.emailDeliveryConfigured
                    ? "Your email is on its way"
                    : "Email is not sent in this environment"}
                </b>
                {result.emailDeliveryConfigured
                  ? "It can take a minute to arrive."
                  : "Use the secure link below to continue."}
              </div>
            ) : null}

            <dl>
              <div>
                <dt>Sent to</dt>
                <dd>{recipient}</dd>
              </div>
              <div>
                <dt>Link expires</dt>
                <dd>{formatExpiry(result.expiresAt)}</dd>
              </div>
            </dl>

            {qaPreview ? (
              <div className="su-qa">
                <QaNotificationPreviewCard preview={qaPreview} />
              </div>
            ) : null}

            {showSecureLink && result.verificationEmail?.actionUrl ? (
              <div className="su-submit">
                <Link
                  className="su-btn inline-flex items-center justify-center"
                  href={result.verificationEmail.actionUrl}
                >
                  {result.emailDeliveryConfigured
                    ? result.verificationEmail.actionLabel
                    : "Continue with secure link"}
                </Link>
              </div>
            ) : null}

            <div className="su-acts">
              <button
                className="su-link"
                disabled={submitting || !submittedValues}
                onClick={() => {
                  if (submittedValues) void requestVerification(submittedValues)
                }}
                type="button"
              >
                {submitting ? (
                  <>
                    <Spinner aria-hidden="true" /> Sending
                  </>
                ) : (
                  "Send it again"
                )}
              </button>
              <button
                className="su-link"
                onClick={() => setResult(null)}
                type="button"
              >
                Wrong email? Change it
              </button>
              <small>Nothing in your inbox? Check spam.</small>
            </div>
          </section>
        </main>
        {preview}
      </div>
    )
  }

  return (
    <div className="su-split">
      <main className="su-left">
        <div className="su-left-in">
          <Form {...form}>
            <form
              aria-labelledby="su-title"
              noValidate
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <p className="su-count">
                {formatJourneyStepCounter("sign-up")} · Sign up
              </p>
              <h1 className="su-title" id="su-title">
                Create your cooperative&apos;s workspace
              </h1>
              <p className="su-lede">
                This is where your team and members will sign in. It takes
                about a minute.
              </p>
              {quickFill.enabled ? (
                <div className="su-quick">
                  <QaQuickFillButton
                    form={form}
                    onFill={() => {
                      setWorkspaceSlugEdited(true)
                      setPhoneCountryEdited(false)
                      return applyDevFormFill(form, "signup", undefined, {
                        emailDomain: quickFill.emailDomain,
                      })
                    }}
                    qaDomain={quickFill.emailDomain}
                    visible={quickFill.enabled}
                  />
                </div>
              ) : null}

              {legalUnavailable ? (
                <div className="su-notice" role="status">
                  <b>Sign-up opens soon</b>
                  Our terms and privacy notice are being finalised. You can
                  fill this in, but you can&apos;t send it until they are
                  published.
                </div>
              ) : null}

              <div className="su-group">
                <h2>Your cooperative</h2>
                <div className="su-grid">
                  <FormField
                    control={form.control}
                    name="cooperativeName"
                    render={({ field }) => (
                      <FormItem className="su-field su-full">
                        <FormLabel>Cooperative name</FormLabel>
                        <FormControl>
                          <Input
                            autoComplete="organization"
                            placeholder="e.g. Unity Staff Cooperative"
                            {...field}
                          />
                        </FormControl>
                        {nameAvailability && !nameAvailability.available ? (
                          <Status tone="bad">
                            That cooperative name is already in use.
                          </Status>
                        ) : null}
                        <FormMessage className="su-err" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem className="su-field su-full">
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <CountryCombobox
                            onBlur={field.onBlur}
                            onChange={(next) =>
                              field.onChange(next)
                            }
                            popupClassName={themeClassName}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormDescription className="su-hint">
                          Where the cooperative is registered.
                        </FormDescription>
                        <FormMessage className="su-err" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="su-group">
                <h2>You</h2>
                <div className="su-grid">
                  <FormField
                    control={form.control}
                    name="primaryContactFullName"
                    render={({ field }) => (
                      <FormItem className="su-field">
                        <FormLabel>Your name</FormLabel>
                        <FormControl>
                          <Input
                            autoComplete="name"
                            placeholder="Full name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="su-err" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="primaryContactEmail"
                    render={({ field }) => (
                      <FormItem className="su-field">
                        <FormLabel>Your email</FormLabel>
                        <FormControl>
                          <Input
                            autoComplete="email"
                            inputMode="email"
                            placeholder="you@example.com"
                            spellCheck={false}
                            type="email"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="su-hint">
                          You&apos;ll own the workspace.
                        </FormDescription>
                        <FormMessage className="su-err" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="primaryContactPhone"
                    render={({ field }) => (
                      <FormItem className="su-field su-full">
                        <FormLabel>
                          Phone <span className="su-opt">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <SignupPhoneInput
                            country={phoneCountry ?? ""}
                            inputRef={field.ref}
                            name={field.name}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            onCountryChange={(next) => {
                              setPhoneCountryEdited(true)
                              form.setValue("primaryContactPhoneCountry", next)
                            }}
                            popupClassName={themeClassName}
                            suggestedCountries={
                              countryCode && countryCode !== NIGERIA_PHONE
                                ? [countryCode, NIGERIA_PHONE]
                                : [NIGERIA_PHONE]
                            }
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormDescription className="su-hint">
                          {e164Phone ? (
                            <>
                              Saved as <b>{e164Phone}</b>
                            </>
                          ) : (
                            "We only use it to reach you about your workspace."
                          )}
                        </FormDescription>
                        <FormMessage className="su-err" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="su-group">
                <h2>Where everyone signs in</h2>
                <div className="su-grid">
                  <FormField
                    control={form.control}
                    name="workspaceSlug"
                    render={({ field }) => (
                      <FormItem className="su-field su-full">
                        <FormLabel>Workspace address</FormLabel>
                        <FormControl>
                          <InputGroup>
                            <InputGroupInput
                              autoCapitalize="none"
                              autoComplete="off"
                              placeholder="your-cooperative"
                              spellCheck={false}
                              {...field}
                              onChange={(event) => {
                                setWorkspaceSlugEdited(true)
                                field.onChange(
                                  normalizeWorkspaceSlug(event.target.value)
                                )
                              }}
                            />
                            <InputGroupAddon
                              align="inline-end"
                              className="su-suffix"
                            >
                              <InputGroupText>{workspaceUrlSuffix}</InputGroupText>
                            </InputGroupAddon>
                          </InputGroup>
                        </FormControl>
                        {slugAvailability ? (
                          slugAvailability.available ? (
                            <Status tone="ok">
                              {slugAvailability.normalized}
                              {workspaceUrlSuffix} is available
                            </Status>
                          ) : (
                            <Status tone="bad">
                              {normalizedWorkspaceSlug}
                              {workspaceUrlSuffix} is taken. Try another.
                            </Status>
                          )
                        ) : checking ? (
                          <Status tone="wait">Checking availability</Status>
                        ) : !workspaceSlugEdited && normalizedWorkspaceSlug ? (
                          <FormDescription className="su-hint">
                            Suggested from your cooperative&apos;s name.
                          </FormDescription>
                        ) : null}
                        <FormMessage className="su-err" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="primaryContactMemberNumber"
                    render={({ field }) => (
                      <FormItem className="su-field su-full">
                        <FormLabel>Member code</FormLabel>
                        <div className="su-code-row">
                          <FormField
                            control={form.control}
                            name="cooperativeCodePrefix"
                            render={({ field: prefixField }) => (
                              <InputGroup className="su-code-part">
                                <InputGroupAddon align="inline-start">
                                  <InputGroupText>Letters</InputGroupText>
                                </InputGroupAddon>
                                <InputGroupInput
                                  aria-invalid={Boolean(
                                    form.formState.errors.cooperativeCodePrefix
                                  )}
                                  aria-label="Member code letters"
                                  autoComplete="off"
                                  maxLength={5}
                                  placeholder="ABC"
                                  spellCheck={false}
                                  {...prefixField}
                                  onChange={(event) =>
                                    prefixField.onChange(
                                      event.target.value
                                        .replace(/[^a-zA-Z]/g, "")
                                        .toUpperCase()
                                    )
                                  }
                                />
                              </InputGroup>
                            )}
                          />
                          <InputGroup className="su-code-part">
                            <InputGroupAddon align="inline-start">
                              <InputGroupText>Your no.</InputGroupText>
                            </InputGroupAddon>
                            <FormControl>
                              <InputGroupInput
                                aria-label="Your member number"
                                autoComplete="off"
                                inputMode="numeric"
                                placeholder="0001"
                                {...field}
                              />
                            </FormControl>
                          </InputGroup>
                        </div>
                        {prefixAvailability ? (
                          prefixAvailability.available ? (
                            <Status tone="ok">
                              {prefixAvailability.normalized} is yours
                            </Status>
                          ) : (
                            <Status tone="bad">
                              {prefixAvailability.normalized} is used by
                              another cooperative.
                            </Status>
                          )
                        ) : (
                          <FormDescription className="su-hint">
                            Use 3 to 5 letters. Your no. is your own member
                            number. Keep 0001 or use the one from your records.
                          </FormDescription>
                        )}
                        {form.formState.errors.cooperativeCodePrefix ? (
                          <p className="su-err" role="alert">
                            {form.formState.errors.cooperativeCodePrefix.message}
                          </p>
                        ) : null}
                        <FormMessage className="su-err" />
                        <div aria-live="polite" className="su-code-line">
                          <span className="k">You will sign in with</span>
                          <span className="v">
                            <span className="pre">{prefix || "ABC"}</span>
                            {ownerCode.slice(ownerCode.indexOf("-"))}
                          </span>
                          <span className="note">
                            Every member&apos;s code starts with{" "}
                            <b>{prefix || "your letters"}</b>.
                          </span>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {availability.status === "error" ? (
                <div className="su-notice" role="status">
                  <b>Availability check paused</b>
                  {availability.message} We&apos;ll check again when you send.
                </div>
              ) : null}

              <FormField
                control={form.control}
                name="acceptedTerms"
                render={({ field }) => (
                  <FormItem className="su-field">
                    <label className="su-terms">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          inputRef={field.ref}
                          name={field.name}
                          onBlur={field.onBlur}
                          onCheckedChange={(checked) =>
                            field.onChange(checked === true)
                          }
                        />
                      </FormControl>
                      <span>
                        I accept the{" "}
                        <a href="/terms" rel="noreferrer" target="_blank">
                          platform terms
                        </a>{" "}
                        and have read the{" "}
                        <a href="/privacy" rel="noreferrer" target="_blank">
                          privacy notice
                        </a>
                        .
                      </span>
                    </label>
                    <FormMessage className="su-err" />
                  </FormItem>
                )}
              />

              <div className="su-submit">
                <Button
                  className="su-btn"
                  disabled={submitting || !canSubmit}
                  type="submit"
                >
                  {submitting ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Sending
                    </>
                  ) : (
                    "Send verification email"
                  )}
                </Button>
                <p>
                  Nothing is created until your email is verified. One monthly
                  bill, no cut of member funds.
                </p>
              </div>
              <nav aria-label="Legal and support" className="su-legal">
                <a href="/terms">Platform terms</a>
                <a href="/privacy">Privacy notice</a>
                <a href="/support">Support</a>
              </nav>
            </form>
          </Form>
        </div>
      </main>
      {preview}
    </div>
  )
}
