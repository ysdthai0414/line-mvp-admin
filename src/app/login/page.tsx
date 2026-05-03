"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

function MicrosoftLogo() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="7" height="7" fill="#F25022" />
      <rect x="9" width="7" height="7" fill="#7FBA00" />
      <rect y="9" width="7" height="7" fill="#00A4EF" />
      <rect x="9" y="9" width="7" height="7" fill="#FFB900" />
    </svg>
  )
}

export default function LoginPage() {
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

            <Separator className="my-6" />

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() =>
                alert("SSO連携は未実装です（プロトタイプ）")
              }
            >
              <MicrosoftLogo />
              <span>Microsoft でサインイン</span>
            </Button>

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
