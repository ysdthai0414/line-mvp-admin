// =====================================================================
// GET /api/users/analytics
// ユーザーごとのエンゲージメント集計を返す。
//
// 集計内容：
//   - 配信件数（DeliveryLog）
//   - 反応数（helpful / not_helpful）
//   - マッチング申請数（MatchingRequests）
//   - 最終アクティブ日時（feedback_at と requested_at の最新）
//   - エンゲージスコア = helpful * 1 + not_helpful * 0.5 + matching * 5
//   - バケット：active (>=5) / moderate (0<x<5) / silent (=0 or 30日以上無反応)
//
// 全ユーザーぶん返す。クライアント側でフィルタ/ソート想定（数百〜数千人なら問題なし）。
// =====================================================================
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import type {
  EngagementBucket,
  UserAnalyticsDto,
  UserAnalyticsResponseDto,
  UserAnalyticsSummaryDto,
} from "@/types/db";

export const dynamic = "force-dynamic";

const ACTIVE_THRESHOLD = 5;
const SILENT_INACTIVITY_DAYS = 30;

interface AnalyticsRow extends RowDataPacket {
  line_user_id: string;
  display_name: string | null;
  created_at: Date;
  ac_company_name: string | null;
  delivery_count: number;
  helpful_count: number;
  not_helpful_count: number;
  matching_count: number;
  last_feedback_at: Date | null;
  last_matching_at: Date | null;
}

interface ReactionRateRow extends RowDataPacket {
  total_deliveries: number;
  reactions: number;
}

function placeholderName(lineUserId: string): string {
  return `LINEユーザー ${lineUserId.slice(-4)}`;
}

function determineBucket(
  score: number,
  lastActivity: Date | null
): EngagementBucket {
  if (score >= ACTIVE_THRESHOLD) return "active";
  if (score > 0) {
    // 30日以上無反応なら silent に降格
    if (lastActivity) {
      const daysSince =
        (Date.now() - lastActivity.getTime()) / (24 * 60 * 60 * 1000);
      if (daysSince > SILENT_INACTIVITY_DAYS) return "silent";
    }
    return "moderate";
  }
  return "silent";
}

export async function GET() {
  try {
    await requireStaff();

    // 1. ユーザーごとの集計
    const rows = await query<AnalyticsRow>(
      `SELECT
         u.line_user_id,
         u.display_name,
         u.created_at,
         ac.company_name AS ac_company_name,
         COALESCE((SELECT COUNT(*) FROM DeliveryLog d WHERE d.line_user_id = u.line_user_id), 0) AS delivery_count,
         COALESCE((SELECT COUNT(*) FROM DeliveryLog d WHERE d.line_user_id = u.line_user_id AND d.feedback = 'helpful'), 0) AS helpful_count,
         COALESCE((SELECT COUNT(*) FROM DeliveryLog d WHERE d.line_user_id = u.line_user_id AND d.feedback = 'not_helpful'), 0) AS not_helpful_count,
         COALESCE((SELECT COUNT(*) FROM MatchingRequests m WHERE m.line_user_id = u.line_user_id), 0) AS matching_count,
         (SELECT MAX(feedback_at) FROM DeliveryLog d WHERE d.line_user_id = u.line_user_id) AS last_feedback_at,
         (SELECT MAX(GREATEST(IFNULL(closed_at, requested_at), requested_at)) FROM MatchingRequests m WHERE m.line_user_id = u.line_user_id) AS last_matching_at
       FROM Users u
       LEFT JOIN ApprovedCompanies ac ON ac.id = u.approved_company_id
       WHERE u.state = 'CONFIRMED'
       ORDER BY u.created_at DESC`
    );

    // 2. 直近30日の反応率（全体）
    const [reactionRow] = await query<ReactionRateRow>(
      `SELECT
         COUNT(*) AS total_deliveries,
         SUM(CASE WHEN feedback IS NOT NULL THEN 1 ELSE 0 END) AS reactions
       FROM DeliveryLog
       WHERE delivered_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );
    const totalDeliveries = Number(reactionRow?.total_deliveries ?? 0);
    const totalReactions = Number(reactionRow?.reactions ?? 0);
    const reactionRate30d =
      totalDeliveries > 0 ? totalReactions / totalDeliveries : 0;

    // 3. ユーザー単位の整形
    const users: UserAnalyticsDto[] = rows.map((r) => {
      const helpful = Number(r.helpful_count);
      const notHelpful = Number(r.not_helpful_count);
      const matching = Number(r.matching_count);
      const delivery = Number(r.delivery_count);
      const score = helpful * 1 + notHelpful * 0.5 + matching * 5;

      // 最終アクティブ：feedback_at と matching_at の新しい方
      const candidates: Date[] = [];
      if (r.last_feedback_at) candidates.push(r.last_feedback_at);
      if (r.last_matching_at) candidates.push(r.last_matching_at);
      const lastActivity = candidates.length > 0
        ? new Date(Math.max(...candidates.map((d) => d.getTime())))
        : null;

      const reactionRate =
        delivery > 0 ? (helpful + notHelpful) / delivery : 0;

      return {
        id: r.line_user_id,
        name: r.display_name?.trim() || placeholderName(r.line_user_id),
        company_name: r.ac_company_name ?? "",
        registered_at: r.created_at.toISOString(),
        delivery_count: delivery,
        helpful_count: helpful,
        not_helpful_count: notHelpful,
        matching_count: matching,
        last_activity_at: lastActivity ? lastActivity.toISOString() : null,
        reaction_rate: Math.round(reactionRate * 1000) / 1000,
        engagement_score: Math.round(score * 10) / 10,
        bucket: determineBucket(score, lastActivity),
      };
    });

    // スコア降順で並べ替え
    users.sort((a, b) => b.engagement_score - a.engagement_score);

    const summary: UserAnalyticsSummaryDto = {
      total: users.length,
      active: users.filter((u) => u.bucket === "active").length,
      moderate: users.filter((u) => u.bucket === "moderate").length,
      silent: users.filter((u) => u.bucket === "silent").length,
      reaction_rate_30d: Math.round(reactionRate30d * 1000) / 1000,
    };

    const response: UserAnalyticsResponseDto = {
      summary,
      users,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[/api/users/analytics] error", err);
    return NextResponse.json(
      {
        error: "internal_error",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
