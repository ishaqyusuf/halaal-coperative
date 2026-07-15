"use client"

import { type ComponentProps, useTransition } from "react"
import { z } from "zod"
import { Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useNotifications } from "@halaalvest/notifications-react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyInput } from "@halaalvest/ui/components/currency-input"
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@halaalvest/ui/components/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@halaalvest/ui/components/select"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { cn } from "@halaalvest/ui/lib/utils"
import {
  applyDashboardDevFormFill,
  applyDashboardRandomDevFormFill,
} from "@/lib/dev-form-fill"
import { DatePickerInput } from "@/components/date-picker-input"
import { UploadEvidenceInput } from "@/components/upload-evidence-input"
import { objectToFormData } from "@/lib/form-submit"
import type { MemberCollectionSourceOption } from "@/lib/members/load-members-page"
import {
  createMemberAction,
  createMemberDocumentAction,
  sendMemberPortalAccessEmailAction,
  setMemberContributionPlanAction,
  updateMemberDocumentReviewAction,
  updateMemberKycAction,
} from "@/lib/dashboard-actions"
import { useTRPC } from "@/trpc/client"

function CurrencyFormInput({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void
  placeholder?: string
  value?: string
}) {
  return (
    <CurrencyInput
      allowNegative={false}
      decimalScale={2}
      inputMode="decimal"
      onValueChange={(values) => onChange(values.value)}
      placeholder={placeholder}
      value={value ?? ""}
      valueIsNumericString
    />
  )
}

type SelectFormInputOption = {
  label: string
  value: string
}

const memberPortalAccessSchema = z.object({
  memberId: z.string().min(1, "Member is required."),
})

type MemberPortalAccessValues = z.infer<typeof memberPortalAccessSchema>

