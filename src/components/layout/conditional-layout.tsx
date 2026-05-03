"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { AppShell } from "./app-shell"

const BARE_ROUTES = ["/login"]

function isBareRoute(pathname: string) {
  return BARE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}

export function ConditionalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname() ?? "/"

  if (isBareRoute(pathname)) {
    return <>{children}</>
  }

  return <AppShell>{children}</AppShell>
}
