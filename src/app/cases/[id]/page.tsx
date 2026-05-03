"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  CaseEditor,
  CaseEditorSkeleton,
  type CaseData,
} from "@/components/cases/case-editor"
import { getCases } from "@/lib/api-client"

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [data, setData] = React.useState<CaseData | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!id) return
    const ac = new AbortController()
    getCases({ signal: ac.signal })
      .then((cases) => {
        const found = (cases as unknown as CaseData[]).find((c) => c.id === id)
        if (!found) {
          setError(`事例 ID "${id}" が見つかりませんでした`)
          return
        }
        setData(found)
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return
        setError(e instanceof Error ? e.message : String(e))
      })
    return () => ac.abort()
  }, [id])

  if (error) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button asChild variant="outline">
          <Link href="/cases">取り組み事例一覧へ</Link>
        </Button>
      </div>
    )
  }

  if (!data) return <CaseEditorSkeleton />

  return <CaseEditor key={data.id} initialCase={data} />
}
