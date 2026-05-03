// =====================================================================
// 認証層：現在ログイン中の事務局スタッフを取得する
//
// 本番環境：Azure App Service の Easy Auth (Microsoft Entra ID) が前段に立ち、
// 認証済リクエストには以下のヘッダが自動で付与される：
//   X-MS-CLIENT-PRINCIPAL-NAME : メールアドレス
//   X-MS-CLIENT-PRINCIPAL-ID   : Entra ID オブジェクト ID
//   X-MS-CLIENT-PRINCIPAL      : Base64(JSON) の claims 全文
//
// ローカル開発：Easy Auth が無いので env で擬似ログインする：
//   DEV_AUTH_BYPASS=true
//   DEV_AUTH_BYPASS_EMAIL=k.yoshida@office-gensen.jp
// =====================================================================
import { headers } from "next/headers";
import { query, execute } from "./db";
import type { StaffRole, StaffRow } from "@/types/db";

/** 現在ログイン中のスタッフ。未ログイン or DB に未登録なら null */
export async function getCurrentStaff(): Promise<StaffRow | null> {
  const email = await resolveAuthenticatedEmail();
  if (!email) return null;

  const rows = await query<StaffRow>(
    "SELECT * FROM Staff WHERE email = :email AND status = 'active' LIMIT 1",
    { email }
  );
  const staff = rows[0] ?? null;

  // 任意：last_login_at の更新（重複ログイン時のスパムを避けるため非ブロッキング）
  if (staff) {
    execute(
      "UPDATE Staff SET last_login_at = CURRENT_TIMESTAMP(3) WHERE id = :id",
      { id: staff.id }
    ).catch((err) => console.warn("[auth] failed to update last_login_at", err));
  }

  return staff;
}

/**
 * Route Handler / Server Action から呼び、未認証なら 401 / 権限不足なら 403 を投げる。
 * 戻り値はログイン中のスタッフ（必ず存在）。
 */
export async function requireStaff(
  allowedRoles?: StaffRole[]
): Promise<StaffRow> {
  const staff = await getCurrentStaff();
  if (!staff) {
    throw new Response(
      JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: { "content-type": "application/json" } }
    );
  }
  if (allowedRoles && !allowedRoles.includes(staff.role)) {
    throw new Response(
      JSON.stringify({ error: "forbidden", required: allowedRoles, your_role: staff.role }),
      { status: 403, headers: { "content-type": "application/json" } }
    );
  }
  return staff;
}

// ---------------------------------------------------------------------
// 内部ヘルパー
// ---------------------------------------------------------------------

async function resolveAuthenticatedEmail(): Promise<string | null> {
  // ローカル開発時のバイパス
  if (process.env.DEV_AUTH_BYPASS === "true") {
    const email = process.env.DEV_AUTH_BYPASS_EMAIL;
    if (!email) {
      console.warn(
        "[auth] DEV_AUTH_BYPASS=true ですが DEV_AUTH_BYPASS_EMAIL が未設定です"
      );
      return null;
    }
    return email;
  }

  // 本番：Easy Auth ヘッダから取得
  const h = await headers();
  const email = h.get("x-ms-client-principal-name");
  return email && email.length > 0 ? email : null;
}
