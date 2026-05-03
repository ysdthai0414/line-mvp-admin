// =====================================================================
// マッチング申請ステータス：DB 3値 ↔ UI 4値 変換
//
// DB: pending / queued_for_event / closed
// UI: 待機中 / 要対応 / 開催準備中 / 終了
//
// 違いは「pending を 待機中 と 要対応 に動的分割する」こと。
// 同じ target_approved_company_id への未クローズ申請数 (company_total_count) が
// MATCHING_THRESHOLD (=4) 以上なら 要対応、未満なら 待機中。
//
// closed の場合は closed_reason の有無で「終了（理由）」表示にする。
// =====================================================================
import type { MatchingDbStatus, MatchingUiStatus } from "@/types/db";

export const MATCHING_THRESHOLD = 4;

/**
 * DB の 3値 → UI の 4値 へ変換。
 * @param dbStatus - DB のステータス
 * @param companyTotalCount - 同一 target_company への未クローズ件数
 */
export function dbToUIStatus(
  dbStatus: MatchingDbStatus,
  companyTotalCount: number
): MatchingUiStatus {
  if (dbStatus === "closed") return "終了";
  if (dbStatus === "queued_for_event") return "開催準備中";
  // dbStatus === "pending"
  return companyTotalCount >= MATCHING_THRESHOLD ? "要対応" : "待機中";
}

/**
 * UI の 4値 → DB の 2値（書き込み用）へ変換。
 * 待機中/要対応 はどちらも DB 上 pending（区別なし）。
 */
export function uiToDBStatus(
  uiStatus: MatchingUiStatus
): MatchingDbStatus {
  if (uiStatus === "終了") return "closed";
  if (uiStatus === "開催準備中") return "queued_for_event";
  return "pending"; // 待機中 / 要対応
}
