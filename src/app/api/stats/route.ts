// =====================================================================
// GET /api/stats
// ダッシュボード（/）と /matchings/aggregate が参照する KPI 集約。
//
// 現状実装する欄：
//   summary.*            : COUNT 系。total_users / total_matchings / total_cases /
//                          total_companies / companies_at_threshold / matching_threshold
//   matchings_by_status  : 動的 4 値分類（pending を count >= 4 で 要対応 / 待機中 に分割）
//   threshold_companies  : 4 件以上の pending を集めた企業（要対応の真の集合）
//
// 空配列で返す欄（DB スキーマ未対応）：
//   closed_breakdown     : closed_reason カラム未実装
//   upcoming_publishes   : Initiatives.publish_at カラム未実装
//   weekly_trend         : 7 週分の集計が大変なので Phase 7
//   top_industries       : 同上（やる気になればすぐ）
//   recent_activities    : 監査ログテーブル未実装
// =====================================================================
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { MATCHING_THRESHOLD } from "@/lib/matching-status";
import type { StatsDto, ThresholdCompanyDto } from "@/types/db";

export const dynamic = "force-dynamic";

interface CountRow extends RowDataPacket {
  cnt: number;
}

interface CompanyMatchCountRow extends RowDataPacket {
  target_approved_company_id: number;
  match_count: number;
  oldest_request_at: Date;
  company_name: string | null;
  industry_major: string | null;
  prefecture: string | null;
}

interface MatchingStatusBreakdownRow extends RowDataPacket {
  status: "pending" | "queued_for_event" | "closed";
  cnt: number;
}

interface PendingPerCompanyRow extends RowDataPacket {
  target_approved_company_id: number;
  match_count: number;
}

export async function GET() {
  try {
    await requireStaff();

    // ---- COUNT 系（並列実行）----
    const [
      [usersTotal],
      [matchingsTotal],
      [casesTotal],
      [casesPublished],
      [casesDraft],
      [companiesTotal],
      statusBreakdownRows,
      pendingPerCompanyRows,
      thresholdCompaniesRows,
    ] = await Promise.all([
      query<CountRow>("SELECT COUNT(*) AS cnt FROM Users"),
      query<CountRow>("SELECT COUNT(*) AS cnt FROM MatchingRequests"),
      query<CountRow>("SELECT COUNT(*) AS cnt FROM Initiatives"),
      query<CountRow>("SELECT COUNT(*) AS cnt FROM Initiatives WHERE status = 'published'"),
      query<CountRow>("SELECT COUNT(*) AS cnt FROM Initiatives WHERE status = 'draft'"),
      query<CountRow>("SELECT COUNT(*) AS cnt FROM ApprovedCompanies"),
      // DB の 3 値ステータス別件数
      query<MatchingStatusBreakdownRow>(
        `SELECT status, COUNT(*) AS cnt
         FROM MatchingRequests
         GROUP BY status`
      ),
      // 同一希望先企業ごとの未クローズ件数
      query<PendingPerCompanyRow>(
        `SELECT target_approved_company_id, COUNT(*) AS match_count
         FROM MatchingRequests
         WHERE status != 'closed'
         GROUP BY target_approved_company_id`
      ),
      // しきい値（4 件以上）に達している企業の詳細
      query<CompanyMatchCountRow>(
        `SELECT
           m.target_approved_company_id,
           COUNT(*) AS match_count,
           MIN(m.requested_at) AS oldest_request_at,
           ac.company_name,
           ac.industry_major,
           ac.prefecture
         FROM MatchingRequests m
         LEFT JOIN ApprovedCompanies ac ON ac.id = m.target_approved_company_id
         WHERE m.status != 'closed'
         GROUP BY m.target_approved_company_id, ac.company_name, ac.industry_major, ac.prefecture
         HAVING COUNT(*) >= :threshold
         ORDER BY match_count DESC, oldest_request_at ASC`,
        { threshold: MATCHING_THRESHOLD }
      ),
    ]);

    // 4 値ドーナツ：pending を「要対応」(>=4 の企業向け) と「待機中」(<4 の企業向け) に分割
    const pendingCountByCompany = new Map<number, number>();
    for (const row of pendingPerCompanyRows) {
      pendingCountByCompany.set(
        Number(row.target_approved_company_id),
        Number(row.match_count)
      );
    }

    let urgentPending = 0; // 要対応
    let waitingPending = 0; // 待機中
    for (const [, cnt] of pendingCountByCompany) {
      if (cnt >= MATCHING_THRESHOLD) urgentPending += cnt;
      else waitingPending += cnt;
    }

    let inPrep = 0; // 開催準備中
    let closedCnt = 0; // 終了
    for (const r of statusBreakdownRows) {
      if (r.status === "queued_for_event") inPrep = Number(r.cnt);
      else if (r.status === "closed") closedCnt = Number(r.cnt);
    }

    const thresholdCompanies: ThresholdCompanyDto[] = thresholdCompaniesRows.map((r) => ({
      company_id: `co_${String(r.target_approved_company_id).padStart(5, "0")}`,
      company_name: r.company_name ?? "",
      match_count: Number(r.match_count),
      industry: r.industry_major ?? "",
      prefecture: r.prefecture ?? "",
      oldest_request_at: r.oldest_request_at.toISOString(),
    }));

    const stats: StatsDto = {
      summary: {
        total_users: Number(usersTotal.cnt),
        active_users_30d: 0, // last_active_at 未実装のため。Phase 7
        total_matchings: Number(matchingsTotal.cnt),
        pending_matchings: urgentPending + waitingPending,
        approved_matchings: inPrep, // mock の名前と微妙にズレるが実装意図的に
        total_cases: Number(casesTotal.cnt),
        published_cases: Number(casesPublished.cnt),
        draft_cases: Number(casesDraft.cnt),
        scheduled_publishes: 0, // publish_at 未実装
        total_companies: Number(companiesTotal.cnt),
        active_companies: Number(companiesTotal.cnt), // suspended 概念無し
        companies_at_threshold: thresholdCompanies.length,
        matching_threshold: MATCHING_THRESHOLD,
        monthly_growth_rate: 0,
      },
      matchings_by_status: {
        待機中: waitingPending,
        要対応: urgentPending,
        開催準備中: inPrep,
        終了: closedCnt,
      },
      closed_breakdown: {},
      threshold_companies: thresholdCompanies,
      upcoming_publishes: [],
      weekly_trend: [],
      top_industries: [],
      recent_activities: [],
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json(stats);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[/api/stats] error", err);
    return NextResponse.json(
      {
        error: "internal_error",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
