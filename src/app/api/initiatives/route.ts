// =====================================================================
// GET /api/initiatives
// 取り組み事例（Initiatives）の全件を mock 互換形式で返す。
// ApprovedCompanies と JOIN して company_name も同梱する。
//
// 現状の DB スキーマと UI 型のギャップ：
//  - status: DB は draft/published のみ。UI の scheduled/archived は Layer 2 で対応
//  - publish_at / target_sales_phases: DB に無い → null / []
//  - pdf_filename: detail_url の basename から派生
// =====================================================================
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import type { CaseDto, InitiativeStatus } from "@/types/db";

export const dynamic = "force-dynamic";

// JOIN 結果用の局所型
interface InitiativeJoinedRow extends RowDataPacket {
  id: number;
  approved_company_id: number;
  title: string;
  summary: string | null;
  detail_url: string | null;
  category: string | null;
  industry_tags: unknown;
  target_themes: unknown;
  cover_image_url: string | null;
  bullet_points: unknown;
  status: InitiativeStatus;
  source: string | null;
  created_at: Date;
  updated_at: Date;
  company_name: string | null;       // JOIN: ApprovedCompanies.company_name
}

function jsonArrayOrEmpty(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed)
        ? parsed.filter((x) => typeof x === "string")
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

function basenameFromUrl(url: string | null): string {
  if (!url) return "";
  // クエリやハッシュを除去 → 最後のスラッシュ以降
  const clean = url.split(/[?#]/)[0];
  const seg = clean.split("/").filter(Boolean);
  return seg.length > 0 ? seg[seg.length - 1] : "";
}

export async function GET() {
  try {
    await requireStaff();

    const rows = await query<InitiativeJoinedRow>(
      `SELECT
         i.id, i.approved_company_id, i.title, i.summary, i.detail_url,
         i.category, i.industry_tags, i.target_themes, i.cover_image_url,
         i.bullet_points, i.status, i.source, i.created_at, i.updated_at,
         ac.company_name
       FROM Initiatives i
       LEFT JOIN ApprovedCompanies ac ON ac.id = i.approved_company_id
       ORDER BY i.updated_at DESC`
    );

    const cases: CaseDto[] = rows.map((r) => {
      const created = r.created_at.toISOString();
      const updated = r.updated_at.toISOString();
      const industries = jsonArrayOrEmpty(r.industry_tags);
      const tags = jsonArrayOrEmpty(r.bullet_points); // 暫定：bullet_points を tags 表示に流用
      const pdfUrl = r.detail_url ?? "";
      const pdfFilename = basenameFromUrl(r.detail_url) || `initiative_${r.id}.pdf`;

      return {
        id: `case_${String(r.id).padStart(4, "0")}`,
        title: r.title,
        company_id: `co_${String(r.approved_company_id).padStart(5, "0")}`,
        company_name: r.company_name ?? "（不明）",
        author_id: null, // DB に概念無し
        status: r.status, // 現状 draft/published のみ
        thumbnail_url: r.cover_image_url ?? "",
        summary: r.summary ?? "",
        content: "", // 詳細ページ用。現状 DB に長文 body カラム無し。Layer 2 で追加予定
        tags,
        pdf_url: pdfUrl,
        created_at: created,
        updated_at: updated,
        publish_at: null, // Layer 2 で publish_at カラム追加予定
        target_industries: industries,
        target_sales_phases: [], // Layer 2 で対応
        pdf_filename: pdfFilename,
        upload_at: created,
      };
    });

    return NextResponse.json(cases);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[/api/initiatives] error", err);
    return NextResponse.json(
      {
        error: "internal_error",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
