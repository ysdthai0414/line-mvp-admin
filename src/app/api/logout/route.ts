// =====================================================================
// POST /api/logout
// セッション Cookie を即時無効化する。サーバー側でのトークン invalidation は
// 無いので Cookie 削除のみ（HMAC 設計上、これで十分）。
// =====================================================================
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
