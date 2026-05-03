// =====================================================================
// GET /api/users
// LINE ユーザー一覧。Users + Profiles + ApprovedCompanies の3テーブル JOIN。
//
// データ整合性メモ：
//  - Bot は name/email/name_kana/position を収集していない（LINE では会社名 + URL のみ）
//    → これらは placeholder で返す。将来 Bot で getProfile() を実装したら充実
//  - profile_json の中身は src/ai.js generateCompanyProfile が生成する JSON
//    → business_summary/target_customers/industry_tags/management_themes など
//  - Profiles は履歴テーブルで複数行可。サブクエリで line_user_id ごとの最新1行を引く
//  - state=NEW/AWAITING_CONFIRM のユーザーは Profile が無い場合がある（LEFT JOIN 必須）
// =====================================================================
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { salesAmountToPhase } from "@/lib/sales-phase";
import type { ProfileJson, UserDto, UserState } from "@/types/db";

export const dynamic = "force-dynamic";

interface UserJoinedRow extends RowDataPacket {
  // Users
  line_user_id: string;
  state: UserState;
  display_name: string | null;       // Phase 7-1
  approved_company_id: number | null;
  annual_sales: number | null;
  created_at: Date;
  updated_at: Date;
  // Profiles（最新1行）
  profile_json: unknown;
  profile_company_name: string | null;
  profile_annual_sales: number | null;
  // ApprovedCompanies
  ac_company_name: string | null;
  ac_industry_major: string | null;
  ac_prefecture: string | null;
}

function parseProfileJson(raw: unknown): ProfileJson {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ProfileJson;
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw as ProfileJson;
  return {};
}

/** LINE ユーザー ID の末尾4文字を取って placeholder 名にする（例：「LINEユーザー a1b2」） */
function placeholderName(lineUserId: string): string {
  const tail = lineUserId.slice(-4);
  return `LINEユーザー ${tail}`;
}

export async function GET() {
  try {
    await requireStaff();

    // line_user_id ごとに最新1行の Profile を引くサブクエリ
    const rows = await query<UserJoinedRow>(
      `SELECT
         u.line_user_id,
         u.state,
         u.display_name,
         u.approved_company_id,
         u.annual_sales,
         u.created_at,
         u.updated_at,
         latest_p.profile_json,
         latest_p.company_name AS profile_company_name,
         latest_p.annual_sales AS profile_annual_sales,
         ac.company_name AS ac_company_name,
         ac.industry_major AS ac_industry_major,
         ac.prefecture AS ac_prefecture
       FROM Users u
       LEFT JOIN (
         SELECT p1.*
         FROM Profiles p1
         INNER JOIN (
           SELECT line_user_id, MAX(id) AS max_id
           FROM Profiles
           GROUP BY line_user_id
         ) p2 ON p2.line_user_id = p1.line_user_id AND p2.max_id = p1.id
       ) latest_p ON latest_p.line_user_id = u.line_user_id
       LEFT JOIN ApprovedCompanies ac ON ac.id = u.approved_company_id
       ORDER BY u.created_at DESC`
    );

    const users: UserDto[] = rows.map((r) => {
      const profile = parseProfileJson(r.profile_json);

      // company_name は ApprovedCompanies > Profiles の順で fallback
      const companyName = r.ac_company_name ?? r.profile_company_name ?? "";

      // sales_phase は Users.annual_sales > Profiles.annual_sales > 0
      const annualSales = r.annual_sales ?? r.profile_annual_sales ?? null;

      // position は profile.management_themes の最初を仮置き（取得していないため）
      const position =
        Array.isArray(profile.management_themes) && profile.management_themes.length > 0
          ? profile.management_themes[0]
          : "";

      // Phase 7-1：display_name があればそれを使い、無ければ placeholder
      const displayName = r.display_name?.trim() || placeholderName(r.line_user_id);

      return {
        id: r.line_user_id,
        email: "",
        name: displayName,
        name_kana: "",
        company_id: r.approved_company_id
          ? `co_${String(r.approved_company_id).padStart(5, "0")}`
          : "",
        company_name: companyName,
        company_industry: r.ac_industry_major ?? "",
        company_prefecture: r.ac_prefecture ?? "",
        position,
        sales_phase: salesAmountToPhase(annualSales),
        status: r.state === "NOT_APPROVED" ? "NEW" : r.state, // mock の3値に寄せる
        avatar_url: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(r.line_user_id)}`,
        last_login_at: null,
        registered_at: r.created_at.toISOString(),
        push_enabled: true,
        last_active_at: r.updated_at.toISOString(),
      };
    });

    return NextResponse.json(users);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[/api/users] error", err);
    return NextResponse.json(
      {
        error: "internal_error",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
