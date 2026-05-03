// =====================================================================
// セッション Cookie：HMAC-SHA256 で署名した payload を Cookie に格納する
//
// Web Crypto API（crypto.subtle）を使用しているので Node.js / Edge runtime
// の両方で動作する。Next.js Middleware は Edge runtime で動くため必須。
//
// Cookie 形式：`<base64url(JSON payload)>.<base64url(HMAC-SHA256 signature)>`
// =====================================================================

export const SESSION_COOKIE_NAME = "ynmo_admin_session";
export const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60; // 30 日

export interface SessionPayload {
  staff_id: string;
  email: string;
  exp: number; // unix timestamp (秒)
}

const TEXT = new TextEncoder();

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET must be set to at least 16 characters (current: " +
        (secret?.length ?? 0) +
        ")"
    );
  }
  return secret;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padded =
    str.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((str.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    TEXT.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function hmac(data: string): Promise<string> {
  const key = await getKey(getSecret());
  const sig = await crypto.subtle.sign("HMAC", key, TEXT.encode(data));
  return base64UrlEncode(new Uint8Array(sig));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** payload に署名して Cookie に格納する文字列を返す */
export async function signSession(payload: SessionPayload): Promise<string> {
  const json = JSON.stringify(payload);
  const data = base64UrlEncode(TEXT.encode(json));
  const sig = await hmac(data);
  return `${data}.${sig}`;
}

/** Cookie 文字列を検証し、有効なら payload を返す。改竄/期限切れ なら null */
export async function verifySession(
  cookie: string | undefined | null
): Promise<SessionPayload | null> {
  if (!cookie) return null;
  const dot = cookie.indexOf(".");
  if (dot < 0) return null;
  const data = cookie.slice(0, dot);
  const sig = cookie.slice(dot + 1);
  if (!data || !sig) return null;
  try {
    const expected = await hmac(data);
    if (!constantTimeEqual(sig, expected)) return null;
    const json = new TextDecoder().decode(base64UrlDecode(data));
    const payload = JSON.parse(json) as SessionPayload;
    if (typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.staff_id !== "string") return null;
    if (typeof payload.email !== "string") return null;
    return payload;
  } catch {
    return null;
  }
}
