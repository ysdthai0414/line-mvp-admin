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
