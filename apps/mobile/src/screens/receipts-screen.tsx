import { SectionCard } from "@/components/app/section-card"
import { StatCard } from "@/components/app/stat-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import {
  createMobileMemberSupportCase,
  createMobileMemberReceipt,
  getMobileMemberReceipts,
  type MobileMemberReceipts,
  type MobileReceiptAllocationCategory,
  type MobileReceiptPeriodIntent,
} from "@/lib/mobile-home-api"
import { isMockSessionToken } from "@/lib/session-store"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ScrollView, View } from "react-native"

type DraftAllocation = {
  amount: string
  category: MobileReceiptAllocationCategory
  id: string
  notes: string
  periodIntent: MobileReceiptPeriodIntent
}

const receiptCategories: {
  label: string
  value: MobileReceiptAllocationCategory
}[] = [
  { label: "Commitment", value: "commitment" },
  { label: "Special savings", value: "special_savings" },
  { label: "Shares", value: "shares" },
  { label: "Other", value: "other" },
]

const periodIntents: {
  label: string
  value: MobileReceiptPeriodIntent
}[] = [
  { label: "Current", value: "current_period" },
  { label: "Future", value: "future_period" },
  { label: "Back", value: "back_period" },
  { label: "Unspecified", value: "unspecified" },
]

function createDraftAllocation(): DraftAllocation {
  return {
    amount: "",
    category: "commitment",
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    notes: "",
    periodIntent: "current_period",
  }
}

function parseAmount(value: string) {
  const amount = Number(value.replace(/,/g, "").trim())

  return Number.isFinite(amount) ? amount : 0
}

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value))
}

function parsePaidAt(value: string) {
  const trimmed = value.trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null
  }

  const date = new Date(`${trimmed}T00:00:00.000Z`)

  return Number.isNaN(date.getTime()) ? null : date
}

