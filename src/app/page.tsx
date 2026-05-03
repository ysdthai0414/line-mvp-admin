"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronRight,
  GitMerge,
  Mail,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react"
import { formatDistanceToNow, isSameMonth } from "date-fns"
import { ja } from "date-fns/locale"
import {
  Cell,
  Pie,
  PieChart,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
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
  SALES_PHASE_LABELS,
  SESSION_STATUS_LABELS,
  type MatchingStatus,
  type SessionStatus,
} from "@/lib/status-labels"
import { cn } from "@/lib/utils"

// ============================================================
// Types & data loading
// ============================================================

type Matching = {
  id: string
  status: MatchingStatus | string
  closed_reason?: string | null
  company_total_count?: number
}

type Session = {
  id: string
  title: string
  host_user_name: string
  scheduled_at: string
  attendees: { user_id: string; user_name: string }[]
  status: SessionStatus | string
}

type User = { id: string }

type UpcomingPublish = {
  case_id: string
  title: string
  company_name: string
  publish_at: string
  target_industries: string[]
  target_sales_phases: string[]
}

type ThresholdCompany = {
  company_id: string
  company_name: string
  match_count: number
  industry: string
  prefecture: string
  oldest_request_at: string
}

type Stats = {
  summary: {
    companies_at_threshold: number
    [k: string]: number
  }
  matchings_by_status: Record<string, number>
  closed_breakdown: Record<string, number>
  upcoming_publishes: UpcomingPublish[]
  threshold_companies: ThresholdCompany[]
}

type Staff = {
  id: string
  name: string
  role: string
}

type Mocks = {
  cases: unknown[]
  matchings: Matching[]
  sessions: Session[]
  users: User[]
  stats: Stats
  staff: Staff[]
}

async function loadMocks(): Promise<Mocks> {
  const names = [
    "cases",
    "matchings",
    "sessions",
    "users",
    "stats",
    "staff",
  ] as const
  const results = await Promise.all(
    names.map(async (n) => {
      const res = await fetch(`/mocks/${n}.json`)
      if (!res.ok) throw new Error(`failed: /mocks/${n}.json`)
      return res.json()
    }),
  )
  const [cases, matchings, sessions, users, stats, staff] = results
  return { cases, matchings, sessions, users, stats, staff }
}

const ME_STAFF_ID = "s_0001" // 仮想ログインスタッフ

// ============================================================
// Formatters
// ============================================================

const monthDayFmt = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
})

function formatRelativeDay(date: Date) {
  const dayMs = 1000 * 60 * 60 * 24
  const now = new Date()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime()
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime()
  const dayDiff = Math.round((startOfDate - startOfToday) / dayMs)
  if (dayDiff === 0) return "今日"
  if (dayDiff === 1) return "明日"
  if (dayDiff === -1) return "昨日"
  return formatDistanceToNow(date, { addSuffix: true, locale: ja })
}

