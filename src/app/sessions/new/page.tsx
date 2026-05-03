"use client"

import * as React from "react"
import { Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  CalendarIcon,
  ChevronDown,
  Clock,
  Loader2,
  UserRound,
} from "lucide-react"
import { ja } from "date-fns/locale"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Textarea } from "@/components/ui/textarea"
import { ROLE_LABELS, type Role } from "@/lib/status-labels"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const
const TIME_OPTIONS = ["9:00", "10:00", "11:00", "13:00", "14:00", "15:00", "17:00"] as const

function formatJaDate(d: Date) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAYS[d.getDay()]}）`
}

type Matching = {
  id: string
  status: string
  target_company_id: string
  target_company_name: string
  applicant_user_id: string
}

type User = {
  id: string
  name: string
  company_name: string
  position: string
  avatar_url?: string
}

type Staff = {
  id: string
  name: string
  role: string
  department?: string
  avatar_url?: string
}

function cancelDestination(from: string | null) {
  if (from === "dashboard") return "/"
  if (from === "aggregate") return "/matchings/aggregate"
  return "/sessions"
}

function NewSessionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const companyId = searchParams.get("company")
  const from = searchParams.get("from")
  const cancelHref = cancelDestination(from)

  const [title, setTitle] = React.useState("")
  const [date, setDate] = React.useState<Date | undefined>()
  const [dateOpen, setDateOpen] = React.useState(false)
  const [time, setTime] = React.useState<string>("14:00")
  const [duration, setDuration] = React.useState(45)
  const [zoomUrl, setZoomUrl] = React.useState("")
  const [notes, setNotes] = React.useState("")

  // ホスト・参加者
  const [users, setUsers] = React.useState<User[]>([])
  const [staff, setStaff] = React.useState<Staff[]>([])
  const [hostId, setHostId] = React.useState<string>("s_0001")
  const [attendeeIds, setAttendeeIds] = React.useState<string[]>([])
  const [attendeesOpen, setAttendeesOpen] = React.useState(false)

  // company= の事前情報（あれば）
  const [companyContext, setCompanyContext] = React.useState<{
    name: string
    pendingCount: number
    applicantCount: number
  } | null>(null)
  const titlePrefilledRef = React.useRef(false)
  const attendeesPrefilledRef = React.useRef(false)

  // ユーザー & スタッフ一覧
  React.useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/mocks/users.json").then((r) => r.json()),
      fetch("/mocks/staff.json").then((r) => r.json()),
    ])
      .then(([u, s]: [User[], Staff[]]) => {
        if (cancelled) return
        setUsers(u)
        setStaff(s)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // company= で来た場合のプリフィル
  React.useEffect(() => {
    if (!companyId) return
    let cancelled = false
    fetch("/mocks/matchings.json")
      .then((r) => r.json())
      .then((m: Matching[]) => {
        if (cancelled) return
        const related = m.filter((x) => x.target_company_id === companyId)
        if (related.length === 0) return
        const name = related[0].target_company_name
        const pending = related.filter(
          (x) => x.status === "要対応" || x.status === "待機中",
        )
        const applicantIds = Array.from(
          new Set(pending.map((x) => x.applicant_user_id)),
        )
        setCompanyContext({
          name,
          pendingCount: pending.length,
          applicantCount: applicantIds.length,
        })
        if (!titlePrefilledRef.current) {
          setTitle(`${name} 様との相談会`)
          titlePrefilledRef.current = true
        }
        if (!attendeesPrefilledRef.current) {
          setAttendeeIds(applicantIds)
          attendeesPrefilledRef.current = true
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [companyId])

  const hostCandidates = React.useMemo(
    () => staff.filter((s) => s.role === "admin" || s.role === "manager"),
    [staff],
  )
  const userById = React.useMemo(() => {
    const m = new Map<string, User>()
    for (const u of users) m.set(u.id, u)
    return m
  }, [users])

  function toggleAttendee(id: string) {
    setAttendeeIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    )
  }

  function save() {
    if (!title.trim()) {
      toast.error("タイトルを入力してください")
      return
    }
    if (!date) {
      toast.error("開催日を選択してください")
      return
    }
    toast.success(
      "相談会を作成しました（プロトタイプのため永続化されません）",
    )
    router.push(cancelHref)
  }

  return (
    <div className="space-y-4">
      <Link
        href={cancelHref}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        戻る
      </Link>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">新規相談会</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          相談会の基本情報を入力してください
        </p>
      </header>

      {companyContext && (
        <div className="flex items-start gap-3 rounded-md border border-info/30 bg-info/10 p-4 text-sm">
          <Building2 className="mt-0.5 size-5 shrink-0 text-info" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-info">
              {companyContext.name} 向けの相談会を作成します
            </p>
            <p className="mt-1 text-muted-foreground">
              対応待ちの申込 {companyContext.pendingCount} 件 / 申込者{" "}
              {companyContext.applicantCount} 名 を参加者にプリセット済み
            </p>
          </div>
        </div>
      )}

      <Card className="max-w-3xl">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              タイトル
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="相談会のタイトル"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <CalendarIcon className="size-3.5" />
                開催日
              </label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="size-4" />
                    {date ? formatJaDate(date) : "日付を選択"}
                    <ChevronDown className="ml-auto size-3.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      setDate(d)
                      setDateOpen(false)
                    }}
                    disabled={(d) => {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      return d < today
                    }}
                    locale={ja}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Clock className="size-3.5" />
                開始時刻
              </label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                所要時間 (分)
              </label>
              <Input
                type="number"
                min={15}
                max={240}
                step={15}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Zoom URL
              </label>
              <Input
                value={zoomUrl}
                onChange={(e) => setZoomUrl(e.target.value)}
                placeholder="https://zoom.us/j/..."
                className="font-mono text-sm"
              />
            </div>
          </div>

          {/* ホスト */}
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <UserRound className="size-3.5" />
              ホスト
            </label>
            <Select value={hostId} onValueChange={setHostId}>
              <SelectTrigger className="w-full md:w-72">
                <SelectValue placeholder="ホストを選択" />
              </SelectTrigger>
              <SelectContent>
                {hostCandidates.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    候補スタッフが読込中…
                  </SelectItem>
                ) : (
                  hostCandidates.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}（{ROLE_LABELS[s.role as Role] ?? s.role}
                      {s.department ? ` / ${s.department}` : ""}）
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 参加者 */}
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <UserRound className="size-3.5" />
              参加者
            </label>
            <Popover open={attendeesOpen} onOpenChange={setAttendeesOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full md:w-72 justify-start font-normal"
                >
                  {attendeeIds.length === 0
                    ? "参加者を選択"
                    : `${attendeeIds.length} 名選択中`}
                  <ChevronDown className="ml-auto size-3.5 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <div className="max-h-72 overflow-y-auto p-2">
                  {users.length === 0 ? (
                    <p className="p-2 text-center text-sm text-muted-foreground">
                      ユーザー読込中…
                    </p>
                  ) : (
                    users.map((u) => {
                      const checked = attendeeIds.includes(u.id)
                      const initial = u.name.replace(/\s+/g, "")[0] ?? "?"
                      return (
                        <label
                          key={u.id}
                          className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleAttendee(u.id)}
                            className="mt-0.5"
                          />
                          <Avatar className="mt-0.5 size-6">
                            {u.avatar_url && (
                              <AvatarImage src={u.avatar_url} />
                            )}
                            <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                              {initial}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1 leading-tight">
                            <div className="flex items-baseline gap-1">
                              <span className="truncate font-medium">
                                {u.name}
                              </span>
                              <span className="truncate text-xs text-muted-foreground">
                                ({u.position})
                              </span>
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {u.company_name}
                            </div>
                          </div>
                        </label>
                      )
                    })
                  )}
                </div>
                {attendeeIds.length > 0 && (
                  <div className="border-t p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setAttendeeIds([])}
                    >
                      クリア
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            {attendeeIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 pt-1">
                {attendeeIds.slice(0, 8).map((id) => {
                  const u = userById.get(id)
                  const initial = u?.name?.[0] ?? "?"
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-full border bg-muted/40 pl-0.5 pr-2 py-0.5 text-xs"
                    >
                      <Avatar className="size-5">
                        {u?.avatar_url && <AvatarImage src={u.avatar_url} />}
                        <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <span>{u?.name ?? id}</span>
                    </span>
                  )
                })}
                {attendeeIds.length > 8 && (
                  <Badge variant="outline" className="text-xs">
                    +{attendeeIds.length - 8}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              説明・備考
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" asChild>
              <Link href={cancelHref}>キャンセル</Link>
            </Button>
            <Button onClick={save}>作成する</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function NewSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewSessionContent />
    </Suspense>
  )
}