export function ReceiptsScreen() {
  const { profile } = useAuthContext()
  const colors = useColors()
  const router = useRouter()
  const [receipts, setReceipts] = useState<MobileMemberReceipts | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [totalAmount, setTotalAmount] = useState("")
  const [paidAt, setPaidAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [paymentReference, setPaymentReference] = useState("")
  const [proofDocumentUrl, setProofDocumentUrl] = useState("")
  const [memberNotes, setMemberNotes] = useState("")
  const [supportReceiptId, setSupportReceiptId] = useState<string | null>(null)
  const [supportDescription, setSupportDescription] = useState("")
  const [isCreatingSupport, setIsCreatingSupport] = useState(false)
  const [allocations, setAllocations] = useState<DraftAllocation[]>(() => [
    createDraftAllocation(),
  ])
  const canUseServerReceipts = Boolean(
    profile?.role === "member" &&
    profile?.token &&
    !isMockSessionToken(profile.token)
  )
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const allocationTotal = useMemo(
    () =>
      allocations.reduce(
        (sum, allocation) => sum + parseAmount(allocation.amount),
        0
      ),
    [allocations]
  )
  const receiptAmount = parseAmount(totalAmount)
  const canSubmit = Boolean(
    receiptAmount > 0 &&
    Math.abs(receiptAmount - allocationTotal) < 0.005 &&
    allocations.every((allocation) => parseAmount(allocation.amount) > 0) &&
    parsePaidAt(paidAt)
  )
  const stats = useMemo(
    () => [
      {
        detail: "Submitted or under review",
        label: "Pending",
        value: String(receipts?.summary.pendingReviewReceipts ?? 0),
      },
      {
        detail: "Finance requested correction",
        label: "Corrections",
        value: String(receipts?.summary.correctionRequestedReceipts ?? 0),
      },
      {
        detail: "Approved receipt submissions",
        label: "Approved",
        value: String(receipts?.summary.approvedReceipts ?? 0),
      },
    ],
    [
      receipts?.summary.approvedReceipts,
      receipts?.summary.correctionRequestedReceipts,
      receipts?.summary.pendingReviewReceipts,
    ]
  )

  const loadReceipts = useCallback(() => {
    let mounted = true

    if (!canUseServerReceipts) {
      setReceipts(null)
      setError(null)
      setIsLoading(false)

      return () => {
        mounted = false
      }
    }

    setIsLoading(true)
    setError(null)

    void getMobileMemberReceipts()
      .then((response) => {
        if (mounted) {
          setReceipts(response)
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Receipts are unavailable.")
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [canUseServerReceipts])

  useEffect(() => loadReceipts(), [loadReceipts])

  function updateAllocation(
    id: string,
    patch: Partial<Omit<DraftAllocation, "id">>
  ) {
    setAllocations((current) =>
      current.map((allocation) =>
        allocation.id === id ? { ...allocation, ...patch } : allocation
      )
    )
  }

  async function handleCreateReceiptSupport(receiptId: string) {
    if (supportDescription.trim().length < 5 || isCreatingSupport) return

    setError(null)
    setSuccess(null)
    setIsCreatingSupport(true)

    try {
      await createMobileMemberSupportCase({
        category: "payment_issue",
        description: supportDescription.trim(),
        linkedRecordId: receiptId,
        linkedRecordType: "receipt",
        moneyImpactRequested: true,
        subject: "Receipt support request",
      })
      setSupportReceiptId(null)
      setSupportDescription("")
      setSuccess("Receipt support case opened.")
    } catch {
      setError("Receipt support case could not be opened.")
    } finally {
      setIsCreatingSupport(false)
    }
  }

  async function handleSubmit() {
    const paidDate = parsePaidAt(paidAt)

    if (!canSubmit || !paidDate || isSubmitting) return

    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      await createMobileMemberReceipt({
        allocations: allocations.map((allocation) => ({
          amount: parseAmount(allocation.amount),
          category: allocation.category,
          notes: allocation.notes.trim() || undefined,
          periodIntent: allocation.periodIntent,
        })),
        memberNotes: memberNotes.trim() || undefined,
        paidAt: paidDate.toISOString(),
        paymentReference: paymentReference.trim() || undefined,
        proofDocumentUrl: proofDocumentUrl.trim() || undefined,
        totalAmount: receiptAmount,
      })
      setTotalAmount("")
      setPaymentReference("")
      setProofDocumentUrl("")
      setMemberNotes("")
      setAllocations([createDraftAllocation()])
      setSuccess("Receipt submitted for finance review.")
      loadReceipts()
    } catch {
      setError("Receipt could not be submitted.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <Button
          className="h-10 self-start px-3"
          onPress={() => router.back()}
          variant="outline"
        >
          <Icon name="ArrowLeft" className="size-base text-foreground" />
          <Text>Back</Text>
        </Button>

        <View className="gap-2">
          <Text className="text-3xl font-black text-foreground">Receipts</Text>
          <Text className="text-base leading-6 text-muted-foreground">
            Submit staged payment proof for finance review.
          </Text>
        </View>

        {!canUseServerReceipts ? (
          <SectionCard icon="ReceiptText" title="Receipts">
            <Text className="text-sm leading-5 text-muted-foreground">
              Sign in with a production member account to submit and track
              receipts.
            </Text>
          </SectionCard>
        ) : null}

        {canUseServerReceipts ? (
          <>
            <View className="flex-row flex-wrap gap-3">
              {stats.map((item) => (
                <StatCard key={item.label} {...item} />
              ))}
            </View>

            <SectionCard icon="ReceiptText" title="Submit receipt">
              <View className="gap-3">
                <Input
                  editable={!isSubmitting}
                  keyboardType="numeric"
                  onChangeText={setTotalAmount}
                  placeholder="Total amount"
                  value={totalAmount}
                />
                <Input
                  autoCapitalize="none"
                  editable={!isSubmitting}
                  onChangeText={setPaymentReference}
                  placeholder="Payment reference"
                  value={paymentReference}
                />
                <Input
                  editable={!isSubmitting}
                  onChangeText={setPaidAt}
                  placeholder="Paid date (YYYY-MM-DD)"
                  value={paidAt}
                />
                <Input
                  autoCapitalize="none"
                  editable={!isSubmitting}
                  onChangeText={setProofDocumentUrl}
                  placeholder="Proof link"
                  value={proofDocumentUrl}
                />

                <View className="gap-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-semibold text-foreground">
                      Allocations
                    </Text>
                    <Button
                      className="h-9"
                      onPress={() =>
                        setAllocations((current) => [
                          ...current,
                          createDraftAllocation(),
                        ])
                      }
                      variant="outline"
                    >
                      <Icon name="Plus" className="size-sm text-foreground" />
                      <Text>Add split</Text>
                    </Button>
                  </View>

                  {allocations.map((allocation, index) => (
                    <View
                      className="gap-3 rounded-md border border-border p-3"
                      key={allocation.id}
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-semibold text-foreground">
                          Allocation {index + 1}
                        </Text>
                        {allocations.length > 1 ? (
                          <Button
                            className="h-8 px-2"
                            onPress={() =>
                              setAllocations((current) =>
                                current.filter(
                                  (item) => item.id !== allocation.id
                                )
                              )
                            }
                            variant="ghost"
                          >
                            <Icon
                              name="Trash2"
                              className="size-sm text-destructive"
                            />
                          </Button>
                        ) : null}
                      </View>
                      <View className="flex-row flex-wrap gap-2">
                        {receiptCategories.map((item) => {
                          const isActive = item.value === allocation.category

                          return (
                            <Button
                              className="h-9"
                              key={item.value}
                              onPress={() =>
                                updateAllocation(allocation.id, {
                                  category: item.value,
                                })
                              }
                              variant={isActive ? "secondary" : "outline"}
                            >
                              <Text>{item.label}</Text>
                            </Button>
                          )
                        })}
                      </View>
                      <Input
                        editable={!isSubmitting}
                        keyboardType="numeric"
                        onChangeText={(value) =>
                          updateAllocation(allocation.id, { amount: value })
                        }
                        placeholder="Allocation amount"
                        value={allocation.amount}
                      />
                      <View className="flex-row flex-wrap gap-2">
                        {periodIntents.map((item) => {
                          const isActive =
                            item.value === allocation.periodIntent

                          return (
                            <Button
                              className="h-9"
                              key={item.value}
                              onPress={() =>
                                updateAllocation(allocation.id, {
                                  periodIntent: item.value,
                                })
                              }
                              variant={isActive ? "secondary" : "outline"}
                            >
                              <Text>{item.label}</Text>
                            </Button>
                          )
                        })}
                      </View>
                      <Input
                        editable={!isSubmitting}
                        onChangeText={(value) =>
                          updateAllocation(allocation.id, { notes: value })
                        }
                        placeholder="Allocation notes"
                        value={allocation.notes}
                      />
                    </View>
                  ))}
                </View>

                <Textarea
                  editable={!isSubmitting}
                  onChangeText={setMemberNotes}
                  placeholder="Member notes"
                  value={memberNotes}
                />
                <Text className="text-sm text-muted-foreground">
                  Allocation total:{" "}
                  {formatCurrency(allocationTotal, currencyCode)}
                </Text>
                {error ? (
                  <Text className="text-sm font-medium text-destructive">
                    {error}
                  </Text>
                ) : null}
                {success ? (
                  <Text className="text-success text-sm font-medium">
                    {success}
                  </Text>
                ) : null}
                <Button
                  className="h-12"
                  disabled={!canSubmit || isSubmitting}
                  onPress={handleSubmit}
                >
                  <Icon
                    name="Send"
                    className="size-base text-primary-foreground"
                  />
                  <Text>
                    {isSubmitting ? "Submitting" : "Submit for review"}
                  </Text>
                </Button>
              </View>
            </SectionCard>

            <SectionCard icon="ClipboardList" title="Recent receipts">
              {isLoading ? (
                <LoadingSpinner />
              ) : receipts?.receipts.length ? (
                <View className="gap-3">
                  {receipts.receipts.map((receipt) => (
                    <View
                      className="gap-1 rounded-md bg-secondary p-3"
                      key={receipt.id}
                    >
                      <View className="flex-row items-start justify-between gap-3">
                        <Text className="flex-1 font-semibold text-foreground">
                          {receipt.paymentReference ??
                            formatDate(receipt.paidAt)}
                        </Text>
                        <Text className="text-xs font-medium text-muted-foreground">
                          {formatStatus(receipt.status)}
                        </Text>
                      </View>
                      <Text className="text-sm leading-5 text-muted-foreground">
                        {formatCurrency(receipt.totalAmount, currencyCode)} -{" "}
                        {receipt.allocations.length} allocation(s)
                      </Text>
                      {receipt.reviewNotes ? (
                        <Text className="text-xs text-muted-foreground">
                          {receipt.reviewNotes}
                        </Text>
                      ) : null}
                      <Text className="text-xs text-muted-foreground">
                        Submitted {formatDate(receipt.submittedAt)}
                      </Text>
                      {supportReceiptId === receipt.id ? (
                        <View className="gap-2 pt-2">
                          <Textarea
                            editable={!isCreatingSupport}
                            onChangeText={setSupportDescription}
                            placeholder="Describe the payment issue"
                            value={supportDescription}
                          />
                          <View className="flex-row gap-2">
                            <Button
                              className="h-10 flex-1"
                              disabled={
                                supportDescription.trim().length < 5 ||
                                isCreatingSupport
                              }
                              onPress={() =>
                                handleCreateReceiptSupport(receipt.id)
                              }
                            >
                              <Icon
                                name="Send"
                                className="size-base text-primary-foreground"
                              />
                              <Text>
                                {isCreatingSupport ? "Opening" : "Open case"}
                              </Text>
                            </Button>
                            <Button
                              className="h-10 flex-1"
                              disabled={isCreatingSupport}
                              onPress={() => {
                                setSupportReceiptId(null)
                                setSupportDescription("")
                              }}
                              variant="outline"
                            >
                              <Text>Cancel</Text>
                            </Button>
                          </View>
                        </View>
                      ) : (
                        <Button
                          className="h-10 self-start"
                          disabled={isCreatingSupport}
                          onPress={() => {
                            setSupportReceiptId(receipt.id)
                            setSupportDescription("")
                            setError(null)
                            setSuccess(null)
                          }}
                          variant="outline"
                        >
                          <Icon
                            name="MessageCirclePlus"
                            className="size-base"
                          />
                          <Text>Open support case</Text>
                        </Button>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-sm leading-5 text-muted-foreground">
                  No payment receipts yet.
                </Text>
              )}
            </SectionCard>
          </>
        ) : null}
      </ScrollView>
    </SafeArea>
  )
}
