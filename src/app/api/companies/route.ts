// =====================================================================
// GET /api/companies
// 認可済企業マスタ（ApprovedCompanies）の全件を mock 互換形式で返す。
//
// 現状：UI が 3,135 件全部を一気に load してクライアント側でフィルタ・
// ページネーションする設計のため、API も全件返す。
// 将来的にはサーバーサイドページング（page/limit/industry/q）に移行する
// 余地があるが、その際は UI 側の page.tsx のフィルタ実装も合わせて変更が必要。
// =====================================================================
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { salesAmountToPhase, yenToOku } from "@/lib/sales-phase";
import type { ApprovedCompanyRow, CompanyDto } from "@/types/db";

export const dynamic = "force-dynamic";

// source_row JSON から industry_code 等の補助フィールドを安全に取り出すヘルパー
function readSourceField(source: unknown, key: string): string {
  if (!source || typeof source !== "object") return "";
  const v = (source as Record<string, unknown>)[key];
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

export async function GET() {
  try {
    await requireStaff();

    const rows = await query<ApprovedCompanyRow>(
      `SELECT
         id, corporate_number, company_name, company_name_normalized,
         application_type, prefecture, industry_major, industry_minor,
         employee_count, annual_sales, target_year, declaration_pdf_url,
         source_row, created_at, updated_at
       FROM ApprovedCompanies
       ORDER BY id ASC`
    );

    const companies: CompanyDto[] = rows.map((r) => {
      // mysql2 は JSON カラムを既にパース済みのオブジェクトで返す
      const src = r.source_row;
      return {
        id: `co_${String(r.id).padStart(5, "0")}`,
        corporate_number: r.corporate_number,
        name: r.company_name,
        name_kana: readSourceField(src, "name_kana") || "（ヨミガナ未設定）",
        application_type: r.application_type ?? "",
        prefecture: r.prefecture ?? "",
        industry: r.industry_major ?? "",
        industry_code: readSourceField(src, "industry_code"),
        industry_minor: r.industry_minor ?? "",
        industry_minor_code: readSourceField(src, "industry_minor_code"),
        employee_count: r.employee_count ?? 0,
        revenue_oku: yenToOku(r.annual_sales),
        target_year: r.target_year ?? 0,
        declaration_url: r.declaration_pdf_url ?? "",
        status: "active", // 現状 DB に suspended の概念無し。常に active
        authorized_at: r.created_at.toISOString(),
        sales_phase: salesAmountToPhase(r.annual_sales),
      };
    });

    return NextResponse.json(companies);
  } catch (err) {
    if (err instanceof Response) return err; // requireStaff からの 401/403
    console.error("[/api/companies] error", err);
    return NextResponse.json(
      {
        error: "internal_error",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
