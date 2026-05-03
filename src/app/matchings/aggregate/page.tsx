"use client"

import * as React from "react"
import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  X,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MatchingsTabs } from "@/components/matchings/matchings-tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getMatchings, getStats, getUsers } from "@/lib/api-client"
import { INDUSTRY_LIST, PREFECTURE_LIST } from "@/lib/master-data"
import {
  MATCHING_THRESHOLD,
} from "@/lib/status-labels"
import { cn } from "@/lib/utils"

type Matching = {
  id: string
  applicant_user_id: string
  target_company_id: string
  target_company_name: string
  status: string
  created_at: string
}

type User = { id: string; name: string }

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
  threshold_companies: ThresholdCompany[]
}

type AggregatedRow = {
  company_id: string
  company_name: string
  industry: string | null
  prefecture: string | null
  pending_count: number   // 待機中 + 要対応（事務局アクション待ち）
  urgent_count: number    // 要対応のみ（しきい値到達）
  total_count: number
  oldest_at: string
  applicantIds: string[]
}

function elapsedDays(from: Date) {
  return Math.floor((Date.now() - from.getTime()) / 86_400_000)
}

const monthDayFmt = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
})

function MultiSelect({
  label,
  options,
  value,
  onChange,
  width = "w-48",
}: {
  label: string
  options: readonly string[]
  value: string[]
  onChange: (v: string[]) => void
  width?: string
}) {
  const display =
    value.length === 0
      ? label
      : value.length === 1
        ? value[0]
        : `${value.length} 件選択中`
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 justify-start font-normal",
            width,
            value.length === 0 && "text-muted-foreground",
          )}
        >
          <span className="truncate">{display}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="max-h-72 overflow-y-auto p-2">
          {options.map((opt) => {
            const checked = value.includes(opt)
            return (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(next) => {
                    if (next) onChange([...value, opt])
                    else onChange(value.filter((v) => v !== opt))
                  }}
                />
                <span className="flex-1">{opt}</span>
              </label>
            )
          })}
        </div>
        {value.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange([])}
            >
              クリア
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function SummaryCard({
  label,
  value,
  inverted,
  emphasis,
  loading,
}: {
  label: string
  value: number
  inverted?: boolean
  emphasis?: boolean
  loading: boolean
}) {
  return (
    <Card
      className={cn(
        inverted && "border-transparent bg-primary text-primary-foreground",
      )}
    >
      <CardContent className="p-6">
        <p
          className={cn(
            "text-xs uppercase tracking-wider",
            inverted ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        {loading ? (
          <Skeleton
            className={cn("mt-2 h-9 w-24", inverted && "bg-white/20")}
          />
        ) : (
          <p
            className={cn(
              "mt-2 text-3xl font-bold tracking-tight tabular-nums",
              emphasis && !inverted && "text-warning",
            )}
          >
            {value.toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ApplicantAvatars({
  ids,
  userById,
}: {
  ids: string[]
  userById: Map<string, User>
}) {
  const shown = ids.slice(0, 5)
  const overflow = ids.length - shown.length
  return (
    <div className="flex -space-x-2">
      {shown.map((id) => {
        const u = userById.get(id)
        const initial = u?.name?.[0] ?? "?"
        return (
          <Avatar
            key={id}
            className="size-7 border-2 border-background"
            title={u?.name}
          >
            <AvatarFallback className="bg-primary/10 text-xs text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
        )
      })}
      {overflow > 0 && (
        <div className="flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
          +{overflow}
        </div>
      )}
    </div>
  )
}

function MatchingsAggregateContent() {
  const searchParams = useSearchParams()
  const highlightCompanyId = searchParams.get("company")

  const [matchings, setMatchings] = React.useState<Matching[] | null>(null)
  const [users, setUsers] = React.useState<User[]>([])
  const [stats, setStats] = React.useState<Stats | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const [industries, setIndustries] = React.useState<string[]>([])
  const [prefectures, setPrefectures] = React.useState<string[]>([])
  const [thresholdOnly, setThresholdOnly] = React.useState(false)

  const highlightRef = React.useRef<HTMLTableRowElement | null>(null)

  React.useEffect(() => {
    const ac = new AbortController()
    Promise.all([
      getMatchings({ signal: ac.signal }),
      getUsers({ signal: ac.signal }),
      getStats({ signal: ac.signal }),
    ])
      .then(([m, u, s]) => {
        setMatchings(m as Matching[])
        setUsers(u as User[])
        setStats(s as Stats)
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return
        setError(e instanceof Error ? e.message : String(e))
      })
    return () => ac.abort()
  }, [])

  const userById = React.useMemo(() => {
    const map = new Map<string, User>()
    for (const u of users) map.set(u.id, u)
    return map
  }, [users])

  const thresholdInfoById = React.useMemo(() => {
    const map = new Map<string, ThresholdCompany>()
    for (const t of stats?.threshold_companies ?? []) map.set(t.company_id, t)
    return map
  }, [stats])

  const aggregated: AggregatedRow[] = React.useMemo(() => {
    if (!matchings) return []
    const map = new Map<string, AggregatedRow>()
    for (const m of matchings) {
      let entry = map.get(m.target_company_id)
      if (!entry) {
        const ti = thresholdInfoById.get(m.target_company_id)
        entry = {
          company_id: m.target_company_id,
          company_name: m.target_company_name,
          industry: ti?.industry ?? null,
          prefecture: ti?.prefecture ?? null,
          pending_count: 0,
          urgent_count: 0,
          total_count: 0,
          oldest_at: m.created_at,
          applicantIds: [],
        }
        map.set(m.target_company_id, entry)
      }
      if (m.status === "要対応") {
        entry.urgent_count += 1
        entry.pending_count += 1
      } else if (m.status === "待機中") {
        entry.pending_count += 1
      }
      entry.total_count += 1
      if (m.created_at < entry.oldest_at) entry.oldest_at = m.created_at
      if (!entry.applicantIds.includes(m.applicant_user_id))
        entry.applicantIds.push(m.applicant_user_id)
    }
    return Array.from(map.values()).sort((a, b) => {
      if (b.urgent_count !== a.urgent_count)
        return b.urgent_count - a.urgent_count
      if (b.pending_count !== a.pending_count)
        return b.pending_count - a.pending_count
      return a.oldest_at.localeCompare(b.oldest_at)
    })
  }, [matchings, thresholdInfoById])

  const filtered = React.useMemo(() => {
    return aggregated.filter((row) => {
      if (thresholdOnly && row.urgent_count === 0) return false
      if (industries.length > 0) {
        if (!row.industry || !industries.includes(row.industry)) return false
      }
      if (prefectures.length > 0) {
        if (!row.prefecture || !prefectures.includes(row.prefecture))
          return false
      }
      return true
    })
  }, [aggregated, thresholdOnly, industries, prefectures])

  React.useEffect(() => {
    if (highlightCompanyId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ block: "center", behavior: "smooth" })
    }
  }, [highlightCompanyId, filtered])

  const loading = !matchings && !error
  const isFiltering =
    industries.length > 0 || prefectures.length > 0 || thresholdOnly

  function reset() {
    setIndustries([])
    setPrefectures([])
    setThresholdOnly(false)
  }

  // ----- Summary metrics -----
  const thresholdCount = stats?.summary?.companies_at_threshold ?? 0
  const totalMatchings = matchings?.length ?? 0
  const creatableSessions = aggregated.filter((r) => r.urgent_count > 0).length

  const highlightedCompanyName =
    highlightCompanyId && matchings
      ? matchings.find((m) => m.target_company_id === highlightCompanyId)
          ?.target_company_name ?? null
      : null

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">マッチング申請</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ユーザーから希望先企業への申請を管理
        </p>
      </header>

      <MatchingsTabs
        individualCount={matchings?.length ?? null}
        aggregateCount={aggregated.length === 0 ? null : aggregated.length}
      />

      <p className="text-sm text-muted-foreground">
        同じ希望先企業に何件集まっているかを集計表示します。4件以上集まった企業は「相談会調整開始」が必要です。
      </p>

      {highlightedCompanyName && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning/10 px-4 py-2 text-sm">
          <span>
            <span className="font-medium">{highlightedCompanyName}</span>{" "}
            の申込が表示されています
          </span>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/matchings/aggregate">
              <X className="size-4" />
              ハイライトを解除
            </Link>
          </Button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          label="要対応企業数"
          value={thresholdCount}
          inverted
          loading={loading}
        />
        <SummaryCard
          label="全申込件数"
          value={totalMatchings}
          loading={loading}
        />
        <SummaryCard
          label="相談会作成可能件数"
          value={creatableSessions}
          emphasis
          loading={loading}
        />
      </section>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <MultiSelect
            label="業種で絞込"
            options={INDUSTRY_LIST}
            value={industries}
            onChange={setIndustries}
          />
          <MultiSelect
            label="都道府県で絞込"
            options={PREFECTURE_LIST}
            value={prefectures}
            onChange={setPrefectures}
          />
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={thresholdOnly}
              onCheckedChange={setThresholdOnly}
            />
            <span>要対応（{MATCHING_THRESHOLD}件以上）のみ表示</span>
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            disabled={!isFiltering}
            className="ml-auto"
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
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
              <CheckCircle2 className="size-8 text-success" />
              <p>条件に一致する企業がありません</p>
              {isFiltering && (
                <Button variant="outline" size="sm" onClick={reset}>
                  リセット
                </Button>
              )}
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>企業</TableHead>
                  <TableHead className="w-44">
                    <span className="inline-flex items-center gap-1">
                      申込件数
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="申込件数の説明"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Info className="size-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-medium">業務状態と件数</p>
                          <p className="mt-1 text-xs">
                            事務局アクション待ちの申込件数。
                            {MATCHING_THRESHOLD}{" "}
                            件以上集まると「要対応」となり、相談会の調整候補に上がります。
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </TableHead>
                  <TableHead className="w-48">最初の申し込み</TableHead>
                  <TableHead className="w-40">申込者一覧</TableHead>
                  <TableHead className="w-32 text-right">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const isHighlight = row.company_id === highlightCompanyId
                  const days = elapsedDays(new Date(row.oldest_at))
                  const dayLabel = monthDayFmt.format(new Date(row.oldest_at))
                  const elapsedClass =
                    days <= 7
                      ? "text-muted-foreground"
                      : days <= 30
                        ? "text-warning"
                        : "text-destructive font-medium"
                  const showAlert = days >= 31
                  const isUrgent = row.urgent_count > 0
                  const veryUrgent = row.urgent_count >= MATCHING_THRESHOLD * 2
                  return (
                    <TableRow
                      key={row.company_id}
                      ref={isHighlight ? highlightRef : undefined}
                      className={cn(
                        "group hover:bg-muted/30",
                        veryUrgent
                          ? "bg-destructive/5"
                          : isUrgent && "bg-warning/5",
                        isHighlight &&
                          "ring-2 ring-inset ring-warning bg-warning/10",
                      )}
                    >
                      <TableCell>
                        <div className="font-semibold">{row.company_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.industry || "—"}
                          {row.prefecture && `・${row.prefecture}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isUrgent ? (
                          <Badge className="border-transparent bg-warning/15 text-warning">
                            ⚠ {row.urgent_count} 件 要対応
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {row.pending_count} 件 待機中
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div
                          className={cn(
                            "flex items-center gap-1 text-xs",
                            elapsedClass,
                          )}
                        >
                          {showAlert && <AlertCircle className="size-3" />}
                          <span>
                            {dayLabel}（{days}日経過）
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ApplicantAvatars
                          ids={row.applicantIds}
                          userById={userById}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm">
                          <Link
                            href={`/sessions/new?company=${row.company_id}&from=aggregate`}
                          >
                            相談会作成
                            <ArrowRight />
                          </Link>
                        </Button>
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

export default function MatchingsAggregatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MatchingsAggregateContent />
    </Suspense>
  )
}
