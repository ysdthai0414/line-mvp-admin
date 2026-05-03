// =====================================================================
// GET /api/matchings
// マッチング申請一覧。複数テーブルを JOIN して UI 互換 DTO で返す。
//
// テーブル関係：
//   MatchingRequests (m)
//     ├ Users (u)               via m.line_user_id
//     ├ Profiles (latest_p)     via m.line_user_id（最新の Profile 1行）
//     ├ ApprovedCompanies (target_ac)  via m.target_approved_company_id
//     ├ ApprovedCompanies (applicant_ac) via u.approved_company_id
//     └ Initiatives (i)         via m.source_initiative_id
//
// 派生フィールド：
//   - company_total_count: 同一 target_approved_company_id の未クローズ件数（要対応判定用）
//   - status: dbToUIStatus(db_status, company_total_count) で 4 値化
//   - threshold_flag: company_total_count >= MATCHING_THRESHOLD
//   - score: 現状 placeholder 0.5（Phase 7 で AI 計算）
//   - message: 空文字（Bot 側で集めていない）
// =====================================================================
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { dbToUIStatus, MATCHING_THRESHOLD } from "@/lib/matching-status";
import type { MatchingDbStatus, MatchingDto } from "@/types/db";

export const dynamic = "force-dynamic";

interface MatchingJoinedRow extends RowDataPacket {
  // MatchingRequests
  id: number;
  line_user_id: string;
  target_approved_company_id: number;
  source_initiative_id: number | null;
  status: MatchingDbStatus;
  requested_at: Date;
  closed_at: Date | null;
  // 集約サブクエリ
  company_total_count: number;
  // Initiatives
  case_title: string | null;
  // ApprovedCompanies (target)
  target_company_name: string | null;
  // ApprovedCompanies (applicant 経由 Users.approved_company_id)
  applicant_company_id: number | null;
  applicant_company_name: string | null;
  // Profiles (最新)
  applicant_profile_json: unknown;
}

function placeholderName(lineUserId: string): string {
  return `LINEユーザー ${lineUserId.slice(-4)}`;
}

function readManagementTheme(profileJson: unknown): string {
  if (!profileJson || typeof profileJson !== "object") return "";
  const themes = (profileJson as { management_themes?: unknown })
    .management_themes;
  if (Array.isArray(themes) && themes.length > 0 && typeof themes[0] === "string") {
    return themes[0];
  }
  return "";
}

export async function GET() {
  try {
    await requireStaff();

    const rows = await query<MatchingJoinedRow>(
      `SELECT
         m.id,
         m.line_user_id,
         m.target_approved_company_id,
         m.source_initiative_id,
         m.status,
         m.requested_at,
         m.closed_at,
         (
           SELECT COUNT(*)
           FROM MatchingRequests m2
           WHERE m2.target_approved_company_id = m.target_approved_company_id
             AND m2.status != 'closed'
         ) AS company_total_count,
         i.title AS case_title,
         target_ac.company_name AS target_company_name,
         u.approved_company_id AS applicant_company_id,
         applicant_ac.company_name AS applicant_company_name,
         latest_p.profile_json AS applicant_profile_json
       FROM MatchingRequests m
       LEFT JOIN Initiatives i ON i.id = m.source_initiative_id
       LEFT JOIN ApprovedCompanies target_ac ON target_ac.id = m.target_approved_company_id
       LEFT JOIN Users u ON u.line_user_id = m.line_user_id
       LEFT JOIN ApprovedCompanies applicant_ac ON applicant_ac.id = u.approved_company_id
       LEFT JOIN (
         SELECT p1.*
         FROM Profiles p1
         INNER JOIN (
           SELECT line_user_id, MAX(id) AS max_id
           FROM Profiles
           GROUP BY line_user_id
         ) p2 ON p2.line_user_id = p1.line_user_id AND p2.max_id = p1.id
       ) latest_p ON latest_p.line_user_id = m.line_user_id
       ORDER BY m.requested_at DESC`
    );

    const matchings: MatchingDto[] = rows.map((r) => {
      const totalCount = Number(r.company_total_count);
      const uiStatus = dbToUIStatus(r.status, totalCount);
      const updatedAt = r.closed_at ?? r.requested_at;

      return {
        id: `m_${String(r.id).padStart(4, "0")}`,
        case_id: r.source_initiative_id
          ? `case_${String(r.source_initiative_id).padStart(4, "0")}`
          : "",
        case_title: r.case_title ?? "",
        applicant_user_id: r.line_user_id,
        applicant_user_name: placeholderName(r.line_user_id),
        applicant_company_id: r.applicant_company_id
          ? `co_${String(r.applicant_company_id).padStart(5, "0")}`
          : "",
        applicant_company_name: r.applicant_company_name ?? "",
        applicant_position: readManagementTheme(r.applicant_profile_json),
        target_company_id: `co_${String(r.target_approved_company_id).padStart(5, "0")}`,
        target_company_name: r.target_company_name ?? "",
        score: 0.5, // placeholder: Phase 7 で AI 計算
        threshold_flag: totalCount >= MATCHING_THRESHOLD,
        company_total_count: totalCount,
        status: uiStatus,
        closed_reason: null, // Layer 2 で closed_reason カラム追加予定
        message: "", // Bot 側で収集していない
        created_at: r.requested_at.toISOString(),
        updated_at: updatedAt.toISOString(),
      };
    });

    return NextResponse.json(matchings);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[/api/matchings] error", err);
    return NextResponse.json(
      {
        error: "internal_error",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
