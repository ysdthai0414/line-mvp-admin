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
import type { CaseDto, CompanyDto } from "@/types/db";

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
