import {
  Body,
  Column,
  Container,
  Head,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components"
import type { ReactNode } from "react"

export const cooperativeLedgerColors = {
  canvas: "#f3f7f4",
  card: "#ffffff",
  green: "#1f7a3d",
  ink: "#26342b",
  muted: "#6a776f",
  navy: "#0b1f36",
  paleGreen: "#edf7ef",
  rule: "#e2e8e3",
  soft: "#f7faf7",
} as const

const responsiveCss = `
  @media only screen and (max-width: 620px) {
    .halaalvest-email-canvas { padding: 0 !important; }
    .halaalvest-email-card { width: 100% !important; }
    .halaalvest-email-header { padding-left: 20px !important; padding-right: 20px !important; }
    .halaalvest-email-content { padding-left: 22px !important; padding-right: 22px !important; }
    .halaalvest-email-tenant { font-size: 10px !important; max-width: 150px !important; }
    .halaalvest-email-heading { font-size: 27px !important; line-height: 1.2 !important; }
    .halaalvest-email-amount { font-size: 28px !important; }
    .halaalvest-email-detail-value { max-width: 190px !important; }
  }
`

type EmailShellProps = {
  children: ReactNode
  footerNote?: string
  organizationName?: string
  previewText: string
}

export function EmailShell({
  children,
  footerNote,
  organizationName = "Halaalvest",
  previewText,
}: EmailShellProps) {
  const isPlatformEmail = organizationName === "Halaalvest"
  const resolvedFooter =
    footerNote ??
    (isPlatformEmail
      ? "Sent by Halaalvest. This message was generated from a recorded account activity."
      : `Sent by ${organizationName} through Halaalvest. This message was generated from a recorded cooperative activity.`)

  return (
    <Html lang="en">
      <Head>
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <style>{responsiveCss}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body
        className="halaalvest-email-canvas"
        style={{
          backgroundColor: cooperativeLedgerColors.canvas,
          color: cooperativeLedgerColors.ink,
          fontFamily: "Arial, Helvetica, sans-serif",
          margin: 0,
          padding: "24px 12px",
        }}
      >
        <Container
          className="halaalvest-email-card"
          style={{
            backgroundColor: cooperativeLedgerColors.card,
            margin: "0 auto",
            maxWidth: 600,
            overflow: "hidden",
            width: "100%",
          }}
        >
          <Section
            className="halaalvest-email-header"
            style={{
              backgroundColor: cooperativeLedgerColors.navy,
              borderBottom: `4px solid ${cooperativeLedgerColors.green}`,
              padding: "22px 26px",
            }}
          >
            <Row>
              <Column style={{ verticalAlign: "middle" }}>
                <Text
                  style={{
                    color: "#ffffff",
                    fontSize: 19,
                    fontWeight: 700,
                    margin: 0,
                  }}
                >
                  Halaal<span style={{ color: "#6fd18a" }}>vest</span>
                </Text>
              </Column>
              <Column align="right" style={{ verticalAlign: "middle" }}>
                <Text
                  className="halaalvest-email-tenant"
                  style={{
                    color: "#b9c8d6",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.45px",
                    margin: 0,
                    textTransform: "uppercase",
                  }}
                >
                  {organizationName}
                </Text>
              </Column>
            </Row>
          </Section>

          {children}

          <Section
            className="halaalvest-email-content"
            style={{
              backgroundColor: cooperativeLedgerColors.soft,
              borderTop: `1px solid ${cooperativeLedgerColors.rule}`,
              padding: "18px 30px",
            }}
          >
            <Text
              style={{
                color: cooperativeLedgerColors.muted,
                fontSize: 12,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {resolvedFooter}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
