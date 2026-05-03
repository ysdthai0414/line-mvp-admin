"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Bell,
  BellOff,
  Briefcase,
  Building2,
  Calendar as CalendarIcon,
  Clock,
  Mail,
  Send,
  Wallet,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ja } from "date-fns/locale"
import { toast } from "sonner"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  getMatchingDisplayLabel,
  SALES_PHASE_LABELS,
  USER_STATUS_LABELS,
} from "@/lib/status-labels"
import {
  getSampleMessages,
  type ChatMessage,
} from "@/lib/users-helpers"
import { cn } from "@/lib/utils"

// ============================================================
// Types
// ============================================================

type User = {
  id: string
  name: string
  name_kana: string
  email: string
  company_id: string
  company_name: string
  company_industry?: string
  company_prefecture?: string
  position: string
  sales_phase: string
  status: string
  avatar_url?: string
  last_login_at?: string
  registered_at: string
  push_enabled: boolean
}

type Case = {
  id: string
  title: string
  status: string
  publish_at?: string
  company_name: string
}

type Matching = {
  id: string
  applicant_user_id: string
  case_title: string
  target_company_name: string
  status: string
  closed_reason: string | null
  created_at: string
}

const monthDayFmt = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
})
const dateFmt = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})
const dateTimeFmt = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function MatchingStatusBadge({
  matching,
}: {
  matching: { status: string; closed_reason?: string | null }
}) {
  const label = getMatchingDisplayLabel(matching)
  if (matching.status === "要対応")
    return (
      <Badge className="border-transparent bg-warning/15 text-warning">
        {label}
      </Badge>
    )
  if (matching.status === "開催準備中")
    return (
      <Badge className="border-transparent bg-success/15 text-success">
        {label}
      </Badge>
    )
  return <Badge variant="secondary">{label}</Badge>
}

// ============================================================
// Profile card
// ============================================================

