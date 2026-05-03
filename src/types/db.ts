// =====================================================================
// DB 行の TypeScript 型定義
// `linemvp` データベースのスキーマ（Bot 側 db/schema.sql 系 + 本リポ db/migrations/）
// に対応した RowDataPacket 拡張型。
//
// Phase 1 では Staff のみ。Phase 2 で MatchingRequest / Initiative / User /
// ApprovedCompany / DeliveryLog 等を追加していく。
// =====================================================================
import type { RowDataPacket } from "mysql2";

// ---------------------------------------------------------------------
// Staff（事務局スタッフ）
// ---------------------------------------------------------------------
export type StaffRole = "admin" | "manager" | "member" | "viewer";
export type StaffStatus = "active" | "inactive";

export interface StaffRow extends RowDataPacket {
  id: string;
  email: string;
  name: string;
  name_kana: string | null;
  role: StaffRole;
  department: string | null;
  avatar_url: string | null;
  status: StaffStatus;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ---------------------------------------------------------------------
// ApprovedCompanies（認可済企業マスタ：3,135件）
// Bot 側 db/schema_v4.sql 準拠
// ---------------------------------------------------------------------
export interface ApprovedCompanyRow extends RowDataPacket {
  id: number;
  corporate_number: string;
  company_name: string;
  company_name_normalized: string;
  application_type: string | null;
  prefecture: string | null;
  industry_major: string | null;
  industry_minor: string | null;
  employee_count: number | null;
  annual_sales: number | null;       // 円
  target_year: number | null;
  declaration_pdf_url: string | null;
  source_row: unknown;               // JSON カラム。生取込みデータ（中身は Excel 行）
  created_at: Date;
  updated_at: Date;
}

// ---------------------------------------------------------------------
// 管理画面（UI）が期待する形（public/mocks/companies.json と同形）
// ---------------------------------------------------------------------
export interface CompanyDto {
  id: string;                        // "co_00001"
  corporate_number: string;
  name: string;
  name_kana: string;
  application_type: string;
  prefecture: string;
  industry: string;                  // industry_major
  industry_code: string;
  industry_minor: string;
  industry_minor_code: string;
  employee_count: number;
  revenue_oku: number;               // annual_sales / 1e8
  target_year: number;               // null は 0 にして返す（UI 互換性）
  declaration_url: string;
  status: "active" | "suspended";
  authorized_at: string;             // ISO datetime
  sales_phase: string;               // "05_50〜70億" 等
}
