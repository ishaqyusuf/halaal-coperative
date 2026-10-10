import { render as reactEmailRender } from "@react-email/render"
import type { ReactNode } from "react"

export async function renderEmail(component: ReactNode) {
  return reactEmailRender(component)
}
