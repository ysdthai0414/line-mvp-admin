"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Activity,
  TrendingDown,
  TrendingUp,
  Users as UsersIcon,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ja } from "date-fns/locale"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { getUserAnalytics } from "@/lib/api-client"
import type {
  EngagementBucket,
  UserAnalyticsDto,
  UserAnalyticsResponseDto,
} from "@/types/db"
import { cn } from "@/lib/utils"

const BUCKET_LABELS: Record<EngagementBucket, string> = {
  active: "積極的",
  moderate: "普通",
  silent: "沈黙",
}

const BUCKET_OPTIONS: { value: "all" | EngagementBucket; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "active", label: "積極的" },
  { value: "moderate", label: "普通" },
  { value: "silent", label: "沈黙" },
]

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

function relTime(iso: string | null): string {
  if (!iso) return "—"
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ja })
}

function BucketBadge({ bucket }: { bucket: EngagementBucket }) {
  if (bucket === "active") {
    return (
      <Badge className="border-transparent bg-success/15 text-success">
        {BUCKET_LABELS.active}
      </Badge>
    )
  }
  if (bucket === "moderate") {
    return (
      <Badge className="border-transparent bg-info/15 text-info">
        {BUCKET_LABELS.moderate}
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      {BUCKET_LABELS.silent}
    </Badge>
  )
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  loading,
}: {
  label: string
  value: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  accent: "primary" | "success" | "warning" | "muted"
  loading: boolean
}) {
  const tones: Record<typeof accent, { tile: string; icon: string }> = {
    primary: { tile: "bg-primary/10", icon: "text-primary" },
    success: { tile: "bg-success/10", icon: "text-success" },
    warning: { tile: "bg-warning/10", icon: "text-warning" },
    muted: { tile: "bg-muted", icon: "text-muted-foreground" },
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
          {hint && !loading && (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function UserAnalyticsPage() {
  const router = useRouter()
  const [data, setData] =
    React.useState<UserAnalyticsResponseDto | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [bucketFilter, setBucketFilter] =
    React.useState<"all" | EngagementBucket>("all")
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    const ac = new AbortController()
    getUserAnalytics({ signal: ac.signal })
      .then((d) => setData(d))
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return
        setError(e instanceof Error ? e.message : String(e))
      })
    return () => ac.abort()
  }, [])

  const loading = !data && !error

  const filtered = React.useMemo<UserAnalyticsDto[]>(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.users.filter((u) => {
      if (bucketFilter !== "all" && u.bucket !== bucketFilter) return false
      if (q) {
        const hay = `${u.name} ${u.company_name}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [data, bucketFilter, search])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">ユーザー分析</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          配信に対する反応・マッチング申請数からユーザーのエンゲージメントを可視化
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          読み込みに失敗しました：{error}
        </div>
      )}

      {/* ---- サマリーカード ---- */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="登録ユーザー"
          value={loading ? "" : `${data?.summary.total.toLocaleString() ?? 0}人`}
          icon={UsersIcon}
          accent="primary"
          loading={loading}
        />
        <SummaryCard
          label="積極的"
          value={loading ? "" : `${data?.summary.active.toLocaleString() ?? 0}人`}
          hint="エンゲージスコア 5 以上"
          icon={TrendingUp}
          accent="success"
          loading={loading}
        />
        <SummaryCard
          label="沈黙"
          value={loading ? "" : `${data?.summary.silent.toLocaleString() ?? 0}人`}
          hint="無反応 or 30日以上活動なし"
          icon={TrendingDown}
          accent="muted"
          loading={loading}
        />
        <SummaryCard
          label="反応率（直近30日）"
          value={loading ? "" : pct(data?.summary.reaction_rate_30d ?? 0)}
          hint="配信に対するフィードバック付与率"
          icon={Activity}
          accent="warning"
          loading={loading}
        />
      </section>

      {/* ---- フィルタ ---- */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Select
            value={bucketFilter}
            onValueChange={(v) =>
              setBucketFilter(v as "all" | EngagementBucket)
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="バケット" />
            </SelectTrigger>
            <SelectContent>
              {BUCKET_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="名前・企業名で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px] flex-1 max-w-sm"
          />

          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            {filtered.length.toLocaleString()} / {data?.users.length.toLocaleString() ?? 0} 人
          </span>
        </CardContent>
      </Card>

      {/* ---- テーブル ---- */}
      <Card>
        <CardContent className="p-0">
          {loading && (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              該当ユーザーがいません
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12" />
                  <TableHead>ユーザー</TableHead>
                  <TableHead>企業名</TableHead>
                  <TableHead className="w-24 text-right">配信</TableHead>
                  <TableHead className="w-24 text-right">マッチ</TableHead>
                  <TableHead className="w-24 text-right">マッチせず</TableHead>
                  <TableHead className="w-24 text-right">話を聞きたい</TableHead>
                  <TableHead className="w-32 text-right">反応率</TableHead>
                  <TableHead className="w-28">最終反応</TableHead>
                  <TableHead className="w-24 text-right">スコア</TableHead>
                  <TableHead className="w-24">区分</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const initial = u.name.replace(/\s+/g, "")[0] ?? "?"
                  return (
                    <TableRow
                      key={u.id}
                      className="group cursor-pointer hover:bg-muted/30"
                      onClick={() => router.push(`/users/${u.id}`)}
                    >
                      <TableCell>
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-primary/10 text-xs text-primary">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.company_name || "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {u.delivery_count}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-success">
                        {u.helpful_count}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {u.not_helpful_count}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-warning">
                        {u.matching_count}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {pct(u.reaction_rate)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {relTime(u.last_activity_at)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {u.engagement_score.toFixed(1)}
                      </TableCell>
                      <TableCell>
                        <BucketBadge bucket={u.bucket} />
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
