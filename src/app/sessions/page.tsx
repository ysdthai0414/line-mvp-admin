"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CalendarIcon,
  ChevronRight,
  Plus,
  Search,
  X,
} from "lucide-react"
import { ja } from "date-fns/locale"
import type { DateRange } from "react-day-picker"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  SESSION_STATUS_LABELS,
  type SessionStatus,
} from "@/lib/status-labels"
import { cn } from "@/lib/utils"

type Session = {
  id: string
  title: string
  host_user_name: string
  scheduled_at: string
  duration_min: number
  attendees: { user_id: string; user_name: string }[]
  status: SessionStatus | string
  notes?: string
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "scheduled", label: "開催予定" },
  { value: "completed", label: "開催済" },
  { value: "cancelled", label: "中止" },
]

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function formatDate(d: Date) {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} (${WEEKDAYS[d.getDay()]})`
}

function SessionStatusBadge({ status }: { status: string }) {
  const label = SESSION_STATUS_LABELS[status as SessionStatus] ?? status
  if (status === "scheduled")
    return (
      <Badge className="border-transparent bg-success/15 text-success">
        {label}
      </Badge>
    )
  if (status === "cancelled")
    return (
      <Badge className="border-transparent bg-destructive/15 text-destructive">
        {label}
      </Badge>
    )
  return <Badge variant="secondary">{label}</Badge>
}

function DateRangePicker({
  range,
  onChange,
}: {
  range: DateRange | undefined
  onChange: (r: DateRange | undefined) => void
}) {
  const label =
    range?.from && range?.to
      ? `${formatDate(range.from)} 〜 ${formatDate(range.to)}`
      : range?.from
        ? `${formatDate(range.from)} 〜`
        : "開催期間"
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 min-w-[16rem] justify-start font-normal",
            !range?.from && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="size-4" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={onChange}
          locale={ja}
          numberOfMonths={1}
        />
      </PopoverContent>
    </Popover>
  )
}

export default function SessionsListPage() {
  const router = useRouter()
  const [sessions, setSessions] = React.useState<Session[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const [status, setStatus] = React.useState("all")
  const [range, setRange] = React.useState<DateRange | undefined>()
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    let cancelled = false
    fetch("/mocks/sessions.json")
      .then((r) => r.json())
      .then((d: Session[]) => {
        if (!cancelled) setSessions(d)
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = React.useMemo(() => {
    if (!sessions) return []
    const q = search.trim().toLowerCase()
    return sessions
      .filter((s) => {
        if (status !== "all" && s.status !== status) return false
        if (range?.from) {
          const t = new Date(s.scheduled_at).getTime()
          if (t < range.from.getTime()) return false
          if (range.to && t > range.to.getTime() + 86_399_999) return false
        }
        if (q && !s.title.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
  }, [sessions, status, range, search])

  function reset() {
    setStatus("all")
    setRange(undefined)
    setSearch("")
  }
  const isFiltering = status !== "all" || range?.from || search.trim() !== ""
  const loading = !sessions && !error
  const now = Date.now()

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">相談会一覧</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            過去・予定の相談会管理
          </p>
        </div>
        <Button asChild>
          <Link href="/sessions/new">
            <Plus />
            新規相談会
          </Link>
        </Button>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="ステータス" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangePicker range={range} onChange={setRange} />
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="タイトルで検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            disabled={!isFiltering}
          >
            <X className="size-4" />
            リセット
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {error && (
            <div className="p-6 text-sm text-destructive">
              読み込みに失敗しました：{error}
            </div>
          )}
          {loading && (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              該当する相談会がありません
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>タイトル</TableHead>
                  <TableHead>ホスト</TableHead>
                  <TableHead>開催日時</TableHead>
                  <TableHead className="text-right">定員/参加者</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const past = new Date(s.scheduled_at).getTime() < now
                  const cancelled = s.status === "cancelled"
                  return (
                    <TableRow
                      key={s.id}
                      className={cn(
                        "group cursor-pointer hover:bg-muted/30",
                        cancelled ? "opacity-60" : past && "opacity-70",
                      )}
                      onClick={() => router.push(`/sessions/${s.id}`)}
                    >
                      <TableCell className="font-medium">{s.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.host_user_name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {formatDateTime(s.scheduled_at)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {s.attendees.length}/15
                      </TableCell>
                      <TableCell>
                        <SessionStatusBadge status={s.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <ChevronRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
