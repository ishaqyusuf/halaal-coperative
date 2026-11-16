"use client"

import { type ComponentProps, useTransition } from "react"
import type { Control, FieldValues, Path } from "react-hook-form"
import { z } from "zod"
import { useNotifications } from "@halaalvest/notifications-react"
import { useTenantRouter } from "@halaalvest/tenant-url/next"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyFormInput } from "@halaalvest/ui/components/currency-input"
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
import { applyDashboardDevFormFill } from "@/lib/dev-form-fill"
import { DashboardQuickFill } from "@/components/dashboard-quick-fill"
import { DatePickerInput } from "@/components/date-picker-input"
import { UploadEvidenceInput } from "@/components/upload-evidence-input"
import { objectToFormData } from "@/lib/form-submit"
import type { MemberCollectionSourceOption } from "@/lib/members/load-members-page"
import {
  getMemberKycStatusHint,
  getMemberKycStatusOptions,
} from "@/lib/members/member-kyc-transitions"
import {
  createMemberAction,
  createMemberDocumentAction,
  sendMemberPortalAccessEmailAction,
  setMemberContributionPlanAction,
  updateMemberAction,
  updateMemberDocumentReviewAction,
  updateMemberKycAction,
} from "@/lib/dashboard-actions"
import { formatDayMonthYear } from "@/utils/format"
import { useTRPC } from "@/trpc/client"

type SelectFormInputOption = {
  label: string
  value: string
}

const memberPortalAccessSchema = z.object({
  memberId: z.string().min(1, "Member is required."),
})

type MemberPortalAccessValues = z.infer<typeof memberPortalAccessSchema>

