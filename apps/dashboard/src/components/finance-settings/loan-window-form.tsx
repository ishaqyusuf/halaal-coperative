"use client"

import { Button } from "@halaalvest/ui/components/button"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { formatCurrency } from "@halaalvest/utils"
import { useState } from "react"
import { ConfirmActionDialog } from "@/components/confirm-action-dialog"
import { useFinanceSettingsSave } from "@/components/finance-settings/use-finance-settings-save"
import { RequestChoice } from "@/components/requests/request-choice"
import {
  RequestField,
  RequestFormActions,
} from "@/components/requests/request-field"
import { useTenantFinanceSettingsParams } from "@/hooks/use-tenant-finance-settings-params"
import {
  openMonthlyFinancingCycleAction,
  updateMonthlyFinancingCycleStatusAction,
} from "@/lib/dashboard-actions"
import { getLoanWindowWords } from "@/lib/finance/finance-settings-words"
import { objectToFormData } from "@/lib/form-submit"

type WindowAction = "closed" | "open" | "paused"

const confirmCopy: Record<
  WindowAction,
  { action: string; description: string; title: string }
> = {
  closed: {
    action: "Close for this month",
    description:
      "This can't be undone. Members can't ask for loans again until next month.",
    title: "Close loan requests for this month?",
  },
  open: {
    action: "Open loan requests",
    description: "Members can ask for loans from now on.",
    title: "Open loan requests?",
  },
  paused: {
    action: "Pause loan requests",
    description:
      "Members can't ask for new loans until you open requests again. Requests already made stay.",
    title: "Pause loan requests?",
  },
}

/** Open, pause or close this month's loan requests. */
export function LoanWindowForm({
  monthLabel,
  preview,
}: {
  monthLabel: string
  preview: {
    existingCycle: { id: string; status: string } | null
    normal: { budgetAmount: number }
    quick: { budgetAmount: number }
    totalCapacityAmount: number
  }
}) {
  const cycle = preview.existingCycle
  const status = cycle?.status ?? "draft"
  const choices: Array<{ label: string; value: WindowAction }> =
    status === "open"
      ? [
          { label: "Pause for now", value: "paused" },
          { label: "Close for this month", value: "closed" },
        ]
      : status === "paused"
        ? [
            { label: "Open again", value: "open" },
            { label: "Close for this month", value: "closed" },
          ]
        : []
  const [choice, setChoice] = useState<WindowAction>(
    choices[0]?.value ?? "open"
  )
  const [note, setNote] = useState("")
  const [confirming, setConfirming] = useState(false)
  const { setParams } = useTenantFinanceSettingsParams()
  const { isPending, save } = useFinanceSettingsSave({
    onDone: () => setParams(null),
    successTitle: "Loan requests updated",
  })
  const copy = confirmCopy[choice]
  const opensFresh = !cycle || status === "draft"

  if (status === "closed") {
    return (
      <div className="grid gap-4 text-base">
        <p>
          Loan requests for {monthLabel} are closed. They open again next
          month.
        </p>
      </div>
    )
  }

  function onConfirm() {
    save(
      () =>
        opensFresh
          ? openMonthlyFinancingCycleAction(
              objectToFormData({ statusNote: note.trim() })
            )
          : updateMonthlyFinancingCycleStatusAction(
              objectToFormData({
                financingCycleId: cycle?.id ?? "",
                status: choice,
                statusNote: note.trim(),
              })
            ),
      () => setConfirming(false)
    )
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        setConfirming(true)
      }}
    >
      <p className="text-base">
        Now: <span className="font-semibold">{getLoanWindowWords(status)}</span>
      </p>
      {choices.length ? (
        <RequestChoice
          label="What do you want to do?"
          onChange={setChoice}
          options={choices}
          value={choice}
        />
      ) : null}
      <RequestField label="Note for the record" optional>
        <Textarea
          className="min-h-20 text-base"
          onChange={(event) => setNote(event.target.value)}
          placeholder="For example: agreed at the board meeting"
          value={note}
        />
      </RequestField>
      <RequestFormActions>
        <Button disabled={isPending} type="submit">
          {opensFresh ? "Open loan requests" : copy.action}
        </Button>
      </RequestFormActions>

      <ConfirmActionDialog
        actionLabel={copy.action}
        description={copy.description}
        destructive={choice === "closed"}
        onCancel={() => setConfirming(false)}
        onConfirm={onConfirm}
        open={confirming}
        pending={isPending}
        title={copy.title}
      >
        {opensFresh ? (
          <p className="text-base">
            {formatCurrency(preview.totalCapacityAmount)} is set aside for{" "}
            {monthLabel}: {formatCurrency(preview.quick.budgetAmount)} for
            quick loans and {formatCurrency(preview.normal.budgetAmount)} for
            normal loans. These amounts stay the same all month.
          </p>
        ) : null}
      </ConfirmActionDialog>
    </form>
  )
}
