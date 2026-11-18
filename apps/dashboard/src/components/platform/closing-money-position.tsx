const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
})

type ClosingLine = {
  kind: string
  label: string
  amount: number | null
  count: number | null
  outstanding: boolean
}

export type ClosingMoneyPositionData = {
  canCloseLogin: boolean
  members: {
    memberId: string
    tenantName: string
    memberNumber: string
    exited: boolean
    settled: boolean
    lines: ClosingLine[]
  }[]
}

function lineValue(line: ClosingLine) {
  if (line.kind === "guarantees")
    return line.count === 1 ? "1 active" : `${line.count ?? 0} active`
  return naira.format(line.amount ?? 0)
}

function memberState(member: ClosingMoneyPositionData["members"][number]) {
  if (member.exited) return "Marked exited by the cooperative"
  return member.settled ? "Nothing to settle" : "Not settled yet"
}

/**
 * The member's money with each cooperative, read on the server before the
 * login can close (owner, 18 Nov 2026: settle first, like a bank account).
 * The server refuses to close the login while anything here is outstanding,
 * unless the cooperative has marked the member exited.
 */
export function ClosingMoneyPosition({
  position,
}: {
  position: ClosingMoneyPositionData
}) {
  if (!position.members.length)
    return (
      <p className="text-base">
        They have no member record with a cooperative, so there is no money to
        settle.
      </p>
    )

  return (
    <div className="grid gap-4">
      {position.canCloseLogin ? null : (
        <p className="text-base font-medium text-destructive" role="alert">
          Their cooperative must settle their money first. You can close the
          login once every line is zero or the cooperative marks them exited.
        </p>
      )}
      {position.members.map((member) => (
        <div className="grid gap-2" key={member.memberId}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-base font-medium">
              {member.tenantName}
              <span className="font-normal text-muted-foreground">
                {" "}
                · member {member.memberNumber}
              </span>
            </p>
            <p
              className={
                member.settled
                  ? "text-base text-muted-foreground"
                  : "text-base font-medium text-destructive"
              }
            >
              {memberState(member)}
            </p>
          </div>
          <ul className="divide-y divide-border border-y border-border">
            {member.lines.map((line) => (
              <li
                className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3 text-base"
                key={line.kind}
              >
                <span>{line.label}</span>
                <span
                  className={
                    line.outstanding && !member.exited
                      ? "font-medium text-destructive tabular-nums"
                      : "text-muted-foreground tabular-nums"
                  }
                >
                  {lineValue(line)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
