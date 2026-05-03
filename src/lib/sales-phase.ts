// =====================================================================
// 売上高（円）→ sales_phase 7段階ラベルへの変換
// UI 側の SALES_PHASES (src/lib/status-labels.ts) と完全一致させる：
//   01_〜10億未満   :          ~  10億未満
//   02_10〜20億     :   10億 〜  20億
//   03_20〜30億     :   20億 〜  30億
//   04_30〜50億     :   30億 〜  50億
//   05_50〜70億     :   50億 〜  70億
//   06_70〜100億    :   70億 〜 100億
//   07_100億以上   :  100億 〜
//
// Bot 側 src/db.js の classifySalesTier (5段階) とは粒度が異なるので注意。
// 管理画面用のこちらが「正」と扱う（master データ整備時にすり合わせ予定）。
// =====================================================================

const OKU = 100_000_000; // 1億 = 1e8 円

export function salesAmountToPhase(annualSales: number | null | undefined): string {
  if (annualSales == null) return "01_〜10億未満";
  const oku = Number(annualSales) / OKU;
  if (oku < 10) return "01_〜10億未満";
  if (oku < 20) return "02_10〜20億";
  if (oku < 30) return "03_20〜30億";
  if (oku < 50) return "04_30〜50億";
  if (oku < 70) return "05_50〜70億";
  if (oku < 100) return "06_70〜100億";
  return "07_100億以上";
}

/** 円 → 億円（小数2桁）。null は 0 として返す */
export function yenToOku(annualSales: number | null | undefined): number {
  if (annualSales == null) return 0;
  return Math.round((Number(annualSales) / OKU) * 100) / 100;
}
