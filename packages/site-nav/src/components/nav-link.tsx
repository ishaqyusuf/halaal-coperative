"use client"

import type { ComponentProps } from "react"
import { useSiteNav } from "./use-site-nav"

export function NavLink(props: ComponentProps<"a">) {
  const {
    props: { Link: LinkComponent },
  } = useSiteNav()

  if (LinkComponent) {
    return <LinkComponent {...props} />
  }

  return <a {...props}>{props.children}</a>
}
