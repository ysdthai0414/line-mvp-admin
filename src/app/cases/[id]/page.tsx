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

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [data, setData] = React.useState<CaseData | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!id) return
    let cancelled = false
    fetch("/mocks/cases.json")
      .then((r) => {
        if (!r.ok) throw new Error("/mocks/cases.json failed")
        return r.json()
      })
      .then((cases: CaseData[]) => {
        if (cancelled) return
        const found = cases.find((c) => c.id === id)
        if (!found) {
          setError(`事例 ID "${id}" が見つかりませんでした`)
          return
        }
        setData(found)
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
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
