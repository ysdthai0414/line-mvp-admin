"use client"

import * as React from "react"
import { Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getCases } from "@/lib/api-client"
import { INDUSTRY_LIST } from "@/lib/master-data"
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_VARIANTS,
  SALES_PHASE_LABELS,
  type CaseStatus,
} from "@/lib/status-labels"
import { cn } from "@/lib/utils"

type Case = {
  id: string
  title: string
  company_name: string
  status: CaseStatus | string
  publish_at?: string
  updated_at?: string
  target_industries?: string[]
  target_sales_phases?: string[]
  pdf_filename?: string
}

const STATUS_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "draft", label: "下書き" },
  { value: "scheduled", label: "公開予定" },
  { value: "published", label: "公開中" },
  { value: "archived", label: "アーカイブ" },
] as const

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const

function formatPublishDateTime(iso: string) {
  const d = new Date(iso)
  const m = d.getMonth() + 1
  const day = d.getDate()
  const w = WEEKDAYS[d.getDay()]
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${m}/${day} (${w}) ${hh}:${mm}`
}

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link"

function CaseStatusBadge({ status }: { status: string }) {
  const label = CASE_STATUS_LABELS[status as CaseStatus] ?? status
  const variant =
    (CASE_STATUS_VARIANTS[status as CaseStatus] as BadgeVariant) ?? "outline"
  if (status === "published") {
    return (
      <Badge className="border-transparent bg-success/15 text-success">
        {label}
      </Badge>
    )
  }
  if (status === "scheduled") {
    return (
      <Badge className="border-transparent bg-info/15 text-info">{label}</Badge>
    )
  }
  return <Badge variant={variant}>{label}</Badge>
}

function IndustryMultiSelect({
  value,
  onChange,
}: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  const label =
    value.length === 0
      ? "すべての業界"
      : value.length === 1
        ? value[0]
        : `${value.length} 業界選択中`
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 min-w-[12rem] max-w-[16rem] justify-start"
        >
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="max-h-72 overflow-y-auto p-2">
          {INDUSTRY_LIST.map((ind) => {
            const checked = value.includes(ind)
            return (
              <label
                key={ind}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(next) => {
                    if (next) onChange([...value, ind])
                    else onChange(value.filter((v) => v !== ind))
                  }}
                />
                <span className="flex-1">{ind}</span>
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

function TruncatedBadgeList({
  items,
  variant,
  labelMap,
  max = 2,
}: {
  items: string[]
  variant: BadgeVariant
  labelMap?: Record<string, string>
  max?: number
}) {
  if (!items || items.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  const shown = items.slice(0, max)
  const rest = items.length - shown.length
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((s) => (
        <Badge key={s} variant={variant} className="text-xs">
          {labelMap?.[s] ?? s}
        </Badge>
      ))}
      {rest > 0 && (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          +{rest}
        </Badge>
      )}
    </div>
  )
}

type SortKey =
  | "pdf_filename"
  | "title"
  | "company_name"
  | "publish_at"
  | "status"
  | "updated_at"

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
}: {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: "asc" | "desc"
  onSort: (k: SortKey) => void
}) {
  const active = current === sortKey
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : (
        <ArrowUpDown className="size-3 opacity-40" />
      )}
    </button>
  )
}

function CasesListContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get("status") ?? "all"

  const [cases, setCases] = React.useState<Case[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<string>(initialStatus)
  const [industries, setIndustries] = React.useState<string[]>([])
  const [search, setSearch] = React.useState("")
  const [showArchived, setShowArchived] = React.useState(false)
  const [sortKey, setSortKey] = React.useState<SortKey>("updated_at")
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc")

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  React.useEffect(() => {
    const ac = new AbortController()
    getCases({ signal: ac.signal })
      .then((d) => setCases(d as Case[]))
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return
        setError(e instanceof Error ? e.message : String(e))
      })
    return () => ac.abort()
  }, [])

  const loading = !cases && !error

  const filtered = React.useMemo(() => {
    if (!cases) return []
    const q = search.trim().toLowerCase()
    const list = cases.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false
      // アーカイブはトグル ON か、ステータスが明示的に archived 指定の時のみ表示
      if (
        c.status === "archived" &&
        !showArchived &&
        statusFilter !== "archived"
      )
        return false
      if (industries.length > 0) {
        const hit = c.target_industries?.some((i) => industries.includes(i))
        if (!hit) return false
      }
      if (q) {
        if (
          !c.title.toLowerCase().includes(q) &&
          !c.company_name.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
    return list.sort((a, b) => {
      const av = (a[sortKey] ?? "") as string
      const bv = (b[sortKey] ?? "") as string
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [cases, statusFilter, industries, search, showArchived, sortKey, sortDir])

  function resetFilters() {
    setStatusFilter("all")
    setIndustries([])
    setSearch("")
    setShowArchived(false)
  }

  const isFiltering =
    statusFilter !== "all" ||
    industries.length > 0 ||
    search.trim() !== "" ||
    showArchived

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">取り組み事例</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            アップロード済み資料の配信管理
          </p>
        </div>
        <Button asChild>
          <Link href="/cases/new">
            <Plus />
            新規追加
          </Link>
        </Button>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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

          <IndustryMultiSelect value={industries} onChange={setIndustries} />

          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="タイトル・企業名で検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <span>アーカイブも表示</span>
          </label>

          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
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
            <div className="flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
              {cases && cases.length === 0 ? (
                <>
                  <p>取り組み事例がありません。新規追加してください</p>
                  <Button asChild>
                    <Link href="/cases/new">
                      <Plus />
                      新規追加
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <p>条件に一致する事例がありません</p>
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    フィルタをリセット
                  </Button>
                </>
              )}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">
                    <SortHeader
                      label="資料"
                      sortKey="pdf_filename"
                      current={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortHeader
                      label="タイトル"
                      sortKey="title"
                      current={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortHeader
                      label="企業名"
                      sortKey="company_name"
                      current={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortHeader
                      label="配信予定日"
                      sortKey="publish_at"
                      current={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>配信先業界</TableHead>
                  <TableHead>配信先規模</TableHead>
                  <TableHead>
                    <SortHeader
                      label="ステータス"
                      sortKey="status"
                      current={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow
                    key={c.id}
                    className="group cursor-pointer hover:bg-muted/30"
                    onClick={() => router.push(`/cases/${c.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm">
                          {c.pdf_filename ?? "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.company_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.status === "scheduled" && c.publish_at
                        ? formatPublishDateTime(c.publish_at)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <TruncatedBadgeList
                        items={c.target_industries ?? []}
                        variant="secondary"
                      />
                    </TableCell>
                    <TableCell>
                      <TruncatedBadgeList
                        items={c.target_sales_phases ?? []}
                        variant="outline"
                        labelMap={SALES_PHASE_LABELS}
                      />
                    </TableCell>
                    <TableCell>
                      <CaseStatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <ChevronRight
                        className={cn(
                          "size-4 opacity-0 transition-opacity group-hover:opacity-100",
                        )}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function CasesListPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CasesListContent />
    </Suspense>
  )
}
