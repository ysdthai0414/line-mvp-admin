"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bell,
  BellOff,
  ChevronRight,
  Info,
  Search,
  X,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ja } from "date-fns/locale"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getUsers } from "@/lib/api-client"
import { INDUSTRY_LIST } from "@/lib/master-data"
import {
  SALES_PHASES,
  SALES_PHASE_LABELS,
  USER_STATUS_LABELS,
  type UserStatus,
} from "@/lib/status-labels"
import { cn } from "@/lib/utils"

type User = {
  id: string
  name: string
  name_kana: string
  email: string
  company_id: string
  company_name: string
  company_industry: string
  company_prefecture: string
  position: string
  sales_phase: string
  status: UserStatus | string
  avatar_url?: string
  registered_at: string
  last_login_at?: string
  last_active_at?: string
  push_enabled: boolean
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "NEW", label: USER_STATUS_LABELS.NEW },
  { value: "AWAITING_CONFIRM", label: USER_STATUS_LABELS.AWAITING_CONFIRM },
  { value: "CONFIRMED", label: USER_STATUS_LABELS.CONFIRMED },
]

const yyyymmdd = (iso?: string) => {
  if (!iso) return "—"
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
}

function UserStatusBadge({ status }: { status: string }) {
  const label = USER_STATUS_LABELS[status as UserStatus] ?? status
  if (status === "CONFIRMED") {
    return (
      <Badge className="border-transparent bg-success/15 text-success">
        {label}
      </Badge>
    )
  }
  if (status === "AWAITING_CONFIRM") {
    return (
      <Badge className="border-transparent bg-warning/15 text-warning">
        {label}
      </Badge>
    )
  }
  return <Badge>{label}</Badge>
}