export function MemberPortalAccessForm({
  email,
  memberId,
  onSuccess,
}: {
  email?: string | null
  memberId: string
  onSuccess?: () => void
}) {
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
          "Email sent",
          "The member can use the link to set a password."
        )
        onSuccess?.()
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
      <form
        className="flex flex-col gap-5"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="memberId"
          render={({ field }) => <input type="hidden" {...field} />}
        />
        <p className="text-sm leading-6 text-foreground">
          {email ? (
            <>
              We will email <strong className="break-all">{email}</strong> a
              link to set a password.
            </>
          ) : (
            "This member has no email yet. Add one with Edit details first."
          )}
        </p>
        <div className="flex justify-end">
          <Button
            className="w-full sm:w-auto"
            disabled={isPending || !email}
            type="submit"
          >
            {isPending ? "Sending..." : "Send email"}
          </Button>
        </div>
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
  onSuccess,
  startsAtGoLive = false,
}: {
  defaultStartDate?: string
  defaultAmount?: string
  memberId: string
  onSuccess?: () => void
  /** Setup: the amount starts the month of go-live, so there is no date. */
  startsAtGoLive?: boolean
}) {
  const today = new Date().toISOString().slice(0, 10)
  const form = useZodForm<MemberCommitmentValues>(memberCommitmentSchema, {
    defaultValues: {
      amount: defaultAmount ?? "",
      memberId,
      name: "Monthly commitment",
      startsAt: startsAtGoLive ? today : (defaultStartDate ?? today),
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: MemberCommitmentValues) {
    startTransition(async () => {
      try {
        await setMemberContributionPlanAction(objectToFormData(values))
        showSuccess(
          "Monthly savings saved",
          startsAtGoLive
            ? "It starts the month your cooperative goes live."
            : "The new amount is on record."
        )
        onSuccess?.()
      } catch (error) {
        showError(
          "Could not save monthly savings",
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
        <DashboardQuickFill
          form={form}
          onFill={({ emailDomain }) =>
            applyDashboardDevFormFill(form, "member_commitment", undefined, {
              emailDomain,
            })
          }
        />
        <div
          className={
            startsAtGoLive ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"
          }
        >
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly amount</FormLabel>
                <FormControl>
                  <CurrencyFormInput {...field} />
                </FormControl>
                {startsAtGoLive ? (
                  <FormDescription>
                    Nothing is due before you go live. It counts towards the
                    money you can lend in your first month.
                  </FormDescription>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />
          {startsAtGoLive ? (
            <input type="hidden" {...form.register("startsAt")} />
          ) : (
            <FormField
              control={form.control}
              name="startsAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From</FormLabel>
                  <FormControl>
                    <DatePickerInput
                      {...field}
                      allowClear={false}
                      placeholder="Pick a date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        <div className="flex justify-end">
          <Button
            className="w-full sm:w-auto"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

function WorkplaceSelectField<TValues extends FieldValues>({
  control,
  options,
}: {
  control: Control<TValues>
  options: SelectFormInputOption[]
}) {
  return (
    <FormField
      control={control}
      name={"deductionSourceId" as Path<TValues>}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Workplace</FormLabel>
          <FormControl>
            <SelectFormInput
              {...field}
              options={[{ label: "None", value: "none" }, ...options]}
              placeholder="Choose a workplace"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/** Optional profile fields, folded away so the create form stays short. */
function MoreMemberDetails({ children }: { children: React.ReactNode }) {
  return (
    <details className="group rounded-lg border border-border/70">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium text-foreground">
        More details (optional)
        <span
          aria-hidden
          className="text-muted-foreground transition-transform group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="grid gap-4 border-t border-border/70 p-4 sm:grid-cols-2">
        {children}
      </div>
    </details>
  )
}

export function MemberCreateForm({
  canManageCollectionSources = false,
  collectionSourceOptions = [],
  cooperativeStartDate,
  devMode,
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
  const emptyValues: MemberCreateValues = {
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
  }
  const form = useZodForm<MemberCreateValues>(memberCreateSchema, {
    defaultValues: { ...emptyValues, ...initialValues },
  })
  const { showError, showSuccess } = useNotifications()
  const queryClient = useQueryClient()
  const router = useTenantRouter()
  const trpc = useTRPC()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: MemberCreateValues) {
    if (isBeforeCooperativeStartDate(values.joinedAt, cooperativeStartDate)) {
      form.setError("joinedAt", {
        message: `Joined date can't be before the cooperative started (${formatDayMonthYear(cooperativeStartDate)}).`,
        type: "manual",
      })
      return
    }

    startTransition(async () => {
      try {
        const createdMember = (await createMemberAction(
          objectToFormData(values)
        )) as CreatedMemberSummary
        await queryClient.invalidateQueries(
          trpc.members.list.infiniteQueryFilter()
        )
        router.refresh()
        showSuccess("Member added", `${values.fullName} is now a member.`)
        form.reset(emptyValues)
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
        className="flex flex-col gap-5"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {devMode ? (
          <div className="flex justify-end">
            <DashboardQuickFill
              form={form}
              onFill={({ emailDomain }) =>
                applyDashboardDevFormFill(form, "member_create", undefined, {
                  emailDomain,
                })
              }
            />
          </div>
        ) : null}

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="off" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="memberNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Member number</FormLabel>
                <FormControl>
                  {memberNumberPrefix ? (
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <InputGroupText>{memberNumberPrefix}</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput {...field} inputMode="numeric" />
                    </InputGroup>
                  ) : (
                    <Input {...field} />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="joinedAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Joined on</FormLabel>
                <FormControl>
                  <DatePickerInput
                    {...field}
                    allowClear={false}
                    min={cooperativeStartDate ?? undefined}
                    placeholder="Pick a date"
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
              <FormItem>
                <FormLabel>Monthly savings</FormLabel>
                <FormControl>
                  <CurrencyFormInput {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="tel" type="tel" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {canManageCollectionSources ? (
            <WorkplaceSelectField<MemberCreateValues>
              control={form.control}
              options={collectionSourceOptions.map((source) => ({
                label: source.label,
                value: source.id,
              }))}
            />
          ) : null}
          <FormField
            control={form.control}
            name="memberType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Member type</FormLabel>
                <FormControl>
                  <SelectFormInput
                    {...field}
                    options={memberTypeOptions}
                    placeholder="Choose a type"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <MoreMemberDetails>
          <MemberContactFields control={form.control} />
        </MoreMemberDetails>

        <div className="flex justify-end border-t border-border/70 pt-4">
          <Button
            className="w-full sm:w-auto"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Adding..." : "Add member"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

/** Email, occupation and address: the same fields on create and edit. */
function MemberContactFields<TValues extends FieldValues>({
  control,
}: {
  control: Control<TValues>
}) {
  return (
    <>
      <FormField
        control={control}
        name={"email" as Path<TValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input {...field} inputMode="email" type="email" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={"occupation" as Path<TValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Occupation</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={"address" as Path<TValues>}
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Address</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}

const memberEditSchema = z.object({
  address: z.string().optional(),
  deductionSourceId: z.string().optional(),
  email: z.string().email("Enter a valid email.").optional().or(z.literal("")),
  fullName: z.string().trim().min(1, "Full name is required."),
  memberId: z.string().min(1),
  memberType: z.enum(["individual", "civil_servant", "business"]),
  occupation: z.string().optional(),
  phoneNumber: z.string().optional(),
})

type MemberEditValues = z.infer<typeof memberEditSchema>

export type MemberEditDefaults = {
  address?: string | null
  deductionSourceId?: string | null
  email?: string | null
  fullName: string
  id: string
  memberType: string
  occupation?: string | null
  phoneNumber?: string | null
}

export function MemberEditForm({
  canChangeWorkplace,
  member,
  onSuccess,
  workplaceOptions,
}: {
  canChangeWorkplace: boolean
  member: MemberEditDefaults
  onSuccess?: () => void
  workplaceOptions: SelectFormInputOption[]
}) {
  const form = useZodForm<MemberEditValues>(memberEditSchema, {
    defaultValues: {
      address: member.address ?? "",
      deductionSourceId: member.deductionSourceId ?? "none",
      email: member.email ?? "",
      fullName: member.fullName,
      memberId: member.id,
      memberType: memberTypeOptions.some(
        (option) => option.value === member.memberType
      )
        ? (member.memberType as MemberEditValues["memberType"])
        : "individual",
      occupation: member.occupation ?? "",
      phoneNumber: member.phoneNumber ?? "",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const queryClient = useQueryClient()
  const trpc = useTRPC()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: MemberEditValues) {
    const { deductionSourceId, ...profile } = values

    startTransition(async () => {
      try {
        await updateMemberAction(
          objectToFormData(
            canChangeWorkplace ? { ...profile, deductionSourceId } : profile
          )
        )
        await queryClient.invalidateQueries(
          trpc.members.list.infiniteQueryFilter()
        )
        showSuccess(
          "Changes saved",
          `${values.fullName}'s details are updated.`
        )
        onSuccess?.()
      } catch (error) {
        showError(
          "Could not save changes",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-5"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <input type="hidden" {...form.register("memberId")} />
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="off" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="tel" type="tel" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {canChangeWorkplace ? (
            <WorkplaceSelectField<MemberEditValues>
              control={form.control}
              options={workplaceOptions}
            />
          ) : null}
          <FormField
            control={form.control}
            name="memberType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Member type</FormLabel>
                <FormControl>
                  <SelectFormInput
                    {...field}
                    options={memberTypeOptions}
                    placeholder="Choose a type"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <MemberContactFields control={form.control} />
        </div>
        <div className="flex justify-end border-t border-border/70 pt-4">
          <Button
            className="w-full sm:w-auto"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Saving..." : "Save changes"}
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
  onSuccess,
}: {
  defaultValues: MemberKycValues
  devMode: boolean
  onSuccess?: () => void
}) {
  const form = useZodForm<MemberKycValues>(memberKycSchema, { defaultValues })
  const kycStatusOptions = getMemberKycStatusOptions(defaultValues.kycStatus)
  const kycStatusHint = getMemberKycStatusHint(defaultValues.kycStatus)
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: MemberKycValues) {
    startTransition(async () => {
      try {
        await updateMemberKycAction(objectToFormData(values))
        showSuccess("KYC saved", "Member KYC details updated.")
        onSuccess?.()
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
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="kycStatus"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>KYC status</FormLabel>
              <FormControl>
                <SelectFormInput
                  {...field}
                  options={kycStatusOptions}
                  placeholder="Select status"
                />
              </FormControl>
              <FormDescription>{kycStatusHint}</FormDescription>
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
              <FormLabel>Document link</FormLabel>
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
            <FormItem className="sm:col-span-2">
              <FormLabel>Notes</FormLabel>
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
        <div className="flex justify-end border-t border-border/70 pt-4 sm:col-span-2">
          <Button
            className="w-full sm:w-auto"
            disabled={isPending}
            type="submit"
          >
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
  onSuccess,
}: {
  defaultMemberId: string
  devMode: boolean
  onSuccess?: () => void
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
        onSuccess?.()
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
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex justify-end sm:col-span-2">
          {devMode ? (
            <DashboardQuickFill
              form={form}
              onFill={({ emailDomain }) =>
                applyDashboardDevFormFill(
                  form,
                  "member_document",
                  {
                    memberId: defaultMemberId,
                    reviewNotes: "Checked against the member's NIN slip.",
                  },
                  { emailDomain }
                )
              }
            />
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
              <FormLabel>Status</FormLabel>
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
            <FormItem className="sm:col-span-2">
              <FormLabel>Document link</FormLabel>
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
            <FormItem className="sm:col-span-2">
              <FormLabel>Notes</FormLabel>
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
        <div className="flex justify-end border-t border-border/70 pt-4 sm:col-span-2">
          <Button
            className="w-full sm:w-auto"
            disabled={isPending}
            type="submit"
          >
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
  onSuccess,
}: {
  defaultValues: MemberDocumentReviewValues
  onSuccess?: () => void
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
        onSuccess?.()
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
