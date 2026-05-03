// =====================================================================
// API クライアント：mock JSON / 実 API の切替を1箇所に集約する
//
// NEXT_PUBLIC_USE_MOCK=true なら public/mocks/*.json を fetch、
// それ以外（未設定 or false）なら /api/* を fetch する。
//
// Phase 2 移行期間中は env で安全に巻き戻せるように設計している。
// 全 API が DB ベースで安定したらこのラッパーは外して直 fetch でも良い。
// =====================================================================
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

interface FetchOptions {
  signal?: AbortSignal;
}

async function fetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  const res = await fetch(url, { signal: opts.signal });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${url} failed: ${res.status} ${res.statusText}${body ? ` — ${body}` : ""}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------
// /api/me
// ---------------------------------------------------------------------
export interface CurrentStaff {
  id: string;
  email: string;
  name: string;
  name_kana: string | null;
  role: "admin" | "manager" | "member" | "viewer";
  department: string | null;
  avatar_url: string | null;
  status: "active" | "inactive";
  last_login_at: string | null;
}

export async function getCurrentStaff(opts?: FetchOptions): Promise<CurrentStaff> {
  // /api/me は常に実 API（mock には対応する staff の行が無いため）
  return fetchJson<CurrentStaff>("/api/me", opts);
}

// ---------------------------------------------------------------------
// /api/companies
// ---------------------------------------------------------------------
import type {
  CaseDto,
  CompanyDto,
  MatchingDto,
  MatchingUiStatus,
  StatsDto,
  UserDto,
} from "@/types/db";

export async function getCompanies(opts?: FetchOptions): Promise<CompanyDto[]> {
  return fetchJson<CompanyDto[]>(
    USE_MOCK ? "/mocks/companies.json" : "/api/companies",
    opts
  );
}

// ---------------------------------------------------------------------
// /api/initiatives
// ---------------------------------------------------------------------
export async function getCases(opts?: FetchOptions): Promise<CaseDto[]> {
  return fetchJson<CaseDto[]>(
    USE_MOCK ? "/mocks/cases.json" : "/api/initiatives",
    opts
  );
}

// ---------------------------------------------------------------------
// /api/users
// ---------------------------------------------------------------------
export async function getUsers(opts?: FetchOptions): Promise<UserDto[]> {
  return fetchJson<UserDto[]>(
    USE_MOCK ? "/mocks/users.json" : "/api/users",
    opts
  );
}

// ---------------------------------------------------------------------
// /api/matchings
// ---------------------------------------------------------------------
export async function getMatchings(opts?: FetchOptions): Promise<MatchingDto[]> {
  return fetchJson<MatchingDto[]>(
    USE_MOCK ? "/mocks/matchings.json" : "/api/matchings",
    opts
  );
}

// ---------------------------------------------------------------------
// /api/stats
// ---------------------------------------------------------------------
export async function getStats(opts?: FetchOptions): Promise<StatsDto> {
  return fetchJson<StatsDto>(
    USE_MOCK ? "/mocks/stats.json" : "/api/stats",
    opts
  );
}

/**
 * マッチング申請のステータス更新（admin / manager のみ）。
 * 成功時 { ok: true, ... } を返す。
 */
export async function updateMatchingStatus(
  id: string,
  status: MatchingUiStatus
): Promise<{ ok: true; id: string; status: MatchingUiStatus }> {
  // mock モードでは実 PATCH が無いので no-op して成功を装う
  if (USE_MOCK) {
    return Promise.resolve({ ok: true, id, status });
  }
  const res = await fetch(`/api/matchings/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`PATCH /api/matchings/${id} failed: ${res.status} ${body}`);
  }
  return res.json();
}
