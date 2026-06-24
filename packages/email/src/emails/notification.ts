export type NotificationEmailTemplateProps = {
  actionLabel: string
  actionUrl: string
  bodyText: string
  eventLabel: string
  previewText: string
  subject: string
}

function htmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export function NotificationEmailTemplate(props: NotificationEmailTemplateProps) {
  const body = props.bodyText
    .split("\n")
    .map((line) => `<p>${htmlEscape(line || " ")}</p>`)
    .join("")

  return [
    '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:560px;margin:0 auto;padding:24px">',
    `<p style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#657085">${htmlEscape(props.eventLabel)}</p>`,
    `<h1 style="font-size:24px;line-height:1.25;margin:12px 0 16px">${htmlEscape(props.subject)}</h1>`,
    body,
    `<p style="margin-top:24px"><a href="${htmlEscape(props.actionUrl)}" style="background:#111827;color:#fff;text-decoration:none;padding:10px 14px;border-radius:6px;display:inline-block">${htmlEscape(props.actionLabel)}</a></p>`,
    '<p style="margin-top:28px;color:#657085;font-size:12px">This message was sent by HalaalVest notifications.</p>',
    "</div>",
  ].join("")
}
