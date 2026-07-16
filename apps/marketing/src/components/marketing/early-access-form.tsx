"use client"

import { useState } from "react"
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
import { Spinner } from "@halaalvest/ui/components/spinner"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { useNotifications } from "@halaalvest/notifications-react"
import {
  earlyAccessRequestSchema,
  type EarlyAccessRequestInput,
} from "@/lib/early-access"

type EarlyAccessResponse = {
  approvalUrl?: string
  message?: string
}

export function EarlyAccessForm() {
  const form = useZodForm<EarlyAccessRequestInput>(earlyAccessRequestSchema, {
    defaultValues: {
      cooperativeName: "",
      message: "",
      phone: "",
      primaryContactEmail: "",
      primaryContactFullName: "",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<EarlyAccessResponse | null>(null)

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
                {result.approvalUrl}
              </AlertDescription>
            </Alert>
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
            Tell us who should receive the approved setup link. Workspace setup
            opens only after admin approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  <FormItem className="md:col-span-2">
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
                name="message"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Cooperative context</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Share member count, launch timeline, or setup needs."
                        rows={4}
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
