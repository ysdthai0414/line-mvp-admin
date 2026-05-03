"use client"

import * as React from "react"
import { Mail, Plus, Save, Send } from "lucide-react"
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
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ROLE_LABELS, type Role } from "@/lib/status-labels"

type Staff = {
  id: string
  name: string
  name_kana?: string
  email: string
  role: "admin" | "manager" | "member" | "viewer" | string
  department?: string
  status?: "active" | "inactive" | string
  avatar_url?: string
  last_login_at?: string
  created_at?: string
}

type StaffRow = {
  id: string
  name: string
  email: string
  role: string
  department: string
  enabled: boolean
  last_login_at?: string
  avatar_url?: string
}

const ROLE_OPTIONS = [
  { value: "admin", label: "管理者" },
  { value: "manager", label: "マネージャー" },
  { value: "member", label: "メンバー" },
  { value: "viewer", label: "閲覧のみ" },
]

const ME_ID = "s_0001" // 吉田 航平（事務局スタッフ）を仮想ログイン

// ============================================================
// Tab 1: Staff
// ============================================================

function StaffTab() {
  const [staff, setStaff] = React.useState<Staff[] | null>(null)
  const [rows, setRows] = React.useState<StaffRow[]>([])
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    fetch("/mocks/staff.json")
      .then((r) => r.json())
      .then((d: Staff[]) => {
        if (cancelled) return
        setStaff(d)
        setRows(
          d.map((s) => ({
            id: s.id,
            name: s.name,
            email: s.email,
            role: s.role,
            department: s.department ?? "—",
            enabled: s.status !== "inactive",
            last_login_at: s.last_login_at,
            avatar_url: s.avatar_url,
          })),
        )
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 自分自身を admin から降格しようとした場合の確認ダイアログ
  const [pendingDemote, setPendingDemote] = React.useState<{
    id: string
    role: string
  } | null>(null)

  function applyRoleChange(id: string, role: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, role } : r)))
    toast.success("ロールを変更しました（プロトタイプ）")
  }

  function changeRole(id: string, role: string) {
    const current = rows.find((r) => r.id === id)
    const isSelfDemote =
      id === ME_ID && current?.role === "admin" && role !== "admin"
    if (isSelfDemote) {
      setPendingDemote({ id, role })
      return
    }
    applyRoleChange(id, role)
  }

  function toggleEnabled(id: string, enabled: boolean) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)))
    toast.success(enabled ? "アカウントを有効化しました" : "アカウントを無効化しました")
  }

  const loading = !staff && !error

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">スタッフ管理</h2>
            <p className="text-sm text-muted-foreground">
              事務局メンバーのロール・有効状態を管理します
            </p>
          </div>
          <InviteStaffDialog />
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12" />
                  <TableHead>氏名</TableHead>
                  <TableHead>メール</TableHead>
                  <TableHead className="w-36">部署</TableHead>
                  <TableHead className="w-40">ロール</TableHead>
                  <TableHead className="w-28">状態</TableHead>
                  <TableHead className="w-32">最終ログイン</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const initial = r.name.replace(/\s+/g, "")[0] ?? "?"
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Avatar className="size-8">
                          {r.avatar_url && <AvatarImage src={r.avatar_url} />}
                          <AvatarFallback className="bg-primary/10 text-xs text-primary">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.email}
                      </TableCell>
                      <TableCell className="text-sm">{r.department}</TableCell>
                      <TableCell>
                        <Select
                          value={r.role}
                          onValueChange={(v) => changeRole(r.id, v)}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={r.enabled}
                            onCheckedChange={(v) => toggleEnabled(r.id, v)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {r.enabled ? "有効" : "無効"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {r.last_login_at
                          ? new Date(r.last_login_at).toLocaleDateString(
                              "ja-JP",
                            )
                          : "—"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog
        open={pendingDemote !== null}
        onOpenChange={(open) => !open && setPendingDemote(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ⚠ 管理者権限を失いますが、よろしいですか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              自分自身の管理者権限を変更しようとしています。変更後はスタッフ管理画面にアクセスできなくなる可能性があります。本当に変更しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDemote) {
                  applyRoleChange(pendingDemote.id, pendingDemote.role)
                  setPendingDemote(null)
                }
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              権限を変更する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function InviteStaffDialog() {
  const [open, setOpen] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState("viewer")

  function submit() {
    if (!email.trim()) {
      toast.error("メールアドレスを入力してください")
      return
    }
    toast.success(
      "招待メールを送信しました（プロトタイプのため実際には送信されません）",
    )
    setEmail("")
    setRole("viewer")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          スタッフを招待
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>スタッフを招待</DialogTitle>
          <DialogDescription>
            指定したメールアドレスに招待リンクを送信します。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              メールアドレス
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              ロール
            </label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={submit}>
            <Send className="size-4" />
            招待を送信
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Tab 2: Profile
// ============================================================

function ProfileTab() {
  const [user, setUser] = React.useState<Staff | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [department, setDepartment] = React.useState("")
  const [notif, setNotif] = React.useState({
    matching: true,
    publish: true,
  })
  const fileRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    let cancelled = false
    fetch("/mocks/staff.json")
      .then((r) => r.json())
      .then((d: Staff[]) => {
        if (cancelled) return
        const me = d.find((s) => s.id === ME_ID) ?? d[0]
        setUser(me)
        setName(me?.name ?? "")
        setEmail(me?.email ?? "")
        setDepartment(me?.department ?? "")
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  function save() {
    toast.success(
      "プロファイルを保存しました（プロトタイプのため永続化されません）",
    )
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }
  if (!user) {
    return <Skeleton className="h-72 w-full" />
  }

  const initial = user.name.replace(/\s+/g, "")[0] ?? "?"

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="アバター画像を変更"
          >
            <Avatar className="size-16">
              {user.avatar_url && <AvatarImage src={user.avatar_url} />}
              <AvatarFallback className="bg-primary/10 text-xl text-primary">
                {initial}
              </AvatarFallback>
            </Avatar>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              if (e.target.files?.[0]) {
                toast.info(
                  "画像のアップロード機能は次フェーズで実装予定です",
                )
                e.target.value = ""
              }
            }}
          />
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              アバターを変更
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">
              JPG / PNG（推奨：512×512px）
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              氏名
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              メール
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              部署
            </label>
            <Input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              ロール
            </span>
            <Badge variant="outline">
              {ROLE_LABELS[user.role as Role] ?? user.role}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">通知設定</p>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={notif.matching}
                onCheckedChange={(v) =>
                  setNotif((s) => ({ ...s, matching: !!v }))
                }
              />
              新規マッチング申請の通知
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={notif.publish}
                onCheckedChange={(v) =>
                  setNotif((s) => ({ ...s, publish: !!v }))
                }
              />
              配信完了の通知
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save}>
            <Save className="size-4" />
            保存
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Tab 3: System
// ============================================================

function SystemTab() {
  const [threshold, setThreshold] = React.useState(4)
  const [openInterval, setOpenInterval] = React.useState("daily")
  const [signature, setSignature] = React.useState(
    "YNMO 100億宣言支援AI 事務局\n（このメールは自動送信です）",
  )
  function save() {
    toast.success(
      "システム設定を保存しました（プロトタイプのため永続化されません）",
    )
  }
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            マッチングしきい値
          </label>
          <Input
            type="number"
            min={1}
            max={20}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value) || 0)}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">
            ダッシュボードに表示するしきい値（受付件数 ≥ N の企業を強調）
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            配信開封率の更新間隔
          </label>
          <Select value={openInterval} onValueChange={setOpenInterval}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">毎時</SelectItem>
              <SelectItem value="daily">毎日</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Mail className="size-3.5" />
            メール署名
          </label>
          <Textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            rows={4}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={save}>
            <Save className="size-4" />
            保存
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Page
// ============================================================

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">設定</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          スタッフ・ロール・自身のプロファイル
        </p>
      </header>

      <Tabs defaultValue="staff">
        <TabsList>
          <TabsTrigger value="staff">スタッフ管理</TabsTrigger>
          <TabsTrigger value="profile">自分のプロフィール</TabsTrigger>
          <TabsTrigger value="system">システム設定</TabsTrigger>
        </TabsList>
        <TabsContent value="staff" className="mt-4">
          <StaffTab />
        </TabsContent>
        <TabsContent value="profile" className="mt-4">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="system" className="mt-4">
          <SystemTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
