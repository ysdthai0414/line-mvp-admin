"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Activity,
  Building2,
  Calendar,
  FileText,
  GitMerge,
  LayoutDashboard,
  LogOut,
  Settings,
  Users2,
} from "lucide-react"

import {
  Sidebar as UISidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ROLE_LABELS, type Role } from "@/lib/status-labels"
import { cn } from "@/lib/utils"

const ME_STAFF_ID = "s_0001" // 仮想ログインスタッフ（吉田 航平）

type Staff = {
  id: string
  name: string
  name_kana?: string
  role: string
  department?: string
  avatar_url?: string
}

const FALLBACK_STAFF: Staff = {
  id: ME_STAFF_ID,
  name: "吉田 航平",
  role: "admin",
  avatar_url: "https://api.dicebear.com/7.x/notionists/svg?seed=s0001",
}

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "メイン",
    items: [
      { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
      { href: "/cases", label: "取り組み事例", icon: FileText },
      { href: "/matchings", label: "マッチング申請", icon: GitMerge },
    ],
  },
  {
    label: "運用管理",
    items: [
      { href: "/sessions", label: "相談会", icon: Calendar },
      { href: "/users", label: "ユーザー", icon: Users2 },
      { href: "/users/analytics", label: "ユーザー分析", icon: Activity },
      { href: "/companies", label: "認可企業マスタ", icon: Building2 },
    ],
  },
  {
    label: "システム",
    items: [{ href: "/settings", label: "設定", icon: Settings }],
  },
]

function isItemActive(pathname: string, href: string, allHrefs: string[]) {
  if (href === "/") return pathname === "/"
  // 自身より長い prefix を持つ別のメニュー項目に該当している場合、自身は active 化しない。
  // 例：/users と /users/analytics の両方が登録されているとき、pathname=/users/analytics なら
  // /users は active にならず、/users/analytics だけ active になる。
  const moreSpecificMatch = allHrefs.some(
    (h) =>
      h !== href &&
      h.startsWith(`${href}/`) &&
      (pathname === h || pathname.startsWith(`${h}/`)),
  )
  if (moreSpecificMatch) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Sidebar() {
  const pathname = usePathname() ?? "/"
  const router = useRouter()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const [me, setMe] = React.useState<Staff>(FALLBACK_STAFF)

  React.useEffect(() => {
    let cancelled = false
    fetch("/mocks/staff.json")
      .then((r) => r.json())
      .then((staff: Staff[]) => {
        if (cancelled) return
        const found = staff.find((s) => s.id === ME_STAFF_ID)
        if (found) setMe(found)
      })
      .catch(() => {
        // silent: fall back to FALLBACK_STAFF
      })
    return () => {
      cancelled = true
    }
  }, [])

  const initial = me.name.replace(/\s+/g, "")[0] ?? "小"
  const roleLabel = ROLE_LABELS[me.role as Role] ?? me.role

  return (
    <UISidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-0">
        <div className="flex flex-col items-center px-4 py-6 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3">
          <Avatar className="size-16 group-data-[collapsible=icon]:size-8">
            <AvatarImage src={me.avatar_url} alt={me.name} />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-2xl font-bold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="mt-3 flex flex-col items-center gap-1.5 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-sidebar-foreground">
              {me.name}
            </span>
            <span className="rounded-full bg-sidebar-primary/20 px-2 py-0.5 text-xs text-sidebar-primary-foreground">
              {roleLabel}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup
            key={group.label}
            className="group-data-[collapsible=icon]:gap-1"
          >
            {!isCollapsed && (
              <SidebarGroupLabel className="text-xs uppercase tracking-wider text-sidebar-foreground/50">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const allHrefs = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href))
                  const active = isItemActive(pathname, item.href, allHrefs)
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className={cn(
                          "relative z-10",
                          "border-l-4 border-transparent text-sidebar-foreground/70",
                          "hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                          "data-active:border-sidebar-primary data-active:bg-transparent data-active:text-sidebar-foreground data-active:font-medium",
                        )}
                      >
                        <Link href={item.href}>
                          <Icon className="size-5 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <LogOut />
              <span className="group-data-[collapsible=icon]:hidden">
                ログアウト
              </span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ログアウトしますか？</AlertDialogTitle>
              <AlertDialogDescription>
                現在の作業内容は保存されません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={() => router.push("/login")}>
                ログアウトする
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarFooter>
    </UISidebar>
  )
}
