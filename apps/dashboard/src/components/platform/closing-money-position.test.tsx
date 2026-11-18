import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { ClosingMoneyPosition } from "./closing-money-position"

const lines = (savings: number, guarantees: number) => [
  {
    kind: "savings",
    label: "Savings",
    amount: savings,
    count: null,
    outstanding: savings !== 0,
  },
  {
    kind: "guarantees",
    label: "Guarantees on someone else's loan",
    amount: null,
    count: guarantees,
    outstanding: guarantees > 0,
  },
]

test("names what the cooperative still has to settle", () => {
  const html = renderToStaticMarkup(
    <ClosingMoneyPosition
      position={{
        canCloseLogin: false,
        members: [
          {
            memberId: "m1",
            tenantName: "Ilorin Teachers Cooperative",
            memberNumber: "ITC-014",
            exited: false,
            settled: false,
            lines: lines(5000, 1),
          },
        ],
      }}
    />
  )
  expect(html).toContain("must settle their money first")
  expect(html).toContain("Not settled yet")
  expect(html).toContain("₦5,000.00")
  expect(html).toContain("1 active")
})

test("shows an exited member as ready even with balances on record", () => {
  const html = renderToStaticMarkup(
    <ClosingMoneyPosition
      position={{
        canCloseLogin: true,
        members: [
          {
            memberId: "m1",
            tenantName: "Ilorin Teachers Cooperative",
            memberNumber: "ITC-014",
            exited: true,
            settled: true,
            lines: lines(5000, 0),
          },
        ],
      }}
    />
  )
  expect(html).not.toContain("must settle their money first")
  expect(html).toContain("Marked exited by the cooperative")
})

test("says when there is no member record to settle", () => {
  expect(
    renderToStaticMarkup(
      <ClosingMoneyPosition position={{ canCloseLogin: true, members: [] }} />
    )
  ).toContain("no money to settle")
})
