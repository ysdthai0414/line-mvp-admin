"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function MatchingsTabs({
  individualCount,
  aggregateCount,
}: {
  individualCount: number | null
  aggregateCount: number | null
}) {
  const pathname = usePathname() ?? "/matchings"
  const value = pathname.includes("aggregate") ? "aggregate" : "individual"
  return (
    <Tabs value={value}>
      <TabsList>
        <TabsTrigger value="individual" asChild>
          <Link href="/matchings">
            個別申請
            {individualCount !== null && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({individualCount}件)
              </span>
            )}
          </Link>
        </TabsTrigger>
        <TabsTrigger value="aggregate" asChild>
          <Link href="/matchings/aggregate">
            企業別集約
            {aggregateCount !== null && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({aggregateCount}社)
              </span>
            )}
          </Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
