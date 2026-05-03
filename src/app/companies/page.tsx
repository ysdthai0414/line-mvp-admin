"use client"

import * as React from "react"
import {
  ExternalLink,
  Filter as FilterIcon,
  Search,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getCompanies } from "@/lib/api-client"
import { INDUSTRY_LIST, PREFECTURE_LIST } from "@/lib/master-data"
import { SALES_PHASES, SALES_PHASE_LABELS } from "@/lib/status-labels"
import { cn } from "@/lib/utils"

// ============================================================
// Types
// ============================================================

type Company = {
  id: string
  corporate_number: string
  name: string
  application_type: string
  prefecture: string
  industry: string
  employee_count: number
  revenue_oku: number
  target_year: number
  declaration_url: string
  sales_phase: string
}

const PAGE_SIZE = 50
const YEAR_MIN = 2025
const YEAR_MAX = 2056

function shortApplicationType(t: string) {
  if (t.startsWith("単独")) return "単独"
  if (t.startsWith("企業グループ")) return "グループ"
  return t
}

// ============================================================
// Filter Panel (used in sidebar + sheet)
// ============================================================

type FilterState = {
  industries: string[]
  prefectures: string[]
  phases: string[]
  yearRange: [number, number]
  search: string
}

const DEFAULT_FILTER: FilterState = {
  industries: [],
  prefectures: [],
  phases: [],
  yearRange: [YEAR_MIN, YEAR_MAX],
  search: "",
}

function CountedCheckList({
  options,
  value,
  onChange,
  countMap,
  maxHeightClass = "max-h-72",
}: {
  options: readonly string[]
  value: string[]
  onChange: (v: string[]) => void
  countMap: Record<string, number>
  maxHeightClass?: string
}) {
  return (
    <div
      className={cn(
        "rounded-md border",
        maxHeightClass,
        "overflow-y-auto",
      )}
    >
      {options.map((opt) => {
        const checked = value.includes(opt)
        const count = countMap[opt] ?? 0
        return (
          <label
            key={opt}
            className="flex cursor-pointer items-center gap-2 border-b px-3 py-1.5 text-sm last:border-b-0 hover:bg-muted/40"
          >
            <Checkbox
              checked={checked}
              onCheckedChange={(next) => {
                if (next) onChange([...value, opt])
                else onChange(value.filter((v) => v !== opt))
              }}
            />
            <span className="flex-1 truncate">{opt}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {count.toLocaleString()}社
            </span>
          </label>
        )
      })}
    </div>
  )
}

function FilterPanel({
  state,
  setState,
  industryCounts,
  prefectureCounts,
  phaseCounts,
}: {
  state: FilterState
  setState: React.Dispatch<React.SetStateAction<FilterState>>
  industryCounts: Record<string, number>
  prefectureCounts: Record<string, number>
  phaseCounts: Record<string, number>
}) {
  function reset() {
    setState(DEFAULT_FILTER)
  }
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          検索
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="企業名・法人番号"
            value={state.search}
            onChange={(e) =>
              setState((s) => ({ ...s, search: e.target.value }))
            }
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          業種
        </label>
        <CountedCheckList
          options={INDUSTRY_LIST}
          value={state.industries}
          onChange={(industries) => setState((s) => ({ ...s, industries }))}
          countMap={industryCounts}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          都道府県
        </label>
        <CountedCheckList
          options={PREFECTURE_LIST}
          value={state.prefectures}
          onChange={(prefectures) => setState((s) => ({ ...s, prefectures }))}
          countMap={prefectureCounts}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          売上規模
        </label>
        <CountedCheckList
          options={SALES_PHASES.map((p) => p.id)}
          value={state.phases}
          onChange={(phases) => setState((s) => ({ ...s, phases }))}
          countMap={phaseCounts}
          maxHeightClass="max-h-none"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            目標達成年
          </label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {state.yearRange[0]} 〜 {state.yearRange[1]}
          </span>
        </div>
        <Slider
          min={YEAR_MIN}
          max={YEAR_MAX}
          step={1}
          value={state.yearRange}
          onValueChange={(v) =>
            setState((s) => ({
              ...s,
              yearRange: [v[0], v[1]] as [number, number],
            }))
          }
        />
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={reset}
      >
        <X className="size-4" />
        リセット
      </Button>
    </div>
  )
}

// ============================================================
// Page
// ============================================================

