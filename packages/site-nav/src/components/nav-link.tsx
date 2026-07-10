"use client"

import type { AnchorHTMLAttributes } from "react"
import { useSiteNav } from "./use-site-nav"

export function NavLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const {
    props: { Link: LinkComponent },
  } = useSiteNav()

  if (LinkComponent) {
    return <LinkComponent {...props} />
  }

  return <a {...props}>{props.children}</a>
}
