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
// Stats（KPI 集約）
// ダッシュボード（/）と /matchings/aggregate が参照する。
// public/mocks/stats.json と同形だが、現状 DB スキーマで埋められない欄は空配列で返す。
// ---------------------------------------------------------------------
export interface ThresholdCompanyDto {
  company_id: string;                // "co_00001"
  company_name: string;
  match_count: number;
  industry: string;
  prefecture: string;
  oldest_request_at: string;         // ISO datetime
}

export interface UpcomingPublishDto {
  case_id: string;
  title: string;
  company_name: string;
  publish_at: string;
  target_industries: string[];
  target_sales_phases: string[];
}

export interface StatsDto {
  summary: {
    total_users: number;
    active_users_30d: number;
    total_matchings: number;
    pending_matchings: number;
    approved_matchings: number;
    total_cases: number;
    published_cases: number;
    draft_cases: number;
    scheduled_publishes: number;
    total_companies: number;
    active_companies: number;
    companies_at_threshold: number;
    matching_threshold: number;
    monthly_growth_rate: number;
  };
  matchings_by_status: {
    待機中: number;
    要対応: number;
    開催準備中: number;
    終了: number;
  };
  closed_breakdown: Record<string, number>;
  threshold_companies: ThresholdCompanyDto[];
  upcoming_publishes: UpcomingPublishDto[];
  weekly_trend: { week: string; cases: number; matchings: number; new_users: number }[];
  top_industries: { industry: string; count: number }[];
  recent_activities: unknown[];
  generated_at: string;
}

// ---------------------------------------------------------------------
// MatchingRequests（マッチング申請）
// Bot 側 db/schema_v2.sql 準拠
// ---------------------------------------------------------------------
export type MatchingDbStatus = "pending" | "queued_for_event" | "closed";
export type MatchingUiStatus = "待機中" | "要対応" | "開催準備中" | "終了";

export interface MatchingRequestRow extends RowDataPacket {
  id: number;
  line_user_id: string;
  target_approved_company_id: number;
  source_initiative_id: number | null;
  status: MatchingDbStatus;
  requested_at: Date;
  closed_at: Date | null;
}

// 管理画面（UI）の Matching 型互換 DTO
// 注：score / message / closed_reason は現状 DB に対応カラム無し
//   - score: 0.5 (placeholder)、Phase 7 で AI 計算 or 重み付けロジック導入
//   - message: 空文字（Bot 側で「話を聞きたい」postback 時に入力 UI を出す改修が必要）
//   - closed_reason: null（Layer 2 で MatchingRequests.closed_reason カラム追加予定）
export interface MatchingDto {
  id: string;                        // "m_0001"
  case_id: string;                   // "case_0001"
  case_title: string;
  applicant_user_id: string;         // line_user_id をそのまま
  applicant_user_name: string;       // placeholder「LINEユーザー XXXX」
  applicant_company_id: string;
  applicant_company_name: string;
  applicant_position: string;
  target_company_id: string;
  target_company_name: string;
  score: number;                     // 0..1（現状 placeholder 0.5）
  threshold_flag: boolean;
  company_total_count: number;
  status: MatchingUiStatus;
  closed_reason: string | null;
  message: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------
// Users（LINE ユーザー：オンボーディング状態管理）
// Bot 側 db/schema_v4.sql 準拠
// ---------------------------------------------------------------------
export type UserState = "NEW" | "AWAITING_CONFIRM" | "CONFIRMED" | "NOT_APPROVED";

export interface UserRow extends RowDataPacket {
  line_user_id: string;
  state: UserState;
  display_name: string | null;       // Phase 7-1：LINE displayName
  approved_company_id: number | null;
  sales_tier: string | null;
  annual_sales: number | null;
  pending_company_name: string | null;
  pending_company_url: string | null;
  pending_profile_json: unknown;
  interests: unknown;
  disliked_categories: unknown;
  pending_interest_picks: number;
  created_at: Date;
  updated_at: Date;
}

// ---------------------------------------------------------------------
// Profiles（確定済プロファイル：複数行可、最新のみ参照）
// ---------------------------------------------------------------------
export interface ProfileRow extends RowDataPacket {
  id: number;
  line_user_id: string;
  approved_company_id: number | null;
  company_name: string;
  company_url: string;
  sales_tier: string | null;
  annual_sales: number | null;
  profile_json: unknown;
  created_at: Date;
}

// profile_json の中身（Bot 側 src/ai.js generateCompanyProfile の出力）
export interface ProfileJson {
  business_summary?: string;
  target_customers?: string;
  industry_tags?: string[];
  management_themes?: string[];
  wanted_support_areas?: string[];
  strengths?: string[];
}

// 管理画面（UI）の User 型互換 DTO
// 注：Bot は現状 name/email/name_kana/position を収集していないため、
// これらは placeholder で返す。将来 Bot 側で getProfile() を導入したら充実できる。
export interface UserDto {
  id: string;                        // line_user_id をそのまま使う
  email: string;
  name: string;
  name_kana: string;
  company_id: string;
  company_name: string;
  company_industry: string;
  company_prefecture: string;
  position: string;
  sales_phase: string;
  status: UserState;
  avatar_url: string;
  last_login_at: string | null;
  registered_at: string;
  push_enabled: boolean;
  last_active_at: string;
}

// ---------------------------------------------------------------------
// Initiatives（取り組み事例：配信ネタ）
// Bot 側 db/schema_v3.sql 準拠（v2 で導入、v3 で bullet_points 追加）
// ---------------------------------------------------------------------
export type InitiativeStatus = "draft" | "published";

export interface InitiativeRow extends RowDataPacket {
  id: number;
  approved_company_id: number;
  title: string;
  summary: string | null;
  detail_url: string | null;
  category: string | null;
  industry_tags: unknown;            // JSON: string[]
  target_themes: unknown;            // JSON: string[]
  cover_image_url: string | null;
  bullet_points: unknown;            // JSON: string[]
  status: InitiativeStatus;
  source: string | null;
  source_row: unknown;
  created_at: Date;
  updated_at: Date;
}

// 管理画面（UI）の Case 型互換 DTO
// public/mocks/cases.json と同形（mock の status は draft/scheduled/published/archived の4値だが、
// DB は現状 draft/published のみ。scheduled/archived は Layer 2 でスキーマ追加予定）
export interface CaseDto {
  id: string;                        // "case_0001"
  title: string;
  company_id: string;                // "co_00001"
  company_name: string;
  author_id: string | null;          // 現状 DB に概念無し → null
  status: "draft" | "scheduled" | "published" | "archived";
  thumbnail_url: string;
  summary: string;
  content: string;
  tags: string[];
  pdf_url: string;
  created_at: string;                // ISO datetime
  updated_at: string;
  publish_at: string | null;         // 現状 DB に無い → null
  target_industries: string[];       // ← industry_tags
  target_sales_phases: string[];     // 現状 DB に無い → []
  pdf_filename: string;
  upload_at: string;                 // = created_at
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
