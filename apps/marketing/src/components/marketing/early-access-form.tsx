"use client"

import { useState } from "react"
import type { QaNotificationPreview } from "@halaalvest/notifications"
import {
  QaNotificationPreviewCard,
  useNotifications,
} from "@halaalvest/notifications-react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@halaalvest/ui/components/alert"
import { Button } from "@halaalvest/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@halaalvest/ui/components/card"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { FieldGroup } from "@halaalvest/ui/components/field"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaalvest/ui/components/form"
import { Input } from "@halaalvest/ui/components/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@halaalvest/ui/components/select"
import { Spinner } from "@halaalvest/ui/components/spinner"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import type { QaQuickFillContext } from "@halaalvest/utils"
import {
  cooperativeSizeRanges,
  formatCooperativeSizeRangeLabel,
} from "@halaalvest/domain"
import {
  earlyAccessLaunchTimelineOptions,
  earlyAccessRecordSystemOptions,
  earlyAccessRequestSchema,
  earlyAccessSetupNeedOptions,
  type EarlyAccessRequestInput,
} from "@/lib/early-access"
import { applyDevFormFill } from "@/lib/dev-form-fill"

type EarlyAccessResponse = {
  approveAndContinueUrl?: string
  approvalUrl?: string
  message?: string
  qaPreviews?: QaNotificationPreview[]
}

export function EarlyAccessForm({
  quickFill,
}: {
  quickFill: QaQuickFillContext
}) {
  const form = useZodForm<EarlyAccessRequestInput>(earlyAccessRequestSchema, {
    defaultValues: {
      cooperativeName: "",
      currentSize: "",
      launchTimeline: "",
      message: "",
      phone: "",
      primaryContactEmail: "",
      primaryContactFullName: "",
      recordSystem: "",
      setupNeeds: [],
    },
  })
  const { publishQaPreviews, showError, showSuccess } = useNotifications()
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<EarlyAccessResponse | null>(null)
  const [qaDomain, setQaDomain] = useState(quickFill.emailDomain)

  async function onSubmit(values: EarlyAccessRequestInput) {
    try {
      setSubmitting(true)

      const response = await fetch("/api/early-access", {
        body: JSON.stringify(values),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      })
      const payload = (await response.json()) as EarlyAccessResponse & {
        error?: string
      }

      if (!response.ok) {
        throw new Error(
          payload.error ?? "We could not submit the early access request."
        )
      }

      setResult(payload)
      publishQaPreviews(payload.qaPreviews)
      form.reset()
      showSuccess(
        "Early access request received",
        payload.message ?? "We will email you after approval."
      )
    } catch (error) {
      showError(
        "Early access request failed",
        error instanceof Error ? error.message : "Something went wrong."
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    const latestPreview = result.qaPreviews?.at(-1)

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Request received</CardTitle>
          <CardDescription>
            We will review the cooperative details and email the approved setup
            link to the primary contact.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTitle>Approval required</AlertTitle>
            <AlertDescription>
              {result.message ??
                "Your early access request has been received. We will email you after approval."}
            </AlertDescription>
          </Alert>

          {result.approvalUrl ? (
            <Alert>
              <AlertTitle>Development approval link</AlertTitle>
              <AlertDescription className="break-all">
                <a className="underline" href={result.approvalUrl}>
                  {result.approvalUrl}
                </a>
              </AlertDescription>
            </Alert>
          ) : null}

          {latestPreview ? (
            <QaNotificationPreviewCard preview={latestPreview} />
          ) : null}

          {result.approveAndContinueUrl ? (
            <Button
              render={<a href={result.approveAndContinueUrl} />}
              type="button"
            >
              Approve and get started
            </Button>
          ) : null}

          <Button
            type="button"
            variant="outline"
            onClick={() => setResult(null)}
          >
            Submit another request
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Form {...form}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Request early access</CardTitle>
          <CardDescription>
            Tell us who owns setup and how the cooperative operates today. We
            use these details to prepare the right approval and migration path.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quickFill.enabled ? (
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
              <div className="min-w-56 flex-1">
                <p className="text-sm font-medium text-amber-950 dark:text-amber-50">
                  QA identity
                </p>
                <Select
                  value={qaDomain}
                  onValueChange={(value) =>
                    setQaDomain(value ?? quickFill.emailDomain)
                  }
                >
                  <SelectTrigger className="mt-2 w-full bg-background">
                    <SelectValue placeholder="Select QA domain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {quickFill.qaDomains.map((domain) => (
                        <SelectItem key={domain} value={domain}>
                          @{domain}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  applyDevFormFill(form, "earlyAccess", undefined, {
                    emailDomain: qaDomain,
                  })
                }
              >
                Quick fill
              </Button>
            </div>
          ) : null}
          <form
            className="flex flex-col gap-5"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="cooperativeName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Cooperative name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter cooperative name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="primaryContactFullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary contact</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="primaryContactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary contact email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input placeholder="+234..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current cooperative size</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? "")}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select member range">
                            {field.value
                              ? formatCooperativeSizeRangeLabel(field.value, "")
                              : undefined}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {cooperativeSizeRanges.map((range) => (
                            <SelectItem
                              key={range.value}
                              value={String(range.value)}
                            >
                              {range.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recordSystem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How are records managed today?</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? "")}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select current system">
                            {
                              earlyAccessRecordSystemOptions.find(
                                (option) => option.value === field.value
                              )?.label
                            }
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {earlyAccessRecordSystemOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="launchTimeline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>When do you want to start setup?</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? "")}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select target timeline">
                            {
                              earlyAccessLaunchTimelineOptions.find(
                                (option) => option.value === field.value
                              )?.label
                            }
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {earlyAccessLaunchTimelineOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="setupNeeds"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>What should the setup cover?</FormLabel>
                    <div className="grid gap-2 md:grid-cols-2">
                      {earlyAccessSetupNeedOptions.map((option) => {
                        const checked = field.value.includes(option.value)

                        return (
                          <label
                            className="flex cursor-pointer gap-3 border border-border/70 bg-muted/20 p-3 text-sm has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
                            key={option.value}
                          >
                            <FormControl>
                              <Checkbox
                                aria-label={`${option.label}. ${option.description}`}
                                checked={checked}
                                className="mt-0.5"
                                onCheckedChange={(nextChecked) =>
                                  field.onChange(
                                    nextChecked === true
                                      ? [...field.value, option.value]
                                      : field.value.filter(
                                          (value) => value !== option.value
                                        )
                                  )
                                }
                              />
                            </FormControl>
                            <span aria-hidden="true">
                              <span className="block font-medium text-foreground">
                                {option.label}
                              </span>
                              <span className="mt-1 block text-muted-foreground">
                                {option.description}
                              </span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>
                      Anything else we should know? (optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add a constraint, deadline, or operating detail we have not captured above."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FieldGroup>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" disabled={submitting} type="submit">
                {submitting ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Submitting
                  </>
                ) : (
                  "Request early access"
                )}
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">
                Approved cooperatives receive a private setup link by email.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </Form>
  )
}