function MultiSelectPopover({
  label,
  options,
  value,
  onChange,
  countMap,
  width = "min-w-[12rem] max-w-[18rem]",
}: {
  label: string
  options: readonly string[]
  value: string[]
  onChange: (v: string[]) => void
  countMap?: Record<string, number>
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
            const count = countMap?.[opt]
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
                <span className="flex-1 truncate">{opt}</span>
                {count !== undefined && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {count}人
                  </span>
                )}
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

type SortKey =
  | "name"
  | "company_name"
  | "registered_at"
  | "last_active_at"
  | "status"

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className,
}: {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: "asc" | "desc"
  onSort: (k: SortKey) => void
  className?: string
}) {
  const active = current === sortKey
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
        className,
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

export default function UsersListPage() {
  const router = useRouter()
  const [users, setUsers] = React.useState<User[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const [phases, setPhases] = React.useState<string[]>([])
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [industries, setIndustries] = React.useState<string[]>([])
  const [search, setSearch] = React.useState("")
  const [pushOnly, setPushOnly] = React.useState(false)

  const [sortKey, setSortKey] = React.useState<SortKey>("registered_at")
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc")

  React.useEffect(() => {
    const ac = new AbortController()
    getUsers({ signal: ac.signal })
      .then((d) => setUsers(d as User[]))
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return
        setError(e instanceof Error ? e.message : String(e))
      })
    return () => ac.abort()
  }, [])

  const phaseCounts = React.useMemo(() => {
    const m: Record<string, number> = {}
    if (!users) return m
    for (const u of users) m[u.sales_phase] = (m[u.sales_phase] ?? 0) + 1
    return m
  }, [users])

  const industryCounts = React.useMemo(() => {
    const m: Record<string, number> = {}
    if (!users) return m
    for (const u of users)
      m[u.company_industry] = (m[u.company_industry] ?? 0) + 1
    return m
  }, [users])

  const filtered = React.useMemo(() => {
    if (!users) return []
    const q = search.trim().toLowerCase()
    const base = users.filter((u) => {
      if (phases.length > 0 && !phases.includes(u.sales_phase)) return false
      if (statusFilter !== "all" && u.status !== statusFilter) return false
      if (industries.length > 0 && !industries.includes(u.company_industry))
        return false
      if (pushOnly && !u.push_enabled) return false
      if (q) {
        const hay =
          `${u.name} ${u.name_kana} ${u.company_name} ${u.email}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    return base.sort((a, b) => {
      const av = (a[sortKey] ?? "") as string
      const bv = (b[sortKey] ?? "") as string
      const cmp =
        sortKey === "name"
          ? a.name_kana.localeCompare(b.name_kana, "ja")
          : av < bv
            ? -1
            : av > bv
              ? 1
              : 0
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [users, phases, statusFilter, industries, search, pushOnly, sortKey, sortDir])

  function reset() {
    setPhases([])
    setStatusFilter("all")
    setIndustries([])
    setSearch("")
    setPushOnly(false)
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const isFiltering =
    phases.length > 0 ||
    statusFilter !== "all" ||
    industries.length > 0 ||
    search.trim() !== "" ||
    pushOnly

  const loading = !users && !error

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">ユーザー</h1>
        <p className="mt-1 text-sm text-muted-foreground">LINEユーザーの管理</p>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <MultiSelectPopover
            label="売上フェーズ"
            options={SALES_PHASES.map((p) => p.id)}
            value={phases}
            onChange={setPhases}
            countMap={phaseCounts}
            width="min-w-[14rem] max-w-[18rem]"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="状態" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <MultiSelectPopover
            label="業界"
            options={INDUSTRY_LIST}
            value={industries}
            onChange={setIndustries}
            countMap={industryCounts}
          />
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="名前・カナ・企業名・メールで検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={pushOnly} onCheckedChange={setPushOnly} />
            <span>push有効のみ</span>
          </label>
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
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              該当ユーザーがいません
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12" />
                  <TableHead>
                    <SortHeader
                      label="氏名"
                      sortKey="name"
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
                  <TableHead className="w-40">役職</TableHead>
                  <TableHead className="w-32">売上フェーズ</TableHead>
                  <TableHead className="w-28">
                    <span className="inline-flex items-center gap-1">
                      <SortHeader
                        label="状態"
                        sortKey="status"
                        current={sortKey}
                        dir={sortDir}
                        onSort={handleSort}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="状態の説明"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Info className="size-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">
                            <strong>新規登録</strong>
                            ：LINE
                            で友だち追加されたが、プロファイル確認前
                          </p>
                          <p className="mt-1 text-xs">
                            <strong>確認待ち</strong>：プロファイル登録中
                          </p>
                          <p className="mt-1 text-xs">
                            <strong>確認済み</strong>
                            ：プロファイル確定、配信対象
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </TableHead>
                  <TableHead className="w-28">
                    <SortHeader
                      label="登録日"
                      sortKey="registered_at"
                      current={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-32">
                    <SortHeader
                      label="最終アクティブ"
                      sortKey="last_active_at"
                      current={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-16 text-center">push</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const initial = u.name.replace(/\s+/g, "")[0] ?? "?"
                  const lastActive = u.last_active_at
                    ? formatDistanceToNow(new Date(u.last_active_at), {
                        addSuffix: true,
                        locale: ja,
                      })
                    : "—"
                  return (
                    <TableRow
                      key={u.id}
                      className="group cursor-pointer hover:bg-muted/30"
                      onClick={() => router.push(`/users/${u.id}`)}
                    >
                      <TableCell>
                        <Avatar className="size-8">
                          {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                          <AvatarFallback className="bg-primary/10 text-xs text-primary">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {u.name_kana}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="truncate">{u.company_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {u.company_industry}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.position}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {SALES_PHASE_LABELS[u.sales_phase] ?? u.sales_phase}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <UserStatusBadge status={u.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {yyyymmdd(u.registered_at)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {lastActive}
                      </TableCell>
                      <TableCell className="text-center">
                        {u.push_enabled ? (
                          <Bell
                            className="mx-auto size-4 text-success"
                            aria-label="push 有効"
                          />
                        ) : (
                          <BellOff
                            className="mx-auto size-4 text-muted-foreground"
                            aria-label="push 無効"
                          />
                        )}
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
