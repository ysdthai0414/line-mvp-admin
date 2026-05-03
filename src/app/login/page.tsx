"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Lock, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from") || "/"

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (body.error === "invalid_credentials") {
          setError("メールアドレスまたはパスワードが正しくありません")
        } else if (body.error === "missing_fields") {
          setError("メールアドレスとパスワードを入力してください")
        } else if (body.error === "server_misconfigured") {
          setError("サーバー設定エラー：管理者にお問い合わせください")
        } else {
          setError(`ログインに失敗しました（${res.status}）`)
        }
        return
      }
      // 成功 → 元のページに戻る
      router.replace(from)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "通信エラー")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="flex w-full max-w-md flex-col items-center">
        <Card className="w-full">
          <CardContent className="px-8 py-10">
            <div className="mb-6 flex justify-center">
              <div
                aria-hidden
                className="flex size-14 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground"
              >
                Y
              </div>
            </div>
            <h1 className="mb-2 text-center text-2xl font-bold">
              YNMO 管理コンソール
            </h1>
            <p className="mb-8 text-center text-sm text-muted-foreground">
              100億宣言支援AI 事務局向け管理画面
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  メールアドレス
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@example.com"
                    className="pl-9"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  パスワード
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="共通パスワード"
                    className="pl-9"
                    disabled={submitting}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={submitting}
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                サインイン
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              ※ 事務局スタッフのみ利用可能です
            </p>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          © 2026 キャプテンズ
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
