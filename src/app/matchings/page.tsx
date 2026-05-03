"use client"

import * as React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import {
  CalendarIcon,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  Search,
  X,
} from "lucide-react"
import { ja } from "date-fns/locale"
import type { DateRange } from "react-day-picker"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MatchingsTabs } from "@/components/matchings/matchings-tabs"
import { getMatchings, getUsers, updateMatchingStatus } from "@/lib/api-client"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getMatchingDisplayLabel,
  type MatchingStatus,
} from "@/lib/status-labels"
import { cn } from "@/lib/utils"

// ============================================================
// Types
// ============================================================

type Matching = {
  id: string
  case_id: string
  case_title: string
  applicant_user_id: string
  applicant_company_id: string
  target_company_id: string
  target_company_name: string
  score: number
  threshold_flag: boolean
  status: MatchingStatus | string
  closed_reason: string | null
  message: string
  created_at: string
  updated_at: string
  company_total_count: number
}

type User = {
  id: string
  name: string
  avatar_url?: string
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "要対応", label: "要対応" },
  { value: "待機中", label: "待機中" },
  { value: "開催準備中", label: "開催準備中" },
  { value: "終了", label: "終了" },
]

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function formatDate(d: Date) {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} (${WEEKDAYS[d.getDay()]})`
}

function MatchingStatusBadge({
  matching,
}: {
  matching: { status: string; closed_reason?: string | null }
}) {
  const label = getMatchingDisplayLabel(matching)
  if (matching.status === "要対応") {
    return (
      <Badge className="border-transparent bg-warning/15 text-warning">
        {label}
      </Badge>
    )
  }
  if (matching.status === "開催準備中") {
    return (
      <Badge className="border-transparent bg-success/15 text-success">
        {label}
      </Badge>
    )
  }
  return <Badge variant="secondary">{label}</Badge>
}

function CompanyCombobox({
  companies,
  value,
  onChange,
}: {
  companies: { id: string; name: string }[]
  value: string | null
  onChange: (v: string | null) => void
}) {
  const [open, setOpen] = React.useState(false)
  const selected = value ? companies.find((c) => c.id === value) : null
  const visible = companies.slice(0, 50)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 min-w-[14rem] max-w-[18rem] justify-between font-normal"
        >
          <span className="truncate">
            {selected ? selected.name : "希望先企業を選択"}
          </span>
          <ChevronDown className="size-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="企業名で検索..." />
          <CommandList>
            <CommandEmpty>該当する企業がありません</CommandEmpty>
            <CommandGroup>
              {visible.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.name}
                  onSelect={() => {
                    onChange(c.id === value ? null : c.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "size-4",
                      value === c.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{c.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
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
        : "申請期間"
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

/**
 * 現在のステータスから遷移可能なステータスのリスト。
 * 待機中⇔要対応 は DB 上同じ値（pending）で count 依存のため手動遷移は非表示。
 */
function availableTransitions(current: string): MatchingStatus[] {
  if (current === "終了") return ["待機中"]
  if (current === "開催準備中") return ["待機中", "終了"]
  return ["開催準備中", "終了"] // 待機中 / 要対応
}

const TRANSITION_LABELS: Record<MatchingStatus, string> = {
  待機中: "待機中に戻す",
  要対応: "要対応に戻す",
  開催準備中: "開催準備中にする",
  終了: "終了にする",
}

function MatchingDetailSheet({
  matching,
  applicantName,
  open,
  onOpenChange,
  onStatusChanged,
}: {
  matching: Matching | null
  applicantName: string
  open: boolean
  onOpenChange: (v: boolean) => void
  onStatusChanged: () => void | Promise<void>
}) {
  const [saving, setSaving] = React.useState(false)

  async function handleStatusChange(newStatus: MatchingStatus) {
    if (!matching || saving) return
    setSaving(true)
    const toastId = toast.loading(`ステータスを「${newStatus}」に変更中…`)
    try {
      await updateMatchingStatus(matching.id, newStatus)
      toast.success(`ステータスを「${newStatus}」に変更しました`, { id: toastId })
      await onStatusChanged()
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "ステータス更新に失敗しました",
        { id: toastId },
      )
    } finally {
      setSaving(false)
    }
  }

  const transitions = matching
    ? availableTransitions(matching.status as string)
    : []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>マッチング申請の詳細</SheetTitle>
          <SheetDescription>{matching?.id}</SheetDescription>
        </SheetHeader>
        {matching && (
          <div className="space-y-4 px-4">
            <div className="flex items-center justify-between">
              <MatchingStatusBadge matching={matching} />
              <span className="font-mono text-sm tabular-nums">
                スコア {Math.round(matching.score * 100)}%
              </span>
            </div>
            <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-sm">
              <dt className="text-muted-foreground">申請日時</dt>
              <dd>{formatDateTime(matching.created_at)}</dd>
              <dt className="text-muted-foreground">申請者</dt>
              <dd>{applicantName || "—"}</dd>
              <dt className="text-muted-foreground">希望先企業</dt>
              <dd>{matching.target_company_name}</dd>
              <dt className="text-muted-foreground">対象事例</dt>
              <dd>{matching.case_title}</dd>
            </dl>
            {matching.message && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  メッセージ
                </p>
                <p className="rounded-md border bg-muted/30 p-3 text-sm">
                  {matching.message}
                </p>
              </div>
            )}

            {/* ---- ステータス変更アクション ---- */}
            <div className="space-y-2 rounded-md border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                ステータス変更
              </p>
              {transitions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  この状態から変更できる遷移はありません
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {transitions.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={s === "終了" ? "destructive" : "default"}
                      disabled={saving}
                      onClick={() => handleStatusChange(s)}
                    >
                      {saving && (
                        <Loader2 className="size-3.5 animate-spin" />
                      )}
                      {TRANSITION_LABELS[s]}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ============================================================
// Page
// ============================================================

function MatchingsListContent() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get("status") ?? "all"

  const [matchings, setMatchings] = React.useState<Matching[] | null>(null)
  const [users, setUsers] = React.useState<User[]>([])
  const [error, setError] = React.useState<string | null>(null)

  const [status, setStatus] = React.useState(initialStatus)
  const [companyId, setCompanyId] = React.useState<string | null>(null)
  const [range, setRange] = React.useState<DateRange | undefined>(undefined)

  const [sheetMatching, setSheetMatching] = React.useState<Matching | null>(
    null,
  )
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const loadData = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const [m, u] = await Promise.all([
        getMatchings({ signal }),
        getUsers({ signal }),
      ])
      setMatchings(m as Matching[])
      setUsers(u as User[])
      // 詳細シートで開いている matching があれば、新しいデータの同 id 行で差し替え
      setSheetMatching((prev) =>
        prev ? (m as Matching[]).find((x) => x.id === prev.id) ?? null : null,
      )
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  React.useEffect(() => {
    const ac = new AbortController()
    loadData(ac.signal)
    return () => ac.abort()
  }, [loadData])

  const userById = React.useMemo(() => {
    const map = new Map<string, User>()
    for (const u of users) map.set(u.id, u)
    return map
  }, [users])

  const companies = React.useMemo(() => {
    if (!matchings) return []
    const map = new Map<string, string>()
    for (const m of matchings) {
      if (!map.has(m.target_company_id))
        map.set(m.target_company_id, m.target_company_name)
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name, "ja"),
    )
  }, [matchings])

  const filtered = React.useMemo(() => {
    if (!matchings) return []
    return matchings.filter((m) => {
      if (status !== "all" && m.status !== status) return false
      if (companyId && m.target_company_id !== companyId) return false
      if (range?.from) {
        const t = new Date(m.created_at).getTime()
        if (t < range.from.getTime()) return false
        if (range.to && t > range.to.getTime() + 86_399_999) return false
      }
      return true
    })
  }, [matchings, status, companyId, range])

  const loading = !matchings && !error

  function reset() {
    setStatus("all")
    setCompanyId(null)
    setRange(undefined)
  }

  const isFiltering =
    status !== "all" || companyId !== null || range?.from !== undefined

  function openDetail(m: Matching) {
    setSheetMatching(m)
    setSheetOpen(true)
  }

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
        aggregateCount={companies.length === 0 ? null : companies.length}
      />

      <p className="text-sm text-muted-foreground">
        ユーザー1人ずつの申請履歴を時系列で確認できます。特定のユーザーや申請の状況を追跡したいときに使います。
      </p>

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

          <CompanyCombobox
            companies={companies}
            value={companyId}
            onChange={setCompanyId}
          />

          <DateRangePicker range={range} onChange={setRange} />

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
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
              <p>条件に一致する申請がありません</p>
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
                  <TableHead>申請日時</TableHead>
                  <TableHead>申請者</TableHead>
                  <TableHead>希望先企業</TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1">
                      スコア
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="スコアの説明"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Info className="size-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-medium">マッチング度合い</p>
                          <p className="mt-1 text-xs">
                            申込者と希望先企業の相性を AI が 0〜1
                            で算出。高いほど有益な情報交換が期待できます
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>備考</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => {
                  const applicant = userById.get(m.applicant_user_id)
                  return (
                    <TableRow
                      key={m.id}
                      className={cn(
                        "group cursor-pointer hover:bg-muted/30",
                        m.status === "要対応" &&
                          "bg-warning/5 shadow-[inset_3px_0_0_0_var(--warning)]",
                      )}
                      onClick={() => openDetail(m)}
                    >
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {formatDateTime(m.created_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {applicant?.name ?? "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {m.target_company_name}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1">
                          <span className="font-mono text-xs tabular-nums">
                            {Math.round(m.score * 100)}%
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                aria-label="スコアの説明"
                                onClick={(e) => e.stopPropagation()}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Info className="size-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-medium">マッチング度合い</p>
                              <p className="mt-1 text-xs">
                                申込者と希望先企業の相性を AI が 0〜1
                                で算出。高いほど有益な情報交換が期待できます
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </span>
                      </TableCell>
                      <TableCell>
                        <MatchingStatusBadge matching={m} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.status === "要対応"
                          ? "4件以上集まった企業"
                          : ""}
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

      <MatchingDetailSheet
        matching={sheetMatching}
        applicantName={
          sheetMatching
            ? userById.get(sheetMatching.applicant_user_id)?.name ?? ""
            : ""
        }
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onStatusChanged={() => loadData()}
      />
    </div>
  )
}

export default function MatchingsListPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MatchingsListContent />
    </Suspense>
  )
}