export default function CompaniesPage() {
  const [companies, setCompanies] = React.useState<Company[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [filter, setFilter] = React.useState<FilterState>(DEFAULT_FILTER)
  const [page, setPage] = React.useState(1)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  React.useEffect(() => {
    const ac = new AbortController()
    getCompanies({ signal: ac.signal })
      .then((d) => setCompanies(d))
      .catch((e: unknown) => {
        // AbortError は次の effect 実行による意図的な中断なので無視
        if (e instanceof Error && e.name === "AbortError") return
        setError(e instanceof Error ? e.message : String(e))
      })
    return () => ac.abort()
  }, [])

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setPage(1)
  }, [filter])

  // ----- count maps -----
  const industryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    if (!companies) return counts
    for (const c of companies) {
      counts[c.industry] = (counts[c.industry] ?? 0) + 1
    }
    return counts
  }, [companies])

  const prefectureCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    if (!companies) return counts
    for (const c of companies) {
      counts[c.prefecture] = (counts[c.prefecture] ?? 0) + 1
    }
    return counts
  }, [companies])

  const phaseCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    if (!companies) return counts
    for (const c of companies) {
      counts[c.sales_phase] = (counts[c.sales_phase] ?? 0) + 1
    }
    return counts
  }, [companies])

  // ----- filtered list -----
  const filtered = React.useMemo(() => {
    if (!companies) return []
    const q = filter.search.trim().toLowerCase()
    return companies.filter((c) => {
      if (
        filter.industries.length > 0 &&
        !filter.industries.includes(c.industry)
      )
        return false
      if (
        filter.prefectures.length > 0 &&
        !filter.prefectures.includes(c.prefecture)
      )
        return false
      if (filter.phases.length > 0 && !filter.phases.includes(c.sales_phase))
        return false
      if (
        c.target_year < filter.yearRange[0] ||
        c.target_year > filter.yearRange[1]
      )
        return false
      if (q) {
        if (
          !c.name.toLowerCase().includes(q) &&
          !c.corporate_number.includes(filter.search.trim())
        )
          return false
      }
      return true
    })
  }, [companies, filter])

  const total = companies?.length ?? 0
  const filteredCount = filtered.length
  const pageCount = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const startIdx = (safePage - 1) * PAGE_SIZE
  const visible = React.useMemo(
    () => filtered.slice(startIdx, startIdx + PAGE_SIZE),
    [filtered, startIdx],
  )

  const loading = !companies && !error

  function openRow(url: string) {
    if (url) window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-3xl font-bold tracking-tight">認可企業マスタ</h1>
        <p className="text-sm text-muted-foreground">
          100億宣言企業 全{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {total.toLocaleString()}
          </span>{" "}
          社
        </p>
      </header>


      {/* Mobile filter trigger */}
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <p className="text-sm">
          <span className="font-bold tabular-nums">
            {filteredCount.toLocaleString()}
          </span>{" "}
          社が該当
        </p>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <FilterIcon className="size-4" />
              フィルタ
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle>絞り込み</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6">
              <FilterPanel
                state={filter}
                setState={setFilter}
                industryCounts={industryCounts}
                prefectureCounts={prefectureCounts}
                phaseCounts={phaseCounts}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <Card>
            <CardContent className="p-4">
              <FilterPanel
                state={filter}
                setState={setFilter}
                industryCounts={industryCounts}
                prefectureCounts={prefectureCounts}
                phaseCounts={phaseCounts}
              />
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-3 min-w-0">
          <div className="hidden items-center justify-between lg:flex">
            <p className="text-sm">
              <span className="text-2xl font-bold tabular-nums text-primary">
                {filteredCount.toLocaleString()}
              </span>{" "}
              社が該当
              <span className="ml-2 text-xs text-muted-foreground">
                （全 {total.toLocaleString()} 社中）
              </span>
            </p>
            {filteredCount > 0 && (
              <p className="text-xs text-muted-foreground tabular-nums">
                {(startIdx + 1).toLocaleString()}-
                {Math.min(startIdx + PAGE_SIZE, filteredCount).toLocaleString()}{" "}
                / {filteredCount.toLocaleString()} 件
              </p>
            )}
          </div>

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
              {!loading && !error && filteredCount === 0 && (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  条件に該当する企業がありません
                </div>
              )}
              {!loading && filteredCount > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">法人番号</TableHead>
                      <TableHead>企業名</TableHead>
                      <TableHead className="w-[88px]">申請</TableHead>
                      <TableHead className="w-[100px]">都道府県</TableHead>
                      <TableHead>業種</TableHead>
                      <TableHead className="w-[88px] text-right">
                        従業員
                      </TableHead>
                      <TableHead className="w-[110px] text-right">
                        売上高
                      </TableHead>
                      <TableHead className="w-[80px]">目標年</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((c) => (
                      <TableRow
                        key={c.id}
                        className="group cursor-pointer hover:bg-muted/30"
                        onClick={() => openRow(c.declaration_url)}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                          {c.corporate_number}
                        </TableCell>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {shortApplicationType(c.application_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {c.prefecture}
                        </TableCell>
                        <TableCell className="text-sm">{c.industry}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {c.employee_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {c.revenue_oku.toLocaleString()}億円
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {c.target_year}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <ExternalLink className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {pageCount > 1 && (
            <PaginationBar
              page={safePage}
              pageCount={pageCount}
              onChange={setPage}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Pagination bar
// ============================================================

function PaginationBar({
  page,
  pageCount,
  onChange,
}: {
  page: number
  pageCount: number
  onChange: (p: number) => void
}) {
  // Build a compact list: 1, ..., page-1, page, page+1, ..., last
  const pages = React.useMemo(() => {
    const set = new Set<number>([1, pageCount, page, page - 1, page + 1])
    return Array.from(set)
      .filter((p) => p >= 1 && p <= pageCount)
      .sort((a, b) => a - b)
  }, [page, pageCount])

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault()
              if (page > 1) onChange(page - 1)
            }}
            aria-disabled={page === 1}
            className={cn(page === 1 && "pointer-events-none opacity-40")}
          />
        </PaginationItem>
        {pages.map((p, idx) => {
          const prev = pages[idx - 1]
          const showEllipsis = prev !== undefined && p - prev > 1
          return (
            <React.Fragment key={p}>
              {showEllipsis && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink
                  href="#"
                  isActive={p === page}
                  onClick={(e) => {
                    e.preventDefault()
                    onChange(p)
                  }}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            </React.Fragment>
          )
        })}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault()
              if (page < pageCount) onChange(page + 1)
            }}
            aria-disabled={page === pageCount}
            className={cn(
              page === pageCount && "pointer-events-none opacity-40",
            )}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