function elapsedDays(from: Date) {
  return Math.floor((Date.now() - from.getTime()) / 86_400_000)
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// ============================================================
// Building blocks
// ============================================================

type KpiAccent = "primary" | "info" | "success"

function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  accent,
  loading,
}: {
  label: string
  value: string
  delta?: { text: string; positive: boolean }
  icon: React.ComponentType<{ className?: string }>
  accent: KpiAccent
  loading?: boolean
}) {
  const tones: Record<KpiAccent, { tile: string; icon: string }> = {
    primary: { tile: "bg-primary/10", icon: "text-primary" },
    info: { tile: "bg-info/10", icon: "text-info" },
    success: { tile: "bg-success/10", icon: "text-success" },
  }
  const tone = tones[accent]
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-lg",
            tone.tile,
          )}
        >
          <Icon className={cn("size-6", tone.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-1 h-9 w-24" />
          ) : (
            <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
              {value}
            </p>
          )}
          {loading ? (
            <Skeleton className="mt-1 h-4 w-16" />
          ) : delta ? (
            <p
              className={cn(
                "mt-1 flex items-center gap-1 text-xs",
                delta.positive ? "text-success" : "text-destructive",
              )}
            >
              {delta.positive ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {delta.text}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function KpiCardInverted({
  label,
  value,
  note,
  icon: Icon,
  loading,
}: {
  label: string
  value: string
  note?: string
  icon: React.ComponentType<{ className?: string }>
  loading?: boolean
}) {
  return (
    <Card className="border-transparent bg-primary text-primary-foreground">
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white/15">
          <Icon className="size-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-primary-foreground/70">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-1 h-9 w-24 bg-white/20" />
          ) : (
            <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
              {value}
            </p>
          )}
          {loading ? (
            <Skeleton className="mt-1 h-4 w-16 bg-white/20" />
          ) : note ? (
            <p className="mt-1 text-xs text-primary-foreground/80">{note}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      </div>
      <div className="flex items-center gap-1">
        {action}
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="再読み込み"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function SectionLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
    >
      {children}
      <ArrowRight className="size-3.5" />
    </Link>
  )
}

// ============================================================
// 今後の配信予定（カレンダー＋リスト）
// ============================================================

function PublishDateBadge({ date }: { date: Date }) {
  const day = String(date.getDate()).padStart(2, "0")
  const month = date.getMonth() + 1
  return (
    <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-full bg-primary/10 text-primary">
      <span className="text-base font-bold leading-none tabular-nums">
        {day}
      </span>
      <span className="text-[10px] leading-tight">{month}月</span>
    </div>
  )
}

function PublishListRow({
  item,
  highlighted,
}: {
  item: UpcomingPublish
  highlighted: boolean
}) {
  const date = new Date(item.publish_at)
  const industries = item.target_industries.slice(0, 2)
  const phases = item.target_sales_phases.slice(0, 2)
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md p-3 transition-colors",
        highlighted
          ? "bg-primary/5 ring-1 ring-primary/30"
          : "hover:bg-muted/30",
      )}
    >
      <PublishDateBadge date={date} />
      <div className="min-w-0 flex-1">
        <div className="line-clamp-1 text-sm font-medium">{item.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {industries.map((ind) => (
            <Badge key={ind} variant="secondary" className="text-xs">
              {ind}
            </Badge>
          ))}
          {phases.map((ph) => (
            <Badge key={ph} variant="outline" className="text-xs">
              {SALES_PHASE_LABELS[ph] ?? ph}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}

function UpcomingPublishesSection({
  items,
  loading,
}: {
  items: UpcomingPublish[]
  loading: boolean
}) {
  const [selected, setSelected] = React.useState<Date | undefined>(
    () => new Date(),
  )
  const [month, setMonth] = React.useState<Date>(() => new Date())

  // 表示中の月のみマーキングを更新
  const visibleDates = React.useMemo(
    () =>
      items
        .map((p) => new Date(p.publish_at))
        .filter((d) => isSameMonth(d, month)),
    [items, month],
  )

  const top3 = items.slice(0, 3)

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[40%_60%]">
        <Skeleton className="h-72 w-full max-w-md" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[40%_60%]">
      <div className="w-full max-w-md overflow-visible rounded-lg border bg-background p-2">
        <Calendar
          mode="single"
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          onSelect={setSelected}
          locale={ja}
          numberOfMonths={1}
          modifiers={{ publish: visibleDates }}
          modifiersClassNames={{
            publish:
              "relative bg-primary/15 text-primary font-bold after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:size-1 after:rounded-full after:bg-primary after:content-['']",
          }}
          className="w-full"
          classNames={{
            // Safari の aspect-square 計算ズレ対策＋セル高を拡大（h-12 = 48px）。
            // flex-1 で 7 日均等幅、明示高さで aspect 依存を排除。
            weekday:
              "flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none",
            day: "group/day relative h-12 flex-1 rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius) [&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)",
            week: "mt-2 flex w-full",
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        {top3.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            配信予定はありません ✓
          </p>
        ) : (
          <>
            {top3.map((item) => {
              const matched =
                !!selected && isSameDay(new Date(item.publish_at), selected)
              return (
                <PublishListRow
                  key={item.case_id}
                  item={item}
                  highlighted={matched}
                />
              )
            })}
            <div className="mt-auto pt-3">
              <SectionLink href="/cases?status=scheduled">
                すべての配信予定を見る
              </SectionLink>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================
// マッチング申込状況ドーナツ（業務状態別 4 分割）
// ============================================================

type DonutKey = "要対応" | "開催準備中" | "待機中" | "終了"

const DONUT_META: Record<
  DonutKey,
  { color: string; description: string }
> = {
  要対応: {
    color: "var(--warning)",
    description: "4件以上集まり、相談会の調整開始が必要",
  },
  開催準備中: {
    color: "var(--info)",
    description: "相談会日程決定済み、開催待ち",
  },
  待機中: {
    color: "color-mix(in oklch, var(--muted-foreground) 40%, transparent)",
    description: "申込数がまだ少なく、様子見",
  },
  終了: {
    color: "color-mix(in oklch, var(--muted-foreground) 60%, transparent)",
    description: "相談会完了 or 企業辞退・期限切れ",
  },
}

const DONUT_ORDER: DonutKey[] = ["要対応", "開催準備中", "待機中", "終了"]

const donutChartConfig = {
  value: { label: "件数" },
  要対応: { label: "要対応", color: DONUT_META["要対応"].color },
  開催準備中: {
    label: "開催準備中",
    color: DONUT_META["開催準備中"].color,
  },
  待機中: { label: "待機中", color: DONUT_META["待機中"].color },
  終了: { label: "終了", color: DONUT_META["終了"].color },
} satisfies ChartConfig

type DonutDatum = { name: DonutKey; value: number }

function DonutTooltip({
  active,
  payload,
  closedBreakdown,
}: {
  active?: boolean
  payload?: { payload: DonutDatum }[]
  closedBreakdown: Record<string, number>
}) {
  if (!active || !payload || payload.length === 0) return null
  const { name, value } = payload[0].payload
  const meta = DONUT_META[name]
  return (
    <div className="max-w-xs rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <div className="font-medium">
        {name}: {value} 件
      </div>
      {meta?.description && (
        <div className="mt-1 text-muted-foreground">{meta.description}</div>
      )}
      {name === "終了" && Object.keys(closedBreakdown).length > 0 && (
        <div className="mt-1 text-muted-foreground">
          {Object.entries(closedBreakdown)
            .map(([reason, n]) => `${reason} ${n}件`)
            .join(" / ")}
        </div>
      )}
    </div>
  )
}

function LegendItem({
  name,
  count,
}: {
  name: DonutKey
  count: number
}) {
  const meta = DONUT_META[name]
  if (!meta) return null
  return (
    <li className="space-y-0.5">
      <div className="flex items-center gap-2 text-sm">
        <span
          aria-hidden
          className="inline-block size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: meta.color }}
        />
        <span className="font-medium">{name}</span>
        <span className="ml-auto tabular-nums text-muted-foreground">
          {count} 件
        </span>
      </div>
      <p className="pl-[1.125rem] text-xs text-muted-foreground">
        {meta.description}
      </p>
    </li>
  )
}

function MatchingDonut({
  data,
  closedBreakdown,
  total,
  loading,
}: {
  data: DonutDatum[]
  closedBreakdown: Record<string, number>
  total: number
  loading: boolean
}) {
  if (loading) {
    return <Skeleton className="h-64 w-full" />
  }
  if (!data || total === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        データがありません
      </p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center lg:justify-around">
      <div className="relative">
        <ChartContainer
          config={donutChartConfig}
          className="aspect-square h-56 w-56"
        >
          <PieChart>
            <ChartTooltip
              content={<DonutTooltip closedBreakdown={closedBreakdown} />}
              cursor={false}
              position={{ y: -8 }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={DONUT_META[d.name].color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums">{total}</span>
          <span className="text-xs text-muted-foreground">件</span>
          <span className="mt-1 text-[10px] text-muted-foreground">
            全マッチング申込数
          </span>
        </div>
      </div>

      <ul className="w-full max-w-xs space-y-3">
        {data.map((d) => (
          <LegendItem key={d.name} name={d.name} count={d.value} />
        ))}
      </ul>
    </div>
  )
}

// ============================================================
// 相談会調整開始企業一覧
// ============================================================

function ThresholdCompaniesList({
  items,
  loading,
}: {
  items: ThresholdCompany[]
  loading: boolean
}) {
  if (loading) {
    return (
      <ul className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-8 w-24" />
          </li>
        ))}
      </ul>
    )
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <CheckCircle2 className="size-6 text-success" />
        <p>現在、調整が必要な案件はありません ✓</p>
      </div>
    )
  }

  return (
    <ul>
      {items.map((c, idx) => {
        const oldest = new Date(c.oldest_request_at)
        const days = elapsedDays(oldest)
        const dateLabel = monthDayFmt.format(oldest)
        const elapsedClass =
          days <= 7
            ? "text-muted-foreground"
            : days <= 30
              ? "text-warning"
              : "text-destructive font-medium"
        const showAlert = days >= 31
        return (
          <li
            key={c.company_id}
            className={cn(
              "flex items-center gap-3 py-3",
              idx < items.length - 1 && "border-b border-border/50",
            )}
          >
            <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-full bg-warning/15 text-warning">
              <span className="text-base font-bold leading-none tabular-nums">
                {c.match_count}
              </span>
              <span className="text-[10px] leading-tight">件</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {c.company_name}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {c.industry}・{c.prefecture}
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 text-xs",
                  elapsedClass,
                )}
              >
                {showAlert && <AlertCircle className="size-3" />}
                <span>
                  最初の申し込み：{dateLabel}（{days}日経過）
                </span>
              </div>
            </div>
            <Button asChild size="sm">
              <Link
                href={`/sessions/new?company=${c.company_id}&from=dashboard`}
              >
                相談会作成
                <ArrowRight />
              </Link>
            </Button>
          </li>
        )
      })}
    </ul>
  )
}

// ============================================================
// 直近の相談会
// ============================================================

function SessionStatusBadge({ status }: { status: string }) {
  const label = SESSION_STATUS_LABELS[status as SessionStatus] ?? status
  if (status === "scheduled") {
    return (
      <Badge className="border-transparent bg-info/15 text-info">{label}</Badge>
    )
  }
  if (status === "cancelled") return <Badge variant="secondary">{label}</Badge>
  return <Badge variant="outline">{label}</Badge>
}

function SessionsTable({
  sessions,
  loading,
}: {
  sessions: Session[]
  loading: boolean
}) {
  const router = useRouter()
  const upcoming = React.useMemo(
    () =>
      sessions
        .filter((s) => s.status === "scheduled")
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
        .slice(0, 5),
    [sessions],
  )

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (upcoming.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        予定されている相談会はありません
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>タイトル</TableHead>
          <TableHead>ホスト</TableHead>
          <TableHead>開催日時</TableHead>
          <TableHead className="text-right">参加者数</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead className="w-8" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {upcoming.map((s) => (
          <TableRow
            key={s.id}
            className="group cursor-pointer hover:bg-muted/30"
            onClick={() => router.push(`/sessions/${s.id}`)}
          >
            <TableCell className="font-medium">{s.title}</TableCell>
            <TableCell className="text-muted-foreground">
              {s.host_user_name}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatRelativeDay(new Date(s.scheduled_at))}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {s.attendees.length}/15 名
            </TableCell>
            <TableCell>
              <SessionStatusBadge status={s.status} />
            </TableCell>
            <TableCell className="w-8 text-muted-foreground">
              <ChevronRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// ============================================================
// Page
// ============================================================

export default function DashboardPage() {
  const [data, setData] = React.useState<Mocks | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    loadMocks()
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const loading = !data && !error

  const userCount = data?.users.length ?? 0
  const matchingCount = data?.matchings.length ?? 0
  const thresholdCount = data?.stats?.summary?.companies_at_threshold ?? 0

  // 4 分割: 待機中 / 要対応 / 開催準備中 / 終了
  // データ層で4状態に統一済みのため、stats.matchings_by_status から直接取得
  const matchingBreakdown = React.useMemo<Record<DonutKey, number>>(() => {
    const m = data?.stats?.matchings_by_status ?? {}
    return {
      待機中: m["待機中"] ?? 0,
      要対応: m["要対応"] ?? 0,
      開催準備中: m["開催準備中"] ?? 0,
      終了: m["終了"] ?? 0,
    }
  }, [data])

  const donutData: DonutDatum[] = React.useMemo(
    () =>
      DONUT_ORDER.filter((k) => matchingBreakdown[k] > 0).map((k) => ({
        name: k,
        value: matchingBreakdown[k],
      })),
    [matchingBreakdown],
  )

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">ダッシュボード</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          お疲れ様です、{(() => {
            const me = data?.staff?.find((s) => s.id === ME_STAFF_ID)
            const lastName = me?.name?.split(/\s+/)[0] ?? ""
            return lastName ? `${lastName}さん` : "—"
          })()}
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          モックデータの読み込みに失敗しました：{error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="登録ユーザー数"
          value={loading ? "" : `${userCount.toLocaleString()} 人`}
          delta={{ text: "前月比 +2 名", positive: true }}
          icon={Users}
          accent="primary"
          loading={loading}
        />
        <KpiCard
          label="配信開封率"
          value="68.4%"
          delta={{ text: "前月比 +2.3pt", positive: true }}
          icon={Mail}
          accent="info"
          loading={false}
        />
        <KpiCard
          label="今月のマッチング"
          value={loading ? "" : `${matchingCount.toLocaleString()} 件`}
          delta={{ text: "前月比 +5 件", positive: true }}
          icon={GitMerge}
          accent="success"
          loading={loading}
        />
        <KpiCardInverted
          label="相談会調整開始"
          value={loading ? "" : `${thresholdCount.toLocaleString()} 社`}
          note="現在の要対応件数"
          icon={CalendarIcon}
          loading={loading}
        />
      </section>

      <section>
        <Card className="overflow-visible">
          <CardContent className="p-6">
            <SectionHeader
              title="今後の配信予定"
              subtitle="配信スケジュール（取り組み事例）"
            />
            <UpcomingPublishesSection
              items={data?.stats?.upcoming_publishes ?? []}
              loading={loading}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardContent className="flex flex-1 flex-col p-6">
            <SectionHeader
              title="マッチング申込状況"
              subtitle={
                <>
                  ステータス別の内訳（要対応：
                  <span className="font-bold text-warning">
                    {matchingBreakdown["要対応"]}
                  </span>
                  {" 件 / "}
                  <span className="font-bold text-warning">
                    {data?.stats?.summary?.companies_at_threshold ?? 0}
                  </span>
                   社）
                </>
              }
            />
            <div className="flex flex-1 items-center">
              <MatchingDonut
                data={donutData}
                closedBreakdown={data?.stats?.closed_breakdown ?? {}}
                total={matchingCount}
                loading={loading}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardContent className="flex flex-1 flex-col p-6">
            <SectionHeader
              title="相談会調整開始企業一覧"
              subtitle="4件以上の申込が集まった企業（要対応）"
              action={
                <SectionLink href="/matchings/aggregate">
                  すべての企業別集約を見る
                </SectionLink>
              }
            />
            <ThresholdCompaniesList
              items={data?.stats?.threshold_companies ?? []}
              loading={loading}
            />
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardContent className="p-6">
            <SectionHeader
              title="直近の相談会"
              subtitle="予定されているスケジュール"
              action={
                <SectionLink href="/sessions">すべての相談会を見る</SectionLink>
              }
            />
            <SessionsTable
              sessions={data?.sessions ?? []}
              loading={loading}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
