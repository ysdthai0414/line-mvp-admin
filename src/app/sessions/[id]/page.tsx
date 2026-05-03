"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Bell,
  Calendar as CalendarIcon,
  ChevronDown,
  Clock,
  Copy,
  Megaphone,
  Plus,
  Trash2,
  UserMinus,
  UserPlus,
  UserRound,
  Video,
  XCircle,
} from "lucide-react"
import { ja } from "date-fns/locale"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Textarea } from "@/components/ui/textarea"
import {
  SESSION_STATUS_LABELS,
  type SessionStatus,
} from "@/lib/status-labels"
import { cn } from "@/lib/utils"

type Attendee = {
  user_id: string
  user_name: string
  company_name?: string
  position?: string
}
type Session = {
  id: string
  title: string
  host_user_id: string
  host_user_name: string
  scheduled_at: string
  duration_min: number
  attendees: Attendee[]
  status: SessionStatus | string
  notes?: string
}
type User = {
  id: string
  name: string
  company_name?: string
  position?: string
  avatar_url?: string
}

const TIME_OPTIONS = [
  "9:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "17:00",
  "19:00",
] as const

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const

function formatJaDate(d: Date) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAYS[d.getDay()]}）`
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

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [session, setSession] = React.useState<Session | null>(null)
  const [users, setUsers] = React.useState<User[]>([])
  const [error, setError] = React.useState<string | null>(null)

  // form state
  const [date, setDate] = React.useState<Date | undefined>()
  const [dateOpen, setDateOpen] = React.useState(false)
  const [time, setTime] = React.useState<string>("9:00")
  const [duration, setDuration] = React.useState(45)
  const [zoomUrl, setZoomUrl] = React.useState("https://zoom.us/j/0000000000")
  const [capacity, setCapacity] = React.useState(15)
  const [notes, setNotes] = React.useState("")
  const [attendees, setAttendees] = React.useState<Attendee[]>([])

  React.useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([
      fetch("/mocks/sessions.json").then((r) => r.json()),
      fetch("/mocks/users.json").then((r) => r.json()),
    ])
      .then(([s, u]: [Session[], User[]]) => {
        if (cancelled) return
        const found = s.find((x) => x.id === id)
        if (!found) {
          setError(`相談会 ID "${id}" が見つかりませんでした`)
          return
        }
        setSession(found)
        setUsers(u)
        const dt = new Date(found.scheduled_at)
        setDate(dt)
        setTime(
          `${dt.getHours()}:${String(dt.getMinutes()).padStart(2, "0")}`,
        )
        setDuration(found.duration_min)
        setNotes(found.notes ?? "")
        setAttendees(found.attendees)
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const userById = React.useMemo(() => {
    const map = new Map<string, User>()
    for (const u of users) map.set(u.id, u)
    return map
  }, [users])

  if (error) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button asChild variant="outline">
          <Link href="/sessions">相談会一覧へ</Link>
        </Button>
      </div>
    )
  }
  if (!session) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  const past =
    new Date(session.scheduled_at).getTime() < Date.now() ||
    session.status === "completed"
  const cancelled = session.status === "cancelled"
  const lockedHeader = cancelled

  function copyZoom() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(zoomUrl)
    }
    toast.success("Zoom URL をコピーしました")
  }

  function sendReminderAll() {
    toast.success(
      `${attendees.length} 名にリマインドを送信しました（プロトタイプ）`,
    )
  }
  function sendReminder(u: Attendee) {
    toast.success(`${u.user_name} さんにリマインドを送信しました（プロトタイプ）`)
  }
  function removeAttendee(u: Attendee) {
    setAttendees((prev) => prev.filter((a) => a.user_id !== u.user_id))
    toast.success(`${u.user_name} さんを参加者から外しました`)
  }
  function cancelSession() {
    toast.success("相談会をキャンセルしました（プロトタイプ）")
  }
  function archiveSession() {
    toast.success("相談会をアーカイブしました（プロトタイプ）")
  }

  const candidates = users.filter(
    (u) => !attendees.some((a) => a.user_id === u.id),
  )

  return (
    <div className="space-y-4">
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        相談会一覧へ
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{session.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ホスト: {session.host_user_name}
          </p>
        </div>
        {lockedHeader ? (
          <Badge
            variant="destructive"
            className="text-sm h-7 px-3"
            aria-label="この相談会はキャンセル済みです"
          >
            キャンセル済み
          </Badge>
        ) : (
          <SessionStatusBadge status={session.status} />
        )}
      </header>

      {cancelled && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-center text-sm text-destructive">
          <div className="flex items-center justify-center gap-2 text-base font-semibold">
            <XCircle className="size-5" />
            この相談会はキャンセルされました
          </div>
          <p className="mt-1 text-destructive/90">
            再開はできません。新しい相談会を作成してください。
          </p>
          <div className="mt-3">
            <Button asChild size="sm">
              <Link href="/sessions/new">
                <Plus className="size-4" />
                新規相談会を作成
              </Link>
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        {/* Left: details + attendees */}
        <div className="space-y-6">
          {/* Basic info */}
          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="text-sm font-semibold">基本情報</h2>

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
                        disabled={cancelled}
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
                  <Select
                    value={time}
                    onValueChange={setTime}
                    disabled={cancelled}
                  >
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
                    disabled={cancelled}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    定員
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value) || 0)}
                    disabled={cancelled}
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Video className="size-3.5" />
                    Zoom URL
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={zoomUrl}
                      onChange={(e) => setZoomUrl(e.target.value)}
                      className="font-mono text-sm"
                      disabled={cancelled}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyZoom}
                      className="shrink-0"
                    >
                      <Copy className="size-4" />
                      コピー
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  説明・備考
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  disabled={cancelled}
                />
              </div>
            </CardContent>
          </Card>

          {/* Attendees */}
          <Card>
            <CardContent className="space-y-3 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  参加者（{attendees.length} 名 / 定員 {capacity} 名）
                </h2>
                {!cancelled && (
                  <AddAttendeeMenu
                    candidates={candidates}
                    onAdd={(u) => {
                      setAttendees((prev) => [
                        ...prev,
                        {
                          user_id: u.id,
                          user_name: u.name,
                          company_name: u.company_name,
                          position: u.position,
                        },
                      ])
                      toast.success(`${u.name} さんを参加者に追加しました`)
                    }}
                  />
                )}
              </div>
              {attendees.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  参加者はまだいません
                </p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {attendees.map((a) => {
                    const u = userById.get(a.user_id)
                    const initial = a.user_name.replace(/\s+/g, "")[0] ?? "?"
                    const isHost = a.user_id === session.host_user_id
                    return (
                      <li
                        key={a.user_id}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <Avatar className="size-8">
                          {u?.avatar_url && (
                            <AvatarImage src={u.avatar_url} />
                          )}
                          <AvatarFallback className="bg-primary/10 text-xs text-primary">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <span className="truncate">{a.user_name}</span>
                            {a.position && (
                              <span className="truncate text-xs text-muted-foreground">
                                ({a.position})
                              </span>
                            )}
                            {isHost && (
                              <Badge variant="outline" className="text-xs">
                                ホスト
                              </Badge>
                            )}
                          </div>
                          {a.company_name && (
                            <div className="truncate text-xs text-muted-foreground">
                              {a.company_name}
                            </div>
                          )}
                        </div>
                        {!cancelled && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => sendReminder(a)}
                              aria-label="リマインド送信"
                            >
                              <Bell className="size-4" />
                            </Button>
                            <RemoveAttendeeButton
                              attendee={a}
                              onConfirm={() => removeAttendee(a)}
                            />
                          </>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: action panel */}
        <Card className="h-fit">
          <CardContent className="space-y-3 p-6">
            <h2 className="text-sm font-semibold">アクション</h2>
            <Button
              className="w-full justify-start"
              onClick={sendReminderAll}
              disabled={cancelled}
            >
              <Megaphone className="size-4" />
              参加者にリマインド一斉送信
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={copyZoom}
            >
              <Copy className="size-4" />
              Zoom URL をコピー
            </Button>
            {!cancelled && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full justify-start">
                    <XCircle className="size-4" />
                    相談会をキャンセル
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      相談会をキャンセルしますか？
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      参加者に通知が送信されます。この操作は取り消せます（再開催可能）。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>戻る</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={cancelSession}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      キャンセルする
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {past && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={archiveSession}
              >
                <Trash2 className="size-4" />
                アーカイブ
              </Button>
            )}
            {cancelled && (
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/sessions/new">
                  <Plus className="size-4" />
                  新規相談会を作成
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function RemoveAttendeeButton({
  attendee,
  onConfirm,
}: {
  attendee: Attendee
  onConfirm: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="参加者を削除"
          className="text-destructive hover:bg-destructive/10"
        >
          <UserMinus className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {attendee.user_name} さんを参加者から外しますか？
          </AlertDialogTitle>
          <AlertDialogDescription>
            この操作は手動で再追加できます。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>戻る</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            外す
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function AddAttendeeMenu({
  candidates,
  onAdd,
}: {
  candidates: User[]
  onAdd: (u: User) => void
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="size-4" />
          参加者を追加
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        {candidates.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            追加可能なユーザーがいません
          </p>
        ) : (
          <ul className="max-h-72 overflow-y-auto p-2">
            {candidates.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50"
                  onClick={() => {
                    onAdd(u)
                    setOpen(false)
                  }}
                >
                  <UserRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1">
                      <span className="truncate font-medium">{u.name}</span>
                      {u.position && (
                        <span className="truncate text-xs text-muted-foreground">
                          ({u.position})
                        </span>
                      )}
                    </div>
                    {u.company_name && (
                      <div className="truncate text-xs text-muted-foreground">
                        {u.company_name}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
