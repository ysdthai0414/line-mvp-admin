/**
 * YNMO 100億宣言支援AI 管理コンソール
 * ステータス表示用 日本語ラベル定義
 *
 * RFP定義の英語ステータス値を画面表示用の日本語に変換するためのマッピング
 * MTG（2026/4/30）でよしこさんと「日本語対応」で合意済み
 *
 * 配置先：src/lib/status-labels.ts
 */

// ----- 取り組み事例（cases）-----
export const CASE_STATUS_LABELS = {
  draft: "下書き",
  published: "公開中",
  scheduled: "公開予定",
  archived: "アーカイブ",
} as const;

export const CASE_STATUS_VARIANTS: Record<keyof typeof CASE_STATUS_LABELS, string> = {
  draft: "secondary",
  published: "default",      // primary色
  scheduled: "outline",      // 薄め
  archived: "secondary",
};

// ----- ユーザー（users）-----
export const USER_STATUS_LABELS = {
  NEW: "新規登録",
  AWAITING_CONFIRM: "確認待ち",
  CONFIRMED: "確認済み",
} as const;

export const USER_STATUS_VARIANTS: Record<keyof typeof USER_STATUS_LABELS, string> = {
  NEW: "default",            // primary
  AWAITING_CONFIRM: "warning",
  CONFIRMED: "success",
};

// ----- マッチング申請（matchings）-----
// 業務状態として4状態に再定義（RFPの3値より UI/UX 観点で改善）
// よしこさんへ提案、合意済みであれば本実装でも踏襲推奨
export const MATCHING_STATUS_LABELS = {
  待機中: "待機中",
  要対応: "要対応",
  開催準備中: "開催準備中",
  終了: "終了",
} as const;

export const MATCHING_STATUS_VARIANTS: Record<keyof typeof MATCHING_STATUS_LABELS, string> = {
  待機中: "secondary",      // 薄いグレー（様子見）
  要対応: "warning",        // 警告オレンジ（事務局が動く）
  開催準備中: "success",    // 緑（動いている）
  終了: "secondary",        // 薄いグレー（完了）
};

// 終了の理由（サブステータス）
export const CLOSED_REASON_LABELS = {
  企業辞退: "企業辞退",
  期限切れ: "期限切れ",
  完了: "完了",
  キャンセル: "キャンセル",
} as const;

/**
 * マッチング申請の表示ステータスを取得（クローズの場合は理由を併記）
 * 例: "終了（企業辞退）" "終了（期限切れ）"
 */
export function getMatchingDisplayLabel(matching: {
  status: string;
  closed_reason?: string | null;
}): string {
  if (matching.status === "終了" && matching.closed_reason) {
    return `終了（${matching.closed_reason}）`;
  }
  return MATCHING_STATUS_LABELS[matching.status as keyof typeof MATCHING_STATUS_LABELS] ?? matching.status;
}

// ----- 相談会（sessions）-----
// RFP では既に日本語（企画中/開催確定/開催済/中止）だが、モックは英語キーで保持
export const SESSION_STATUS_LABELS = {
  scheduled: "開催予定",
  completed: "開催済",
  cancelled: "中止",
  planning: "企画中",
  confirmed: "開催確定",
} as const;

// ----- 売上フェーズ（users.sales_phase）-----
// MTG確定：7段階
export const SALES_PHASES = [
  { id: "01_〜10億未満", label: "〜10億未満", short: "〜10億" },
  { id: "02_10〜20億", label: "10〜20億", short: "10-20億" },
  { id: "03_20〜30億", label: "20〜30億", short: "20-30億" },
  { id: "04_30〜50億", label: "30〜50億", short: "30-50億" },
  { id: "05_50〜70億", label: "50〜70億", short: "50-70億" },
  { id: "06_70〜100億", label: "70〜100億", short: "70-100億" },
  { id: "07_100億以上", label: "100億以上", short: "100億+" },
] as const;

export const SALES_PHASE_LABELS: Record<string, string> = Object.fromEntries(
  SALES_PHASES.map((p) => [p.id, p.label])
);

// ----- マッチングしきい値 -----
// MTG確定：4件以上が集まったらダッシュボードで通知
export const MATCHING_THRESHOLD = 4;

// ----- ロール（事務局スタッフ + ユーザー）-----
export const ROLE_LABELS = {
  admin: "管理者",
  manager: "マネージャー",
  member: "メンバー",
  viewer: "閲覧のみ",
} as const;

export const ROLE_VARIANTS: Record<keyof typeof ROLE_LABELS, string> = {
  admin: "default",
  manager: "secondary",
  member: "outline",
  viewer: "outline",
};

export type Role = keyof typeof ROLE_LABELS;

// ----- 型エイリアス（インポートしやすく）-----
export type CaseStatus = keyof typeof CASE_STATUS_LABELS;
export type UserStatus = keyof typeof USER_STATUS_LABELS;
export type MatchingStatus = keyof typeof MATCHING_STATUS_LABELS;
export type SessionStatus = keyof typeof SESSION_STATUS_LABELS;
export type SalesPhase = (typeof SALES_PHASES)[number]["id"];
export type ClosedReason = keyof typeof CLOSED_REASON_LABELS;