export function MemberPortalAccessForm({ memberId }: { memberId: string }) {
  const form = useZodForm<MemberPortalAccessValues>(memberPortalAccessSchema, {
    defaultValues: {
      memberId,
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: MemberPortalAccessValues) {
    startTransition(async () => {
      try {
        await sendMemberPortalAccessEmailAction(objectToFormData(values))
        showSuccess(
          "Portal access sent",
          "The member can use the email link to set their password."
        )
      } catch (error) {
        showError(
          "Could not send portal access",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="memberId"
          render={({ field }) => <input type="hidden" {...field} />}
        />
        <Button disabled={isPending} type="submit" variant="outline">
          Send portal access
        </Button>
      </form>
    </Form>
  )
}

function SelectFormInput({
  className,
  disabled,
  onChange,
  options,
  placeholder,
  required,
  value,
  ...props
}: Omit<ComponentProps<typeof SelectTrigger>, "children" | "onChange"> & {
  disabled?: boolean
  onChange: (value: string) => void
  options: SelectFormInputOption[]
  placeholder?: string
  required?: boolean
  value?: string
}) {
  const selectedOption = options.find((option) => option.value === value)

  return (
    <Select
      disabled={disabled}
      required={required}
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onChange(nextValue)
        }
      }}
    >
      <SelectTrigger {...props} className={cn("w-full", className)}>
        <span
          className={cn(
            "truncate",
            selectedOption ? undefined : "text-muted-foreground"
          )}
        >
          {selectedOption?.label ?? placeholder}
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

const memberTypeOptions = [
  { label: "Individual", value: "individual" },
  { label: "Civil servant", value: "civil_servant" },
  { label: "Business", value: "business" },
]

const kycStatusOptions = [
  { label: "Not started", value: "not_started" },
  { label: "Pending", value: "pending" },
  { label: "Verified", value: "verified" },
  { label: "Rejected", value: "rejected" },
]

const reviewStatusOptions = [
  { label: "Pending", value: "pending" },
  { label: "Verified", value: "verified" },
  { label: "Rejected", value: "rejected" },
]

const memberCreateSchema = z
  .object({
    address: z.string().optional(),
    deductionSourceId: z.string().optional(),
    email: z
      .string()
      .email("Enter a valid email.")
      .optional()
      .or(z.literal("")),
    fullName: z.string().min(1, "Full name is required."),
    joinedAt: z.string().min(1, "Joined date is required."),
    memberNumber: z.string().min(1, "Member number is required."),
    memberType: z.enum(["individual", "civil_servant", "business"]),
    monthlyCommitment: z.string().min(1, "Starting commitment is required."),
    occupation: z.string().optional(),
    phoneNumber: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const monthlyCommitment = Number(values.monthlyCommitment)

    if (!Number.isFinite(monthlyCommitment) || monthlyCommitment <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Starting commitment must be greater than 0.",
        path: ["monthlyCommitment"],
      })
    }
  })

type MemberCreateValues = z.infer<typeof memberCreateSchema>
export type CreatedMemberSummary = {
  fullName: string
  id: string
  joinedAt: string
  memberNumber: string
}

function isBeforeCooperativeStartDate(
  value: string | undefined,
  cooperativeStartDate?: string | null
) {
  return Boolean(value && cooperativeStartDate && value < cooperativeStartDate)
}

const memberCommitmentSchema = z.object({
  amount: z.string().min(1, "Monthly commitment is required."),
  memberId: z.string().min(1),
  name: z.string().optional(),
  startsAt: z.string().min(1, "Effective date is required."),
})

type MemberCommitmentValues = z.infer<typeof memberCommitmentSchema>

export function MemberCommitmentForm({
  defaultStartDate,
  defaultAmount,
  memberId,
}: {
  defaultStartDate?: string
  defaultAmount?: string
  memberId: string
}) {
  const today = new Date().toISOString().slice(0, 10)
  const form = useZodForm<MemberCommitmentValues>(memberCommitmentSchema, {
    defaultValues: {
      amount: defaultAmount ?? "",
      memberId,
      name: "Monthly commitment",
      startsAt: defaultStartDate ?? today,
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: MemberCommitmentValues) {
    startTransition(async () => {
      try {
        await setMemberContributionPlanAction(objectToFormData(values))
        showSuccess("Commitment saved", "Monthly commitment history updated.")
      } catch (error) {
        showError(
          "Could not save commitment",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
        <input type="hidden" {...form.register("memberId")} />
        <input type="hidden" {...form.register("name")} />
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly amount</FormLabel>
                <FormControl>
                  <CurrencyFormInput {...field} placeholder="25000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startsAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Starts</FormLabel>
                <FormControl>
                  <DatePickerInput
                    {...field}
                    allowClear={false}
                    placeholder="Select start date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-end">
            <Button
              aria-label="Save dated commitment update"
              className="size-10 shrink-0 rounded-full p-0"
              disabled={isPending}
              type="submit"
              variant="outline"
            >
              <HugeiconsIcon icon={Tick02Icon} size={16} />
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

export function MemberCreateForm({
  canManageCollectionSources = false,
  collectionSourceOptions = [],
  cooperativeStartDate,
  devMode,
  inSheet = false,
  initialValues,
  memberNumberPrefix,
  onSuccess,
}: {
  canManageCollectionSources?: boolean
  collectionSourceOptions?: MemberCollectionSourceOption[]
  cooperativeStartDate?: string | null
  devMode: boolean
  inSheet?: boolean
  initialValues?: Partial<MemberCreateValues>
  memberNumberPrefix?: string | null
  onSuccess?: (member: CreatedMemberSummary) => void
}) {
  const form = useZodForm<MemberCreateValues>(memberCreateSchema, {
    defaultValues: {
      address: initialValues?.address ?? "",
      deductionSourceId: initialValues?.deductionSourceId ?? "none",
      email: initialValues?.email ?? "",
      fullName: initialValues?.fullName ?? "",
      joinedAt: initialValues?.joinedAt ?? "",
      monthlyCommitment: initialValues?.monthlyCommitment ?? "",
      memberNumber: initialValues?.memberNumber ?? "",
      memberType: initialValues?.memberType ?? "individual",
      occupation: initialValues?.occupation ?? "",
      phoneNumber: initialValues?.phoneNumber ?? "",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const queryClient = useQueryClient()
  const trpc = useTRPC()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: MemberCreateValues) {
    if (isBeforeCooperativeStartDate(values.joinedAt, cooperativeStartDate)) {
      form.setError("joinedAt", {
        message: `Joined date cannot be before the cooperative start date (${cooperativeStartDate}).`,
        type: "manual",
      })
      return
    }

    startTransition(async () => {
      try {
        const formData = objectToFormData(values)

        const createdMember = (await createMemberAction(
          formData
        )) as CreatedMemberSummary
        await queryClient.invalidateQueries(
          trpc.members.list.infiniteQueryFilter()
        )
        showSuccess("Member added", "Member record created.")
        form.reset({
          address: "",
          deductionSourceId: "none",
          email: "",
          fullName: "",
          joinedAt: "",
          monthlyCommitment: "",
          memberNumber: "",
          memberType: "individual",
          occupation: "",
          phoneNumber: "",
        })
        onSuccess?.(createdMember)
      } catch (error) {
        showError(
          "Could not add member",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className={
          inSheet
            ? "mt-6 flex flex-col gap-4"
            : "grid gap-4 rounded-lg border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-2 xl:grid-cols-5"
        }
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {inSheet ? (
          devMode ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  applyDashboardRandomDevFormFill(form, "member_create")
                }
              >
                Quick fill
              </Button>
            </div>
          ) : null
        ) : (
          <div className="flex items-start justify-between gap-4 xl:col-span-5">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                New member
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Capture the member profile, joined date, and starting
                commitment.
              </p>
            </div>
            {devMode ? (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  applyDashboardRandomDevFormFill(form, "member_create")
                }
              >
                Quick fill
              </Button>
            ) : null}
          </div>
        )}

          <div
            className={
            inSheet
              ? "grid gap-4 sm:grid-cols-4"
              : "grid gap-4 md:grid-cols-2 xl:col-span-5 xl:grid-cols-5"
          }
        >
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem className={inSheet ? "sm:col-span-3" : "xl:col-span-2"}>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Amina Yusuf" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="memberNumber"
            render={({ field }) => (
              <FormItem className={inSheet ? "sm:col-span-1" : undefined}>
                <FormLabel>Member No.</FormLabel>
                <FormControl>
                  {memberNumberPrefix ? (
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <InputGroupText>{memberNumberPrefix}</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput {...field} placeholder="1024" />
                    </InputGroup>
                  ) : (
                    <Input {...field} placeholder="1024" />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="memberType"
            render={({ field }) => (
              <FormItem className={inSheet ? "sm:col-span-2" : undefined}>
                <FormLabel>Member type</FormLabel>
                <FormControl>
                  <SelectFormInput
                    {...field}
                    options={memberTypeOptions}
                    placeholder="Select member type"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {canManageCollectionSources ? (
            <FormField
              control={form.control}
              name="deductionSourceId"
              render={({ field }) => (
                <FormItem className={inSheet ? "sm:col-span-2" : undefined}>
                  <FormLabel>Collection source</FormLabel>
                  <FormControl>
                    <SelectFormInput
                      {...field}
                      options={[
                        { label: "None/manual", value: "none" },
                        ...collectionSourceOptions.map((source) => ({
                          label: source.label,
                          value: source.id,
                        })),
                      ]}
                      placeholder="Select collection source"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          <FormField
            control={form.control}
            name="joinedAt"
            render={({ field }) => (
              <FormItem className={inSheet ? "sm:col-span-2" : undefined}>
                <FormLabel>Joined date</FormLabel>
                <FormControl>
                  <DatePickerInput
                    {...field}
                    allowClear={false}
                    min={cooperativeStartDate ?? undefined}
                    placeholder="Select joined date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="monthlyCommitment"
            render={({ field }) => (
              <FormItem className={inSheet ? "sm:col-span-2" : undefined}>
                <FormLabel>Starting commitment</FormLabel>
                <FormControl>
                  <CurrencyFormInput {...field} placeholder="25000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="occupation"
            render={({ field }) => (
              <FormItem className={inSheet ? "sm:col-span-2" : undefined}>
                <FormLabel>Occupation</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Trader" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem className={inSheet ? "sm:col-span-2" : undefined}>
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="+234 800 000 0000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className={inSheet ? "sm:col-span-2" : undefined}>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="amina@example.com"
                    type="email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className={inSheet ? "sm:col-span-4" : "xl:col-span-2"}>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="No. 12 Cooperative Road" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div
          className={
            inSheet
              ? "flex justify-end border-t border-border/70 pt-4"
              : "xl:col-span-5"
          }
        >
          <Button
            disabled={isPending}
            type="submit"
            className={inSheet ? "rounded-full px-5" : undefined}
          >
            Add member
          </Button>
        </div>
      </form>
    </Form>
  )
}

const memberKycSchema = z.object({
  governmentIdNumber: z.string().optional(),
  kycDocumentType: z.string().optional(),
  kycDocumentUrl: z.string().optional(),
  kycReviewNotes: z.string().optional(),
  kycStatus: z.enum(["not_started", "pending", "verified", "rejected"]),
  memberId: z.string().min(1),
})

type MemberKycValues = z.infer<typeof memberKycSchema>

export function MemberKycForm({
  defaultValues,
  devMode,
}: {
  defaultValues: MemberKycValues
  devMode: boolean
}) {
  const form = useZodForm<MemberKycValues>(memberKycSchema, { defaultValues })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: MemberKycValues) {
    startTransition(async () => {
      try {
        await updateMemberKycAction(objectToFormData(values))
        showSuccess("KYC saved", "Member KYC details updated.")
      } catch (error) {
        showError(
          "Could not save KYC",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 rounded-lg border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex items-start justify-between gap-4 md:col-span-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              KYC details
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Identity fields now follow the same shared dashboard form
              standard.
            </p>
          </div>
          {devMode ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                applyDashboardDevFormFill(form, "member_kyc", {
                  memberId: defaultValues.memberId,
                })
              }
            >
              Quick fill
            </Button>
          ) : null}
        </div>

        <FormField
          control={form.control}
          name="kycStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>KYC status</FormLabel>
              <FormControl>
                <SelectFormInput
                  {...field}
                  options={kycStatusOptions}
                  placeholder="Select status"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="kycDocumentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document type</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="National ID"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="governmentIdNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID number</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="kycDocumentUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document URL</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="kycReviewNotes"
          render={({ field }) => (
            <FormItem className="md:col-span-4">
              <FormLabel>Review notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  className="min-h-24"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-4">
          <Button disabled={isPending} type="submit">
            Save KYC
          </Button>
        </div>
      </form>
    </Form>
  )
}

const documentReferenceSchema = z
  .string()
  .min(1, "Document reference is required.")
  .refine((value) => {
    if (value.startsWith("/api/uploads/")) {
      return true
    }

    return z.string().url().safeParse(value).success
  }, "Document URL must be a valid URL or uploaded file reference.")

const memberDocumentSchema = z.object({
  documentType: z.string().min(1, "Document type is required."),
  documentUrl: documentReferenceSchema,
  memberId: z.string().min(1),
  reviewNotes: z.string().optional(),
  reviewStatus: z.enum(["pending", "verified", "rejected"]),
})

type MemberDocumentValues = z.infer<typeof memberDocumentSchema>

export function MemberDocumentForm({
  defaultMemberId,
  devMode,
}: {
  defaultMemberId: string
  devMode: boolean
}) {
  const form = useZodForm<MemberDocumentValues>(memberDocumentSchema, {
    defaultValues: {
      documentType: "",
      documentUrl: "",
      memberId: defaultMemberId,
      reviewNotes: "",
      reviewStatus: "pending",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: MemberDocumentValues) {
    startTransition(async () => {
      try {
        await createMemberDocumentAction(objectToFormData(values))
        showSuccess(
          "Document added",
          "KYC document attached to the member profile."
        )
        form.reset({
          documentType: "",
          documentUrl: "",
          memberId: defaultMemberId,
          reviewNotes: "",
          reviewStatus: "pending",
        })
      } catch (error) {
        showError(
          "Could not add document",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 rounded-lg border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex items-start justify-between gap-4 md:col-span-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Add KYC document
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Keep multiple identity and compliance documents on one member
              profile.
            </p>
          </div>
          {devMode ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                form.reset({
                  documentType: "National ID",
                  documentUrl: "https://example.com/kyc/member-document.pdf",
                  memberId: defaultMemberId,
                  reviewNotes: "Imported during KYC review.",
                  reviewStatus: "pending",
                })
              }
            >
              Quick fill
            </Button>
          ) : null}
        </div>

        <FormField
          control={form.control}
          name="documentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document type</FormLabel>
              <FormControl>
                <Input {...field} placeholder="National ID" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reviewStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial review status</FormLabel>
              <FormControl>
                <SelectFormInput
                  {...field}
                  options={reviewStatusOptions}
                  placeholder="Select status"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="documentUrl"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Document URL</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <UploadEvidenceInput
                    disabled={isPending}
                    onUploaded={(upload) =>
                      form.setValue("documentUrl", upload.url, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    purpose="member_document"
                    value={field.value}
                  />
                  <Input {...field} placeholder="https://..." />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reviewNotes"
          render={({ field }) => (
            <FormItem className="md:col-span-4">
              <FormLabel>Review notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  className="min-h-24"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-4">
          <Button disabled={isPending} type="submit">
            Add document
          </Button>
        </div>
      </form>
    </Form>
  )
}

const memberDocumentReviewSchema = z.object({
  documentId: z.string().min(1),
  reviewNotes: z.string().optional(),
  reviewStatus: z.enum(["pending", "verified", "rejected"]),
})

type MemberDocumentReviewValues = z.infer<typeof memberDocumentReviewSchema>

export function MemberDocumentReviewForm({
  defaultValues,
}: {
  defaultValues: MemberDocumentReviewValues
}) {
  const form = useZodForm<MemberDocumentReviewValues>(
    memberDocumentReviewSchema,
    { defaultValues }
  )
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: MemberDocumentReviewValues) {
    startTransition(async () => {
      try {
        await updateMemberDocumentReviewAction(objectToFormData(values))
        showSuccess("Document review saved", "Document review state updated.")
      } catch (error) {
        showError(
          "Could not save review",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="mt-3 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="reviewStatus"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <SelectFormInput
                  {...field}
                  options={reviewStatusOptions}
                  placeholder="Select status"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reviewNotes"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Review notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button disabled={isPending} size="sm" type="submit" variant="outline">
          Update review
        </Button>
      </form>
    </Form>
  )
}
