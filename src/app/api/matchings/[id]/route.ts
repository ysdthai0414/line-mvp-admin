// =====================================================================
// PATCH /api/matchings/[id]
// マッチング申請のステータス更新。事務局メンバー以上のロールが必要。
//
// 受け付けるリクエストボディ:
//   { status: "待機中" | "要対応" | "開催準備中" | "終了", closed_reason?: string }
//
// 注意：closed_reason は現状 DB カラム未実装のため受け取っても保存しない（Layer 2 対応予定）。
// =====================================================================
import { NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { uiToDBStatus } from "@/lib/matching-status";
import type { MatchingUiStatus } from "@/types/db";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES: MatchingUiStatus[] = [
  "待機中",
  "要対応",
  "開催準備中",
  "終了",
];

interface ExistsRow extends RowDataPacket {
  id: number;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 書き込み系は admin / manager のみ許可
    await requireStaff(["admin", "manager"]);

    const { id: rawId } = await params;
    const numericId = Number(rawId.replace(/^m_/, ""));
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return NextResponse.json(
        { error: "invalid_id", message: `不正な id: ${rawId}` },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      status?: MatchingUiStatus;
    };
    const newUiStatus = body.status;

    if (!newUiStatus || !ALLOWED_STATUSES.includes(newUiStatus)) {
      return NextResponse.json(
        {
          error: "invalid_status",
          message: `status は ${ALLOWED_STATUSES.join("/")} のいずれか`,
          received: newUiStatus,
        },
        { status: 400 }
      );
    }

    // 存在チェック
    const exists = await query<ExistsRow>(
      "SELECT id FROM MatchingRequests WHERE id = :id LIMIT 1",
      { id: numericId }
    );
    if (exists.length === 0) {
      return NextResponse.json(
        { error: "not_found", message: `MatchingRequests id=${numericId} が存在しません` },
        { status: 404 }
      );
    }

    const newDbStatus = uiToDBStatus(newUiStatus);

    // closed の場合は closed_at を打つ。それ以外は NULL に戻す（再オープン対応）
    const sql =
      newDbStatus === "closed"
        ? `UPDATE MatchingRequests
             SET status = :status, closed_at = CURRENT_TIMESTAMP(3)
             WHERE id = :id`
        : `UPDATE MatchingRequests
             SET status = :status, closed_at = NULL
             WHERE id = :id`;

    await execute(sql, { status: newDbStatus, id: numericId });

    return NextResponse.json({
      ok: true,
      id: `m_${String(numericId).padStart(4, "0")}`,
      status: newUiStatus,
      db_status: newDbStatus,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[/api/matchings/[id] PATCH] error", err);
    return NextResponse.json(
      {
        error: "internal_error",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