function ProfileCard({ user }: { user: User }) {
  const statusKey = user.status as keyof typeof USER_STATUS_LABELS
  const statusLabel = USER_STATUS_LABELS[statusKey] ?? user.status
  const initial = user.name.replace(/\s+/g, "")[0] ?? "?"
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-col items-center text-center">
          <Avatar className="size-20">
            {user.avatar_url && <AvatarImage src={user.avatar_url} />}
            <AvatarFallback className="bg-primary/10 text-2xl text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          <h2 className="mt-3 text-lg font-bold">{user.name}</h2>
          <p className="text-xs text-muted-foreground">{user.name_kana}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1">
            {user.status === "CONFIRMED" ? (
              <Badge className="border-transparent bg-success/15 text-success">
                {statusLabel}
              </Badge>
            ) : user.status === "AWAITING_CONFIRM" ? (
              <Badge className="border-transparent bg-warning/15 text-warning">
                {statusLabel}
              </Badge>
            ) : (
              <Badge>{statusLabel}</Badge>
            )}
          </div>
        </div>

        <div className="space-y-3 border-t pt-4 text-sm">
          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="break-all">{user.email}</span>
          </div>
          <div className="flex items-start gap-2">
            <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>{user.company_name}</span>
          </div>
          <div className="flex items-start gap-2">
            <Briefcase className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>{user.position}</span>
          </div>
          <div className="flex items-start gap-2">
            <Wallet className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              {SALES_PHASE_LABELS[user.sales_phase] ?? user.sales_phase}
            </span>
          </div>
          <div className="flex items-start gap-2">
            {user.push_enabled ? (
              <Bell className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <BellOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <span>push: {user.push_enabled ? "有効" : "無効"}</span>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              最終ログイン:{" "}
              {user.last_login_at
                ? formatDistanceToNow(new Date(user.last_login_at), {
                    addSuffix: true,
                    locale: ja,
                  })
                : "—"}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CalendarIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>登録日: {dateFmt.format(new Date(user.registered_at))}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// History tabs
// ============================================================

function PublishedHistory({
  cases,
  userId,
}: {
  cases: Case[]
  userId: string
}) {
  const items = React.useMemo(
    () =>
      cases
        .filter((c) => c.status === "published")
        .sort((a, b) => (b.publish_at ?? "").localeCompare(a.publish_at ?? ""))
        .slice(0, 10),
    [cases],
  )
  // Deterministic "read" flag from user+case ids
  const seedTail = parseInt(userId.replace(/\D/g, ""), 10) || 0
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        配信履歴はありません
      </p>
    )
  }
  return (
    <ul className="divide-y">
      {items.map((c, idx) => {
        const caseTail = parseInt(c.id.replace(/\D/g, ""), 10) || 0
        const read = (seedTail + caseTail + idx) % 3 !== 0
        return (
          <li
            key={c.id}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{c.title}</div>
              <div className="text-xs text-muted-foreground">
                {c.publish_at
                  ? monthDayFmt.format(new Date(c.publish_at))
                  : "—"}{" "}
                ・ {c.company_name}
              </div>
            </div>
            {read ? (
              <Badge variant="secondary" className="shrink-0">
                閲覧済み
              </Badge>
            ) : (
              <Badge className="shrink-0 border-transparent bg-info/15 text-info">
                未読
              </Badge>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function MatchingHistory({ matchings }: { matchings: Matching[] }) {
  if (matchings.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        マッチング申請履歴はありません
      </p>
    )
  }
  return (
    <ul className="divide-y">
      {matchings.map((m) => (
        <li key={m.id} className="space-y-1 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {m.target_company_name}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {m.case_title}
              </div>
            </div>
            <MatchingStatusBadge matching={m} />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{dateTimeFmt.format(new Date(m.created_at))}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function ActionHistory({ user }: { user: User }) {
  // Mock log entries
  const entries: { at: string; text: string }[] = [
    {
      at: user.last_login_at ?? user.registered_at,
      text: "ログイン",
    },
    { at: "2026-04-22T10:15:00+09:00", text: "push通知 を受信（事例配信）" },
    { at: "2026-04-18T13:42:00+09:00", text: "マッチング申請を送信" },
    { at: "2026-04-10T08:05:00+09:00", text: "プロフィール更新" },
    { at: user.registered_at, text: "アカウント作成" },
  ]
  return (
    <ul className="divide-y">
      {entries.map((e, i) => (
        <li
          key={i}
          className="flex items-center justify-between gap-3 py-3 text-sm"
        >
          <span>{e.text}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {dateTimeFmt.format(new Date(e.at))}
          </span>
        </li>
      ))}
    </ul>
  )
}

// ============================================================
// Chat-style push UI
// ============================================================

function ChatBubble({ msg }: { msg: ChatMessage }) {
  // 自分（事務局 staff）→ 右寄せ・primary、相手（user）→ 左寄せ・muted
  const isStaff = msg.from === "staff"
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isStaff ? "items-end" : "items-start",
      )}
    >
      <span className="text-xs text-muted-foreground tabular-nums">
        {dateTimeFmt.format(new Date(msg.at))}
      </span>
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm",
          isStaff
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {msg.text}
      </div>
    </div>
  )
}

function ChatPanel({ user }: { user: User }) {
  const [messages, setMessages] = React.useState<ChatMessage[]>(() =>
    getSampleMessages(user.id, user.name),
  )
  const [draft, setDraft] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    // Replace messages when user changes
    setMessages(getSampleMessages(user.id, user.name))
  }, [user.id, user.name])

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  function send() {
    const text = draft.trim()
    if (!text) return
    const newMsg: ChatMessage = {
      id: `local_${Date.now()}`,
      from: "staff",
      text,
      at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, newMsg])
    setDraft("")
    toast.success(
      "送信しました（プロトタイプのため実際には送信されません）",
    )
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      send()
    }
  }

  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-0 p-0">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">個別連絡</h3>
          <p className="text-xs text-muted-foreground">
            {user.name}（{user.company_name}）さんへ
          </p>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          style={{ minHeight: 360 }}
        >
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              まだメッセージはありません
            </p>
          ) : (
            messages.map((m) => <ChatBubble key={m.id} msg={m} />)
          )}
        </div>

        <div className="sticky bottom-0 border-t bg-background/95 p-3 backdrop-blur">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="メッセージを入力... (Cmd/Ctrl + Enter で送信)"
            className="resize-none"
          />
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              onClick={send}
              disabled={draft.trim().length === 0}
            >
              <Send className="size-4" />
              送信
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Page
// ============================================================

export default function UserDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [user, setUser] = React.useState<User | null>(null)
  const [cases, setCases] = React.useState<Case[]>([])
  const [matchings, setMatchings] = React.useState<Matching[]>([])
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([
      fetch("/mocks/users.json").then((r) => r.json()),
      fetch("/mocks/cases.json").then((r) => r.json()),
      fetch("/mocks/matchings.json").then((r) => r.json()),
    ])
      .then(([u, c, m]: [User[], Case[], Matching[]]) => {
        if (cancelled) return
        const found = u.find((x) => x.id === id)
        if (!found) {
          setError(`ユーザー ID "${id}" が見つかりませんでした`)
          return
        }
        setUser(found)
        setCases(c)
        setMatchings(m.filter((x) => x.applicant_user_id === id))
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (error) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button asChild variant="outline">
          <Link href="/users">ユーザー一覧へ</Link>
        </Button>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_4fr_3fr]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Link
        href="/users"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        ユーザー一覧へ
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_4fr_3fr]">
        <ProfileCard user={user} />

        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="published">
              <TabsList>
                <TabsTrigger value="published">配信履歴</TabsTrigger>
                <TabsTrigger value="matchings">マッチング申請履歴</TabsTrigger>
                <TabsTrigger value="actions">アクション履歴</TabsTrigger>
              </TabsList>
              <TabsContent value="published" className="mt-4">
                <PublishedHistory cases={cases} userId={user.id} />
              </TabsContent>
              <TabsContent value="matchings" className="mt-4">
                <MatchingHistory matchings={matchings} />
              </TabsContent>
              <TabsContent value="actions" className="mt-4">
                <ActionHistory user={user} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <ChatPanel user={user} />
      </div>
    </div>
  )
}
