import * as React from "react"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

import { Sidebar } from "./sidebar"
import { TopBar } from "./topbar"

type AppShellProps = {
  children: React.ReactNode
  breadcrumb?: React.ReactNode
}

export function AppShell({ children, breadcrumb }: AppShellProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <Sidebar />
        <SidebarInset>
          <TopBar>{breadcrumb}</TopBar>
          <main className="mx-auto w-full max-w-(--content-max-width) px-6 py-4 lg:px-8 lg:py-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
