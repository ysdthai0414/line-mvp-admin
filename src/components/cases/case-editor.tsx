"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  Calendar as CalendarBannerIcon,
  CalendarIcon,
  ChevronDown,
  Edit,
  FileText,
  Info,
  RotateCcw,
  Save,
  Send,
  Trash2,
  Upload,
} from "lucide-react"
import { format } from "date-fns"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  countTargetCompanies,
  INDUSTRY_LIST,
} from "@/lib/master-data"
import {
  CASE_STATUS_LABELS,
  SALES_PHASES,
  type CaseStatus,
} from "@/lib/status-labels"
import { cn } from "@/lib/utils"

// ============================================================
// Types
// ============================================================

export type CaseData = {
  id: string
  title: string
  company_name: string
  status: CaseStatus | string
  pdf_filename?: string
  publish_at?: string
  upload_at?: string
  target_industries?: string[]
  target_sales_phases?: string[]
}

type Stats = {
  company_counts_by_industry: Record<string, number>
  company_counts_by_phase: Record<string, number>
  company_counts_by_industry_phase: Record<string, Record<string, number>>
}

const TIME_OPTIONS = ["9:00", "12:00", "14:00", "17:00"] as const
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const

function formatJaDate(d: Date) {
  const m = d.getMonth() + 1
  const day = d.getDate()
  const w = WEEKDAYS[d.getDay()]
  return `${d.getFullYear()}年${m}月${day}日（${w}）`
}

