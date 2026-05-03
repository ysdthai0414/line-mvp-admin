# YNMO 100億宣言支援AI 管理コンソール

中小企業庁「100億宣言」認定企業（約3,135社）の事務局向け管理画面 UI プロトタイプです。

> 本プロトタイプは **UIレイヤーの設計確認用**です。実装（API・DB・認証）は別途内製チームで対応する前提です。

---

## クイックスタート

```bash
git clone <this-repo>
cd ynmo-admin
npm install
npm run dev
```

→ `http://localhost:3000` を開く

---

## 技術スタック

| カテゴリ | 採用技術 |
|---|---|
| フレームワーク | [Next.js 16](https://nextjs.org)（App Router、Server Components） |
| 言語 | TypeScript（strict） |
| UI ライブラリ | [shadcn/ui](https://ui.shadcn.com)（Radix UI + Tailwind） |
| スタイリング | Tailwind CSS v4（CSS-first 構成、`@theme inline` 使用） |
| アイコン | [lucide-react](https://lucide.dev) |
| グラフ | [recharts](https://recharts.org)（ドーナツ・棒グラフ） |
| 日付 | [date-fns](https://date-fns.org) + ja ロケール |
| アニメーション | tw-animate-css（shadcn 同梱） |

---

## ディレクトリ構造

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # RootLayout、ConditionalLayout で /login をバイパス
│   ├── page.tsx                  # ダッシュボード (/)
│   ├── login/page.tsx            # ログイン
│   ├── cases/                    # 取り組み事例
│   │   ├── page.tsx              # 一覧
│   │   ├── [id]/page.tsx         # 詳細・編集
│   │   └── new/page.tsx          # 新規作成
│   ├── matchings/
│   │   ├── page.tsx              # 一覧
│   │   └── aggregate/page.tsx    # 集約ビュー
│   ├── users/
│   │   ├── page.tsx              # 一覧
│   │   └── [id]/page.tsx         # 詳細（チャット式）
│   ├── companies/page.tsx        # 認可企業マスタ
│   ├── sessions/
│   │   ├── page.tsx              # 一覧
│   │   ├── [id]/page.tsx         # 詳細
│   │   └── new/page.tsx          # 新規
│   └── settings/page.tsx         # 設定
│
├── components/
│   ├── layout/                   # 共通レイアウト
│   │   ├── app-shell.tsx
│   │   ├── conditional-layout.tsx
│   │   ├── sidebar.tsx
│   │   └── topbar.tsx
│   ├── cases/                    # 取り組み事例固有
│   │   └── case-editor.tsx
│   ├── users/                    # ユーザー固有
│   │   └── chat-push.tsx         # チャット式 push UI
│   └── ui/                       # shadcn/ui コンポーネント
│
└── lib/
    ├── status-labels.ts          # ステータス日本語ラベル
    ├── master-data.ts            # 業種・都道府県・売上フェーズ等
    └── utils.ts                  # cn() ヘルパー（shadcn 同梱）

public/
├── mocks/                        # モックJSON（API代わり）
│   ├── cases.json
│   ├── matchings.json
│   ├── users.json
│   ├── companies.json            # ⚠ 約2MB、3,135社の実データ
│   ├── sessions.json
│   └── stats.json                # 事前集計データ（パフォーマンス最適化用）
│
└── samples/                      # サンプルPDF等
```

---

## デザイントークン

すべて `src/app/globals.css` に CSS変数（oklch 色空間）で定義。Tailwind v4 の `@theme inline` 経由で利用可能。

### カラーパレット

| トークン | 値（oklch） | 用途 |
|---|---|---|
| `--primary` | `oklch(0.40 0.090 243)` = `#1F4E79` | プライマリ（紺） |
| `--primary-50` 〜 `--primary-900` | パレット | 各段階 |
| `--success` | `oklch(0.55 0.155 145)` | 成功・確認済み |
| `--warning` | `oklch(0.74 0.165 65)` | 警告・受付中 |
| `--destructive` | `oklch(0.58 0.220 27)` | エラー・削除 |
| `--info` | `oklch(0.66 0.150 220)` | 情報・配信開封 |
| `--accent` | `oklch(0.74 0.135 70)` | アクセント（ゴールド） |
| `--sidebar` | `oklch(0.20 0.060 243)` | ダーク紺（サイドバー） |
| `--muted` | `oklch(0.97 0.006 243)` | 補助背景 |

各色に `-foreground`（対比色）が定義されています。

### タイポグラフィ

```css
--font-sans: "Inter", "Noto Sans JP", "Yu Gothic", "Hiragino Sans",
             "Meiryo", system-ui, sans-serif;
```

### スケール

- 余白：4px グリッド（Tailwind の標準スケール）
- 角丸：`--radius: 0.5rem`、`-sm`/`-md`/`-lg`/`-xl`/`-2xl`
- レイアウト：
  - `--sidebar-width: 240px`
  - `--sidebar-width-collapsed: 64px`
  - `--topbar-height: 56px`
  - `--content-max-width: 1440px`

---

## モックデータの構造

### `public/mocks/cases.json`（取り組み事例 / 10件）

```ts
type Case = {
  id: string;                 // "case_0001"
  title: string;
  company_id: string;
  company_name: string;
  status: "draft" | "scheduled" | "published" | "archived";
  publish_at: string | null;  // ISO datetime（scheduled時のみ）
  pdf_filename: string;
  upload_at: string;
  target_industries: string[];     // 配信先業界（multi）
  target_sales_phases: string[];   // 配信先売上フェーズ（multi）
  // 以下、ダミーコンテンツ用（本実装では PDF から取得）
  summary: string;
  content: string;
  tags: string[];
  pdf_url: string;
  // ...
};
```

### `public/mocks/matchings.json`（マッチング申請 / 15件）

```ts
type Matching = {
  id: string;                       // "m_0001"
  case_id: string;
  case_title: string;
  applicant_user_id: string;
  applicant_company_id: string;
  target_company_id: string;
  target_company_name: string;
  score: number;                    // 0.55〜0.98
  threshold_flag: boolean;          // 受付≥4 で true
  company_total_count: number;      // 同企業の受付総数
  status: "受付" | "相談会割当済" | "クローズ";
  closed_reason: "企業辞退" | "期限切れ" | null;
  message: string;
  created_at: string;
  updated_at: string;
};
```

### `public/mocks/companies.json`（認可企業 / 3,135社・実データ）

```ts
type Company = {
  id: string;                        // "co_00001"
  corporate_number: string;          // 13桁の法人番号
  name: string;
  name_kana: string;
  application_type: string;          // "単独申請" | "企業グループによる申請"
  prefecture: string;                // 47都道府県
  industry: string;                  // 18業種大分類
  industry_code: string;             // "I", "E" 等
  industry_minor: string;            // 中分類
  industry_minor_code: string;
  employee_count: number;
  revenue_oku: number | null;        // 売上高（億円）
  target_year: number | null;
  declaration_url: string | null;    // 公式宣言PDFのURL
  sales_phase: string;               // "01_〜10億未満" 等の7段階
  status: "active" | "suspended";
  authorized_at: string;
};
```

⚠️ **`companies.json` は約2MB**。ダッシュボード等では fetch せず、`stats.json` の事前集計を使用。

### `public/mocks/users.json`（LINEユーザー / 10件）

```ts
type User = {
  id: string;                        // "u_0001"
  email: string;
  name: string;
  name_kana: string;
  company_id: string;
  role: "admin" | "manager" | "member";
  sales_phase: string;
  avatar_url: string;
  last_login_at: string;
  created_at: string;
  push_enabled: boolean;
};
```

### `public/mocks/sessions.json`（相談会 / 8件）

```ts
type Session = {
  id: string;
  title: string;
  host_user_id: string;
  host_user_name: string;
  scheduled_at: string;
  duration_min: number;
  attendees: { user_id: string; user_name: string; }[];
  status: "scheduled" | "completed" | "cancelled" | "planning" | "confirmed";
  notes: string;
};
```

### `public/mocks/stats.json`（事前集計）

ダッシュボード等で companies.json を fetch せずに済むよう、事前に集計済み：

```ts
type Stats = {
  summary: {
    total_cases: number;
    published_cases: number;
    scheduled_publishes: number;
    draft_cases: number;
    total_matchings: number;
    pending_matchings: number;
    approved_matchings: number;
    total_users: number;
    active_users_30d: number;
    total_companies: number;
    active_companies: number;
    companies_at_threshold: number;
    matching_threshold: number;     // 4
    monthly_growth_rate: number;
  };
  matchings_by_status: { 受付: number; 相談会割当済: number; クローズ: number; };
  closed_breakdown: Record<string, number>;
  weekly_trend: { week: string; cases: number; matchings: number; new_users: number; }[];
  top_industries: { industry: string; count: number; }[];
  recent_activities: { ... }[];
  upcoming_publishes: { ... }[];      // 配信予定（時系列）
  threshold_companies: { ... }[];     // しきい値到達企業
  company_counts_by_industry_phase: Record<string, Record<string, number>>;
  company_counts_by_industry: Record<string, number>;
  company_counts_by_phase: Record<string, number>;
  generated_at: string;
};
```

---

## 重要な実装パターン

### 1. ステータスラベルの日本語化

`src/lib/status-labels.ts` に英語キー → 日本語ラベルのマッピングが定義されています。

```tsx
import { CASE_STATUS_LABELS, MATCHING_STATUS_VARIANTS } from "@/lib/status-labels";

<Badge variant={MATCHING_STATUS_VARIANTS[m.status]}>
  {MATCHING_STATUS_LABELS[m.status]}
</Badge>
```

### 2. 配信対象企業数のリアルタイム計算

業種×売上フェーズの選択に応じて、何社に配信されるかを動的計算。companies.json は fetch しない（重いため）。

```tsx
import { countTargetCompanies } from "@/lib/master-data";

const targetCount = countTargetCompanies(
  stats.company_counts_by_industry_phase,
  selectedIndustries,
  selectedSalesPhases
);
```

### 3. `/login` の AppShell バイパス

`/login` だけはサイドバー・トップバーを表示しないため、`ConditionalLayout` で判定。

```tsx
// src/components/layout/conditional-layout.tsx
"use client";
const BARE_ROUTES = ["/login"];
const isBare = BARE_ROUTES.some(r => pathname.startsWith(r));
return isBare ? <>{children}</> : <AppShell>{children}</AppShell>;
```

### 4. URL クエリで初期フィルタ

```tsx
const searchParams = useSearchParams();
const initialStatus = searchParams.get("status"); // "scheduled" 等
```

ダッシュボードからの遷移で `?company={id}` を受け取り、ハイライト表示。

### 5. リアルタイム時計（毎分更新）

```tsx
const [now, setNow] = useState(new Date());
useEffect(() => {
  const id = setInterval(() => setNow(new Date()), 60_000);
  return () => clearInterval(id);
}, []);
```

---

## 既知の制約・引き継ぎ事項

### プロトタイプの制約

1. **永続化なし**：保存ボタン押下しても、リロードで初期値に戻る（モックデータが固定）
2. **認証なし**：`/login` の SSO ボタンは alert のみ
3. **PDF プレビュー**：プレースホルダー（実ファイル表示なし）
4. **チャット送信**：楽観的UI更新のみ、実際のLINE Bot連携なし
5. **画面遷移の404**：`/cases/new` 等の存在しない[id] でアクセスした場合の対応未実装

### 本実装で対応してほしいこと

1. **API 実装**：モックの形を踏襲して REST or GraphQL でDBから取得
2. **認証**：Microsoft Entra ID（Azure AD）SSO 実装
3. **PDF アップロード**：S3等にアップロード、`pdf_url` を保存
4. **LINE Bot 連携**：個別 push の実送信（`/users/[id]` のチャット）
5. **しきい値到達検知**：マッチング pending が 4件目に到達した瞬間にダッシュボードへ反映する仕組み（Webhook/Polling）
6. **Cron**：`stats.json` の事前集計を定期再生成（実本番では DB 集計クエリ）
7. **アクセス制御**：role に応じた画面アクセス制限（admin/manager/閲覧のみ）
8. **エラーハンドリング**：API エラー時のフォールバック UI

### パフォーマンス注意点

1. **`companies.json` の重さ**：3,135件で約2MB。ダッシュボード等では使わない
2. **/companies のページネーション**：50件/ページに制限。DB 実装後はサーバーサイド paging 推奨
3. **配信先業種選択 UI**：18業種のリストで、各右に件数を表示するため `stats.json` の事前集計を活用

---

## ビルド・デプロイ

```bash
# 開発
npm run dev

# 本番ビルド
npm run build
npm run start

# Lint
npm run lint
```

Vercel・Netlify どちらでもデプロイ可。`public/mocks/` は静的アセットとして配信されます。

---

## ライセンス・著作権

- 本プロトタイプ：受注先（YNMO チーム）に納品。再利用条件は別途契約に従う。
- 100億宣言企業データ：[中小企業庁公開リスト](https://growth-100-oku.smrj.go.jp/) 由来。

---

## 連絡先

- 受注者：キャプテンズ
- リード・実装：小野寺 香織
- 依頼側窓口：吉田 航平 様

質問・問い合わせは Slack または直接メールで。
