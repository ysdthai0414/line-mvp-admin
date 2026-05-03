// =====================================================================
// Next.js Middleware：全リクエストで Cookie を検証して、未認証なら弾く
//
// - ページリクエスト未認証 → /login にリダイレクト（?from=元のパス）
// - API リクエスト未認証 → 401 JSON
// - /login と /api/login と /api/logout は素通り（認証フロー自体のため）
// - /_next/* と /favicon.ico は素通り（ビルド成果物）
//
// 実行環境は Edge runtime。session.ts は Web Crypto API のみ使用なので動く。
// =====================================================================
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/session";

const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/api/login",
  "/api/logout",
]);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const payload = await verifySession(cookie);

  if (payload) {
    return NextResponse.next();
  }

  // 未認証
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 }
    );
  }

  // ページは /login にリダイレクト
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // 静的ファイルと内部パスは除外
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|mocks/|public/).*)",
  ],
};
