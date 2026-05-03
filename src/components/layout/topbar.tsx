"use client"

import * as React from "react"
import { Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

type TopBarProps = {
  children?: React.ReactNode
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const

function useNowEveryMinute() {
  const [now, setNow] = React.useState<Date | null>(null)
  React.useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}

function ClockLabel() {
  const now = useNowEveryMinute()
  if (!now) return <span className="w-24 text-right tabular-nums">--/-- (--) --:--</span>
  const m = now.getMonth() + 1
  const d = now.getDate()
  const w = WEEKDAYS[now.getDay()]
  const hh = String(now.getHours()).padStart(2, "0")
  const mm = String(now.getMinutes()).padStart(2, "0")
  return (
    <span className="text-sm font-medium tabular-nums">
      {m}/{d} ({w}) {hh}:{mm}
    </span>
  )
}

export function TopBar({ children }: TopBarProps) {
  return (
    <header
      className="flex shrink-0 items-center gap-2 border-b bg-background px-4"
      style={{ height: "var(--topbar-height)" }}
    >
      <SidebarTrigger />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <div className="min-w-0 flex-1 text-sm text-muted-foreground">
        {children}
      </div>

      <span className="hidden text-sm font-medium text-muted-foreground md:inline">
        YNMO 管理コンソール
      </span>
      <Separator orientation="vertical" className="mx-1 hidden h-5 md:block" />
      <ClockLabel />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="通知"
        className="text-muted-foreground"
      >
        <Bell />
      </Button>
    </header>
  )
}
