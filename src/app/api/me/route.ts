// =====================================================================
// GET /api/me
// 現在ログイン中の事務局スタッフ情報を返す。
// UI 側 sidebar.tsx 等で「現在のログインユーザー」表示に使う。
// =====================================================================
import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/auth";

// このルートは毎回認証ヘッダ依存で動的なので Static 化させない
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const staff = await getCurrentStaff();

    if (!staff) {
      return NextResponse.json(
        { error: "unauthorized" },
        { status: 401 }
      );
    }

    // パスワード等の機微情報は無いので、そのまま返してよい
    return NextResponse.json({
      id: staff.id,
      email: staff.email,
      name: staff.name,
      name_kana: staff.name_kana,
      role: staff.role,
      department: staff.department,
      avatar_url: staff.avatar_url,
      status: staff.status,
      last_login_at: staff.last_login_at,
    });
  } catch (err) {
    console.error("[/api/me] error", err);
    return NextResponse.json(
      {
        error: "internal_error",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
