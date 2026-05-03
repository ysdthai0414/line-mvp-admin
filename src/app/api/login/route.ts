// =====================================================================
// POST /api/login
// 共通パスワード + Email で認証して、署名 Cookie を発行する。
//
// リクエストボディ：
//   { email: string, password: string }
//
// 検証順序：
//   1. ADMIN_PASSWORD と一致するか
//   2. Staff テーブルに email が登録されており status='active' か
//
// 失敗時はどのフィールドで失敗したかを区別せず一律 401（ユーザー列挙攻撃防止）
// =====================================================================
import { NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import {
  signSession,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SEC,
} from "@/lib/session";
import type { StaffRow } from "@/types/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || adminPassword.length < 4) {
      console.error(
        "[/api/login] ADMIN_PASSWORD が未設定または短すぎる（>=4文字必要）"
      );
      return NextResponse.json(
        { error: "server_misconfigured" },
        { status: 500 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "missing_fields" },
        { status: 400 }
      );
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: "invalid_credentials" },
        { status: 401 }
      );
    }

    const rows = await query<StaffRow>(
      `SELECT * FROM Staff
       WHERE LOWER(email) = :email AND status = 'active'
       LIMIT 1`,
      { email }
    );
    const staff = rows[0];
    if (!staff) {
      return NextResponse.json(
        { error: "invalid_credentials" },
        { status: 401 }
      );
    }

    // last_login_at 更新（非ブロッキング）
    execute(
      "UPDATE Staff SET last_login_at = CURRENT_TIMESTAMP(3) WHERE id = :id",
      { id: staff.id }
    ).catch(() => {});

    const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC;
    const cookieValue = await signSession({
      staff_id: staff.id,
      email: staff.email,
      exp,
    });

    const res = NextResponse.json({
      ok: true,
      staff: {
        id: staff.id,
        email: staff.email,
        name: staff.name,
        role: staff.role,
      },
    });
    res.cookies.set(SESSION_COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SEC,
    });
    return res;
  } catch (err) {
    console.error("[/api/login] error", err);
    return NextResponse.json(
      { error: "internal_error" },
      { status: 500 }
    );
  }
}
