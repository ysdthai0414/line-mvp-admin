// =====================================================================
// 認証層：HMAC 署名 Cookie からスタッフを取得する
//
// 旧設計（Easy Auth + DEV_AUTH_BYPASS）は Phase 6 でシンプル認証に置換した。
// /api/login で Cookie 発行、それ以降のリクエストは Cookie から staff_id を取り出して
// Staff テーブルを引いて role 判定する。
// =====================================================================
import { cookies } from "next/headers";
import { execute, query } from "./db";
import { SESSION_COOKIE_NAME, verifySession } from "./session";
import type { StaffRole, StaffRow } from "@/types/db";

/** 現在ログイン中のスタッフ。未ログイン or DB に未登録/inactive なら null */
export async function getCurrentStaff(): Promise<StaffRow | null> {
  const c = await cookies();
  const cookieValue = c.get(SESSION_COOKIE_NAME)?.value;

  const payload = await verifySession(cookieValue);
  if (!payload) return null;

  const rows = await query<StaffRow>(
    `SELECT * FROM Staff
     WHERE id = :id AND email = :email AND status = 'active'
     LIMIT 1`,
    { id: payload.staff_id, email: payload.email }
  );
  const staff = rows[0] ?? null;

  // 任意：last_login_at の更新を非ブロッキングで（毎リクエスト走るが、軽量 UPDATE）
  if (staff) {
    execute(
      "UPDATE Staff SET last_login_at = CURRENT_TIMESTAMP(3) WHERE id = :id",
      { id: staff.id }
    ).catch((err) =>
      console.warn("[auth] failed to update last_login_at", err)
    );
  }

  return staff;
}

/**
 * Route Handler / Server Action から呼び、未認証なら 401、権限不足なら 403 を投げる。
 * 戻り値は必ず存在するスタッフ。
 *
 * 注：middleware.ts でも未認証は事前にブロックされるので、ここに到達する時点で
 * 通常はログイン済みのはずだが、念のため二重チェックしている。
 */
export async function requireStaff(
  allowedRoles?: StaffRole[]
): Promise<StaffRow> {
  const staff = await getCurrentStaff();
  if (!staff) {
    throw new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  if (allowedRoles && !allowedRoles.includes(staff.role)) {
    throw new Response(
      JSON.stringify({
        error: "forbidden",
        required: allowedRoles,
        your_role: staff.role,
      }),
      {
        status: 403,
        headers: { "content-type": "application/json" },
      }
    );
  }
  return staff;
}
