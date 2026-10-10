import {
  Button,
  Column,
  Heading,
  Row,
  Section,
  Text,
} from "@react-email/components"
import { cooperativeLedgerColors } from "./email-shell"

export type EmailDetail = {
  label: string
  value: string
}

type EmailHeroProps = {
  bodyText: string
  eyebrow: string
  recipientName?: string
  subject: string
}

export function EmailHero({
  bodyText,
  eyebrow,
  recipientName,
  subject,
}: EmailHeroProps) {
  return (
    <Section
      className="halaalvest-email-content"
      style={{ padding: "34px 30px 18px" }}
    >
      <Text
        style={{
          color: cooperativeLedgerColors.green,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "1.5px",
          margin: "0 0 14px",
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </Text>
      <Heading
        className="halaalvest-email-heading"
        style={{
          color: cooperativeLedgerColors.navy,
          fontSize: 30,
          fontWeight: 700,
          lineHeight: 1.18,
          margin: 0,
        }}
      >
        {subject}
      </Heading>
      <Text
        style={{
          color: "#425349",
          fontSize: 16,
          lineHeight: 1.65,
          margin: "16px 0 0",
        }}
      >
        Hello{recipientName ? ` ${recipientName}` : ""},
      </Text>
      {bodyText.split("\n").map((line, index) => (
        <Text
          key={`${index}:${line}`}
          style={{
            color: "#425349",
            fontSize: 16,
            lineHeight: 1.65,
            margin: "8px 0 0",
          }}
        >
          {line || " "}
        </Text>
      ))}
    </Section>
  )
}

type EmailStatusCardProps = {
  amount: string
  amountLabel: string
  statusLabel: string
}

export function EmailStatusCard({
  amount,
  amountLabel,
  statusLabel,
}: EmailStatusCardProps) {
  return (
    <Section
      className="halaalvest-email-content"
      style={{ padding: "8px 30px 0" }}
    >
      <Section
        style={{
          backgroundColor: cooperativeLedgerColors.paleGreen,
          borderLeft: `4px solid ${cooperativeLedgerColors.green}`,
          padding: "20px 22px",
        }}
      >
        <Row>
          <Column style={{ verticalAlign: "middle" }}>
            <Text
              style={{
                color: "#376044",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "1px",
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              {amountLabel}
            </Text>
            <Text
              className="halaalvest-email-amount"
              style={{
                color: "#14532d",
                fontSize: 30,
                fontWeight: 700,
                margin: "7px 0 0",
              }}
            >
              {amount}
            </Text>
          </Column>
          <Column align="right" style={{ verticalAlign: "middle" }}>
            <Text
              style={{
                color: cooperativeLedgerColors.green,
                fontSize: 12,
                fontWeight: 700,
                margin: 0,
              }}
            >
              {statusLabel}
            </Text>
          </Column>
        </Row>
      </Section>
    </Section>
  )
}

export function EmailDetailsTable({ details }: { details: EmailDetail[] }) {
  if (details.length === 0) {
    return null
  }

  return (
    <Section
      className="halaalvest-email-content"
      style={{ padding: "24px 30px 6px" }}
    >
      {details.map((detail, index) => {
        const isLast = index === details.length - 1

        return (
          <Row key={`${detail.label}:${detail.value}`}>
            <Column
              style={{
                borderBottom: isLast
                  ? undefined
                  : `1px solid ${cooperativeLedgerColors.rule}`,
                color: cooperativeLedgerColors.muted,
                fontSize: 14,
                padding: "11px 0",
                verticalAlign: "top",
              }}
            >
              {detail.label}
            </Column>
            <Column
              align="right"
              className="halaalvest-email-detail-value"
              style={{
                borderBottom: isLast
                  ? undefined
                  : `1px solid ${cooperativeLedgerColors.rule}`,
                color: cooperativeLedgerColors.ink,
                fontSize: 14,
                fontWeight: 700,
                maxWidth: 320,
                padding: "11px 0 11px 16px",
                verticalAlign: "top",
              }}
            >
              {detail.value}
            </Column>
          </Row>
        )
      })}
    </Section>
  )
}

type EmailActionProps = {
  actionLabel: string
  actionUrl: string
  recordLabel: string
}

export function EmailAction({
  actionLabel,
  actionUrl,
  recordLabel,
}: EmailActionProps) {
  return (
    <Section
      className="halaalvest-email-content"
      style={{ padding: "22px 30px 34px" }}
    >
      <Button
        href={actionUrl}
        style={{
          backgroundColor: cooperativeLedgerColors.navy,
          borderRadius: 6,
          color: "#ffffff",
          display: "inline-block",
          fontSize: 14,
          fontWeight: 700,
          padding: "13px 18px",
          textDecoration: "none",
        }}
      >
        {actionLabel}
      </Button>
      <Text
        style={{
          color: "#738078",
          fontSize: 12,
          lineHeight: 1.55,
          margin: "22px 0 0",
        }}
      >
        Record: {recordLabel} · Review the linked activity for full details.
      </Text>
    </Section>
  )
}
