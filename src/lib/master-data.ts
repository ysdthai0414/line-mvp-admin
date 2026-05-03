/**
 * YNMO 100億宣言支援AI 管理コンソール
 * マスタデータ定義
 *
 * 配置先：src/lib/master-data.ts
 *
 * 実データ（companies.json）から抽出した業種・地域などの選択肢マスタ。
 * 取り組み事例の配信先絞り込み、ユーザー一覧フィルタ等で使用。
 */

// ----- 業種大分類（実データ準拠の18種類）-----
export const INDUSTRY_LIST = [
  "製造業",
  "卸売業・小売業",
  "建設業",
  "運輸業・郵便業",
  "サービス業_他に分類されないもの",
  "宿泊業・飲食サービス業",
  "情報通信業",
  "不動産業・物品賃貸業",
  "学術研究・専門・技術サービス業",
  "生活関連サービス業・娯楽業",
  "医療・福祉",
  "分類不能の産業",
  "教育・学習支援業",
  "農業・林業",
  "電気・ガス・熱供給・水道業",
  "鉱業・採石業・砂利採取業",
  "漁業",
] as const;

export type Industry = (typeof INDUSTRY_LIST)[number];

// ----- 都道府県（47都道府県、北→南）-----
export const PREFECTURE_LIST = [
  "北海道",
  "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
] as const;

export type Prefecture = (typeof PREFECTURE_LIST)[number];

/**
 * 業種×売上フェーズの企業数を集計するヘルパー
 * stats.json の company_counts_by_industry_phase を使う
 *
 * @example
 * countTargetCompanies(
 *   stats.company_counts_by_industry_phase,
 *   ["製造業", "情報通信業"],
 *   ["02_10〜20億", "03_20〜30億"]
 * ) // → 該当する企業数
 */
export function countTargetCompanies(
  matrix: Record<string, Record<string, number>>,
  industries: string[],
  salesPhases: string[]
): number {
  if (industries.length === 0 || salesPhases.length === 0) return 0;
  let total = 0;
  for (const ind of industries) {
    const phases = matrix[ind];
    if (!phases) continue;
    for (const phase of salesPhases) {
      total += phases[phase] || 0;
    }
  }
  return total;
}