function formatJaDateTime(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${formatJaDate(d)} ${hh}:${mm}`
}

function CaseStatusBadge({ status }: { status: string }) {
  const label = CASE_STATUS_LABELS[status as CaseStatus] ?? status
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
  if (status === "archived") return <Badge variant="secondary">{label}</Badge>
  return <Badge variant="outline">{label}</Badge>
}

// ============================================================
// PDF preview / dropzone (left card)
// ============================================================

function PdfPanel({
  filename,
  uploadedName,
  onSelectFile,
  disabled,
}: {
  filename?: string
  uploadedName: string | null
  onSelectFile: (name: string) => void
  disabled: boolean
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const displayName = uploadedName ?? filename ?? null

  function pickFile() {
    if (disabled) return
    inputRef.current?.click()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) onSelectFile(f.name)
  }

  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText className="size-4 text-muted-foreground" />
          <span className="truncate">{displayName ?? "未アップロード"}</span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          hidden
          onChange={handleChange}
        />

        <div className="flex min-h-[600px] flex-1 items-center justify-center rounded-lg border border-dashed bg-muted/20">
          {displayName ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <FileText className="size-24 text-muted-foreground/30" />
              <div className="text-sm text-muted-foreground">{displayName}</div>
              <div className="text-xs text-muted-foreground/60">
                ※ プレビュー機能は今後実装予定
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <Upload className="size-12 text-muted-foreground/40" />
              <div className="text-sm text-muted-foreground">
                PDFファイルをドラッグ＆ドロップ、または
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={pickFile}
                disabled={disabled}
              >
                ファイルを選択
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={pickFile}
            disabled={disabled}
          >
            <Upload className="size-4" />
            別のPDFをアップロード
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Main editor
// ============================================================

export function CaseEditor({
  initialCase,
}: {
  initialCase?: CaseData
}) {
  const router = useRouter()
  const isNew = !initialCase
  const status = initialCase?.status ?? "draft"

  const isPublished = status === "published"
  const isArchived = status === "archived"
  const isScheduled = status === "scheduled"
  const fullyLocked = isPublished || isArchived // 完全ロック

  // scheduled のとき: 既定は read-only、ボタンで編集モードへ
  const [isEditing, setIsEditing] = React.useState(false)

  const disabled = fullyLocked
    ? true
    : isScheduled
      ? !isEditing
      : false

  // ---- form state ----
  const initialPublishDate = React.useMemo(() => {
    if (initialCase?.publish_at) return new Date(initialCase.publish_at)
    return undefined
  }, [initialCase])

  const initialTime = React.useMemo(() => {
    if (initialCase?.publish_at) {
      const d = new Date(initialCase.publish_at)
      return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`
    }
    return "9:00"
  }, [initialCase])

  const [uploadedName, setUploadedName] = React.useState<string | null>(null)
  const [publishDate, setPublishDate] = React.useState<Date | undefined>(
    initialPublishDate,
  )
  const [dateOpen, setDateOpen] = React.useState(false)
  const [publishTime, setPublishTime] = React.useState<string>(
    TIME_OPTIONS.includes(initialTime as (typeof TIME_OPTIONS)[number])
      ? initialTime
      : "9:00",
  )
  const [industries, setIndustries] = React.useState<string[]>(
    initialCase?.target_industries ?? [],
  )
  const [phases, setPhases] = React.useState<string[]>(
    initialCase?.target_sales_phases ?? [],
  )

  // ---- stats fetch ----
  const [stats, setStats] = React.useState<Stats | null>(null)
  React.useEffect(() => {
    let cancelled = false
    fetch("/mocks/stats.json")
      .then((r) => r.json())
      .then((d: Stats) => {
        if (!cancelled) setStats(d)
      })
      .catch(() => {
        if (!cancelled) setStats(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // ---- live target count ----
  const targetCount = React.useMemo(() => {
    if (!stats) return 0
    return countTargetCompanies(
      stats.company_counts_by_industry_phase,
      industries,
      phases,
    )
  }, [stats, industries, phases])

  // ---- handlers ----
  function toggle(list: string[], value: string) {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value]
  }

  function selectAllIndustries() {
    setIndustries([...INDUSTRY_LIST])
  }
  function clearIndustries() {
    setIndustries([])
  }
  function selectAllPhases() {
    setPhases(SALES_PHASES.map((p) => p.id))
  }
  function clearPhases() {
    setPhases([])
  }

  function combinePublishAt() {
    if (!publishDate) return undefined
    const [hStr, mStr] = publishTime.split(":")
    const d = new Date(publishDate)
    d.setHours(Number(hStr), Number(mStr), 0, 0)
    return d
  }

  function saveDraft() {
    toast.success("下書きを保存しました（プロトタイプのため永続化されません）")
    router.push("/cases")
  }

  function saveScheduled() {
    if (!publishDate) {
      toast.error("配信日を設定してください")
      return
    }
    if (industries.length === 0) {
      toast.error("配信先業界を1つ以上選択してください")
      return
    }
    if (phases.length === 0) {
      toast.error("配信先企業規模を1つ以上選択してください")
      return
    }
    const publishAt = combinePublishAt()!
    toast.success(
      `公開予定として保存しました（${formatJaDateTime(publishAt)} 配信予定 / 約${targetCount.toLocaleString()}社）`,
    )
    router.push("/cases")
  }

  function archiveCase() {
    toast.success("アーカイブしました（プロトタイプのため永続化されません）")
    router.push("/cases")
  }

  function startEditing() {
    setIsEditing(true)
  }

  function cancelEditing() {
    // フォームを初期値に戻す
    setPublishDate(initialPublishDate)
    setPublishTime(
      TIME_OPTIONS.includes(initialTime as (typeof TIME_OPTIONS)[number])
        ? initialTime
        : "9:00",
    )
    setIndustries(initialCase?.target_industries ?? [])
    setPhases(initialCase?.target_sales_phases ?? [])
    setUploadedName(null)
    setIsEditing(false)
  }

  function updateScheduled() {
    if (!publishDate) {
      toast.error("配信日を設定してください")
      return
    }
    if (industries.length === 0) {
      toast.error("配信先業界を1つ以上選択してください")
      return
    }
    if (phases.length === 0) {
      toast.error("配信先企業規模を1つ以上選択してください")
      return
    }
    toast.success(
      "公開予定を更新しました（プロトタイプのため永続化されません）",
    )
    setIsEditing(false)
  }

  function unarchiveCase() {
    toast.success("アーカイブを解除しました（プロトタイプ）")
    router.push("/cases")
  }

  function deleteCase() {
    toast.success("削除しました（プロトタイプのため永続化されません）")
    router.push("/cases")
  }

  const headerTitle = isNew ? "新規取り組み事例" : initialCase!.title

  const summaryParts: string[] = []
  if (industries.length > 0) {
    summaryParts.push(industries.slice(0, 3).join("・"))
    if (industries.length > 3) summaryParts.push(`他${industries.length - 3}`)
  }
  if (phases.length > 0) {
    const phaseLabels = phases
      .map((p) => SALES_PHASES.find((x) => x.id === p)?.label ?? p)
      .slice(0, 3)
    let s = phaseLabels.join("・")
    if (phases.length > 3) s += ` 他${phases.length - 3}`
    summaryParts.push(s)
  }
  const summary = summaryParts.join(" × ")

  const lockedNote = isPublished
    ? "※ 公開済みのため、配信日は変更できません"
    : isArchived
      ? "※ アーカイブされた事例です。編集には先にアーカイブ解除が必要です"
      : null

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/cases"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          取り組み事例一覧へ
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">{headerTitle}</h1>
            {!isNew && initialCase!.company_name && (
              <p className="mt-1 text-sm text-muted-foreground">
                {initialCase!.company_name}
              </p>
            )}
          </div>
          <CaseStatusBadge status={status} />
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-200px)] grid-cols-1 gap-6 lg:grid-cols-2">
        <PdfPanel
          filename={initialCase?.pdf_filename}
          uploadedName={uploadedName}
          onSelectFile={(name) => setUploadedName(name)}
          disabled={disabled}
        />

        <div className="flex flex-col gap-6">
          {/* Read-only banner: scheduled & !isEditing */}
          {isScheduled && !isEditing && (
            <div className="flex flex-col gap-3 rounded-md border border-info/30 bg-info/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <CalendarBannerIcon className="size-5 shrink-0 text-info" />
                <div>
                  <p className="font-medium text-info">
                    この事例は公開予定です
                  </p>
                  <p className="text-sm text-muted-foreground">
                    配信予定日：
                    {publishDate
                      ? format(
                          (() => {
                            const [hStr, mStr] = publishTime.split(":")
                            const d = new Date(publishDate)
                            d.setHours(
                              Number(hStr),
                              Number(mStr),
                              0,
                              0,
                            )
                            return d
                          })(),
                          "M月d日（EEE）HH:mm",
                          { locale: ja },
                        )
                      : "未設定"}
                  </p>
                </div>
              </div>
              <Button onClick={startEditing} size="lg" className="shrink-0">
                <Edit className="size-4" />
                公開予定を変更
              </Button>
            </div>
          )}

          {/* Editing banner: scheduled & isEditing */}
          {isScheduled && isEditing && (
            <div className="flex flex-col gap-3 rounded-md border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="size-5 shrink-0 text-warning" />
                <div>
                  <p className="font-medium text-warning">
                    公開予定を変更中
                  </p>
                  <p className="text-sm text-muted-foreground">
                    配信日や配信先を変更すると、すでに予定通知を受け取ったユーザーに混乱を与える可能性があります。
                  </p>
                </div>
              </div>
              <Button
                onClick={cancelEditing}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                キャンセル
              </Button>
            </div>
          )}

          {/* Locked note: published / archived */}
          {lockedNote && (
            <p className="text-xs text-muted-foreground">{lockedNote}</p>
          )}

          {/* A) 資料情報 */}
          <Card>
            <CardContent className="space-y-3 p-6">
              <h2 className="text-sm font-semibold">資料情報</h2>
              <dl className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
                <dt className="text-muted-foreground">PDFファイル</dt>
                <dd>
                  {uploadedName ?? initialCase?.pdf_filename ?? "—"}
                </dd>
                <dt className="text-muted-foreground">アップロード日</dt>
                <dd>
                  {initialCase?.upload_at
                    ? formatJaDate(new Date(initialCase.upload_at))
                    : "—"}
                </dd>
              </dl>
            </CardContent>
          </Card>

          {/* B) 配信日設定 */}
          <Card>
            <CardContent className="space-y-3 p-6">
              <h2 className="text-sm font-semibold">📅 配信日設定</h2>
              {isPublished ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    配信日時（読み取り専用）
                  </label>
                  <div className="cursor-not-allowed rounded-md bg-muted px-3 py-2 text-sm">
                    {publishDate
                      ? `${formatJaDate(publishDate)} ${publishTime}`
                      : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ※ 公開済みのため、配信日は変更できません
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Popover open={dateOpen} onOpenChange={setDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          disabled={disabled}
                          className={cn(
                            "w-56 justify-start font-normal",
                            !publishDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="size-4" />
                          {publishDate
                            ? formatJaDate(publishDate)
                            : "日付を選択"}
                          <ChevronDown className="ml-auto size-3.5 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={publishDate}
                          onSelect={(d) => {
                            setPublishDate(d)
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

                    <Select
                      value={publishTime}
                      onValueChange={setPublishTime}
                      disabled={disabled}
                    >
                      <SelectTrigger className="w-28">
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
                  <p className="text-xs text-muted-foreground">
                    {disabled
                      ? lockedNote ?? "※ 編集モードに切り替えると変更できます"
                      : "※ 配信日は変更可能です"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* C) 配信先業界 */}
          <Card>
            <CardContent className="space-y-3 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">🏭 配信先業界</h2>
                {!disabled && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllIndustries}
                    >
                      すべて選択
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearIndustries}
                    >
                      全解除
                    </Button>
                  </div>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto rounded-md border">
                {INDUSTRY_LIST.map((ind) => {
                  const checked = industries.includes(ind)
                  const count =
                    stats?.company_counts_by_industry?.[ind] ?? null
                  return (
                    <label
                      key={ind}
                      className={cn(
                        "flex items-center gap-2 border-b px-3 py-2 last:border-b-0",
                        disabled
                          ? "cursor-default"
                          : "cursor-pointer hover:bg-muted/40",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={() =>
                          setIndustries((cur) => toggle(cur, ind))
                        }
                      />
                      <span className="flex-1 text-sm">{ind}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {count !== null ? `${count.toLocaleString()}社` : "—"}
                      </span>
                    </label>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* D) 配信先企業規模 */}
          <Card>
            <CardContent className="space-y-3 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">💰 配信先企業規模</h2>
                {!disabled && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllPhases}
                    >
                      すべて選択
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearPhases}>
                      全解除
                    </Button>
                  </div>
                )}
              </div>
              <div className="rounded-md border">
                {SALES_PHASES.map((p) => {
                  const checked = phases.includes(p.id)
                  const count =
                    stats?.company_counts_by_phase?.[p.id] ?? null
                  return (
                    <label
                      key={p.id}
                      className={cn(
                        "flex items-center gap-2 border-b px-3 py-2 last:border-b-0",
                        disabled
                          ? "cursor-default"
                          : "cursor-pointer hover:bg-muted/40",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={() =>
                          setPhases((cur) => toggle(cur, p.id))
                        }
                      />
                      <span className="flex-1 text-sm">{p.label}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {count !== null ? `${count.toLocaleString()}社` : "—"}
                      </span>
                    </label>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* E) 配信対象企業の見込み件数 */}
          <Card
            className={cn(
              "border-primary/30",
              targetCount === 0 &&
                industries.length > 0 &&
                phases.length > 0 &&
                "border-destructive/40",
            )}
          >
            <CardContent className="space-y-2 p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                配信対象（リアルタイム計算）
              </p>
              {industries.length === 0 || phases.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  業界と企業規模を選択してください
                </p>
              ) : targetCount === 0 ? (
                <p className="text-sm text-destructive">
                  配信対象企業がありません
                </p>
              ) : (
                <>
                  <p className="text-2xl font-bold text-primary tabular-nums">
                    配信対象：約 {targetCount.toLocaleString()} 社
                  </p>
                  {summary && (
                    <p className="text-xs text-muted-foreground">{summary}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* F) Action buttons (sticky footer) */}
          <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-wrap items-center justify-end gap-2 border-t bg-background/95 px-6 py-3 backdrop-blur lg:-mx-0 lg:mb-0 lg:rounded-b-lg lg:border lg:px-4">
            {/* Editing scheduled: only update + cancel */}
            {isScheduled && isEditing ? (
              <>
                <Button variant="outline" onClick={cancelEditing}>
                  キャンセル
                </Button>
                <Button onClick={updateScheduled}>
                  <Save className="size-4" />
                  公開予定を更新
                </Button>
              </>
            ) : (
              <>
                {!isNew && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="size-4" />
                        削除
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          この事例を削除しますか？
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          この操作は取り消せません。配信予定や履歴も削除されます。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={deleteCase}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          削除する
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {!isNew && (isPublished || isScheduled) && (
                  <div className="flex items-center gap-1">
                    <Button variant="outline" onClick={archiveCase}>
                      アーカイブ
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="アーカイブの説明"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Info className="size-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-medium">過去の配信を整理</p>
                        <p className="mt-1 text-xs">
                          完全削除はせず、一覧から非表示にして履歴として残します。後で再表示も可能。
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
                {!isNew && isArchived && (
                  <Button variant="outline" onClick={unarchiveCase}>
                    <RotateCcw className="size-4" />
                    アーカイブ解除
                  </Button>
                )}
                {/* Draft / new: 下書き保存 + 公開予定として保存 */}
                {!disabled && !isScheduled && (
                  <>
                    <Button variant="outline" onClick={saveDraft}>
                      <Save className="size-4" />
                      下書き保存
                    </Button>
                    <Button onClick={saveScheduled}>
                      <Send className="size-4" />
                      公開予定として保存
                    </Button>
                  </>
                )}
                {/* Scheduled (read-only): 公開予定を変更 */}
                {isScheduled && !isEditing && (
                  <Button onClick={startEditing}>
                    <Edit className="size-4" />
                    公開予定を変更
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Loading skeleton (exported for /cases/[id])
// ============================================================

export function CaseEditorSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-48" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-[600px] w-full" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    </div>
  )
}
