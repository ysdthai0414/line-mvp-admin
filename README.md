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
├── app/
│   ├── layout.tsx                # RootLayout（ConditionalLayout で /login をバイパス）
│   ├── page.tsx                  # ダッシュボード (/)
│   ├── login/page.tsx            # ログイン
│   ├── cases/                    # 取り組み事例
│   │   ├── page.tsx              # 一覧（列ソート可、アーカイブ表示トグル）
│   │   ├── [id]/page.tsx         # 詳細・編集（status別ロック）
│   │   └── new/page.tsx          # 新規作成
│   ├── matchings/
│   │   ├── page.tsx              # 個別申請（タブ統合）
│   │   └── aggregate/page.tsx    # 企業別集約（タブ統合）
│   ├── users/                    # LINE ユーザー
│   │   ├── page.tsx              # 一覧（企業名・役職・売上フェーズ表示）
│   │   └── [id]/page.tsx         # 詳細（プロフィール + 履歴 + チャット式 push）
│   ├── companies/page.tsx        # 認可企業マスタ
│   ├── sessions/
│   │   ├── page.tsx              # 一覧
│   │   ├── [id]/page.tsx         # 詳細・編集（キャンセル時はロック）
│   │   └── new/page.tsx          # 新規作成（ホスト・参加者選択）
│   └── settings/page.tsx         # 設定（タブ：スタッフ管理 / プロフィール / システム）
│
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx         # 全体ラッパー
│   │   ├── conditional-layout.tsx # /login バイパス制御
│   │   ├── sidebar.tsx           # ダーク色サイドバー、現在ログインユーザー（s_0001）表示
│   │   └── topbar.tsx            # ブランド名 + リアルタイム時計 + 通知ベル
│   ├── cases/
│   │   └── case-editor.tsx       # 詳細・編集の共通コンポーネント
│   ├── users/
│   │   └── chat-push.tsx         # チャット式 push UI
│   └── ui/                       # shadcn/ui コンポーネント
│
└── lib/
    ├── status-labels.ts          # ステータス・ロール日本語ラベル
    ├── master-data.ts            # 業種・都道府県マスタ
    └── utils.ts

public/
└── mocks/
    ├── cases.json                # 10件
    ├── matchings.json            # 15件
    ├── users.json                # 10件（LINE ユーザー）
    ├── staff.json                # 6名（事務局スタッフ）
    ├── companies.json            # ⚠ 約2MB、実データ3,135社
    ├── sessions.json             # 8件
    └── stats.json                # 事前集計
```

---

## デザイントークン

すべて `src/app/globals.css` に CSS変数（oklch 色空間）で定義。Tailwind v4 の `@theme inline` 経由で利用可能。

### カラーパレット

| トークン | 値（oklch） | 用途 |
|---|---|---|
| `--primary` | `oklch(0.40 0.090 243)` ≈ `#1F4E79` | プライマリ（紺） |
| `--primary-50` 〜 `--primary-900` | パレット 10段階 | 各段階の濃淡 |
| `--success` | `oklch(0.55 0.155 145)` | 成功・確認済み・開催準備中 |
| `--warning` | `oklch(0.74 0.165 65)` | 警告・要対応 |
| `--destructive` | `oklch(0.58 0.220 27)` | エラー・削除・キャンセル |
| `--info` | `oklch(0.66 0.150 220)` | 情報・配信開封率 |
| `--accent` | `oklch(0.74 0.135 70)` | アクセント（ゴールド） |
| `--sidebar` | `oklch(0.20 0.060 243)` | ダーク紺（サイドバー） |
| `--muted` | `oklch(0.97 0.006 243)` | 補助背景 |

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

### `public/mocks/staff.json`（事務局スタッフ / 6名）

```ts
type Staff = {
  id: string;                       // "s_0001"
  email: string;
  name: string;
  name_kana: string;
  role: "admin" | "manager" | "member" | "viewer";
  department: string;               // 部署
  avatar_url: string;
  last_login_at: string;
  created_at: string;
  status: "active" | "inactive";
};
```

**現在のログインユーザー（プロトタイプ）**：`s_0001`（吉田航平・admin・事務局統括）。
依頼主のよしこさんがプロトタイプを開いた際、自分が管理者として体験できる構成。

### `public/mocks/users.json`（LINE ユーザー / 10名）

```ts
type User = {
  id: string;                       // "u_0001"
  email: string;
  name: string;
  name_kana: string;
  company_id: string;               // 認可企業との紐付け
  company_name: string;
  company_industry: string;
  company_prefecture: string;
  position: string;                 // 役職（代表取締役、経営企画部長 など）
  sales_phase: string;              // "01_〜10億未満" 等の7段階
  status: "NEW" | "AWAITING_CONFIRM" | "CONFIRMED";
  avatar_url: string;
  last_login_at: string;
  registered_at: string;
  push_enabled: boolean;
  last_active_at: string;
};
```

**ロールフィールドは持たない**（LINE ユーザーには事務局のロール概念は適用されない）。
RFP §4-I 準拠。

### `public/mocks/cases.json`（取り組み事例 / 10件）

```ts
type Case = {
  id: string;                       // "case_0001"
  title: string;
  company_id: string;
  company_name: string;
  status: "draft" | "scheduled" | "published" | "archived";
  publish_at: string | null;        // ISO datetime（scheduled時のみ）
  pdf_filename: string;
  upload_at: string;
  target_industries: string[];      // 配信先業界（multi）
  target_sales_phases: string[];    // 配信先売上フェーズ（multi）
  // 以下、ダミーコンテンツ用（本実装では PDF メタデータから取得）
  summary: string;
  content: string;
  tags: string[];
  pdf_url: string;
};
```

**ステータスのライフサイクル**：
- `draft`：アップロード済み、配信日未設定 → 編集自由
- `scheduled`：配信予定 → 読み取り専用 ↔ 編集モード切替で慎重に変更
- `published`：配信完了 → **完全ロック、配信日含む全項目編集不可（読み取り専用表示）**
- `archived`：アーカイブ → 完全ロック + 「アーカイブ解除」ボタンで draft に戻せる

### `public/mocks/matchings.json`（マッチング申請 / 15件）

```ts
type Matching = {
  id: string;                       // "m_0001"
  case_id: string;
  case_title: string;
  applicant_user_id: string;        // users.json 参照
  applicant_user_name: string;
  applicant_company_id: string;
  applicant_company_name: string;
  applicant_position: string;
  target_company_id: string;
  target_company_name: string;
  score: number;                    // 0.55〜0.98（マッチング度合い）
  threshold_flag: boolean;          // 要対応で true
  company_total_count: number;
  status: "待機中" | "要対応" | "開催準備中" | "終了";
  closed_reason: "企業辞退" | "期限切れ" | null;
  message: string;
  created_at: string;
  updated_at: string;
};
```

**ステータス（4値、UI/UX観点で再定義）**：
- `待機中`：申込が4件未満（様子見）
- `要対応`：申込が4件以上集まり、相談会調整が必要
- `開催準備中`：相談会の日程が決定済み
- `終了`：相談会完了 or 企業辞退・期限切れ（`closed_reason` で詳細）

> **設計提案**：RFP §4-E では「受付 / 相談会割当済 / クローズ」の3値が指定されていますが、UI/UX観点で4値に再定義することを提案しています。詳細は `proposal-status-redesign.md` を参照。

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
  industry_code: string;
  industry_minor: string;
  industry_minor_code: string;
  employee_count: number;
  revenue_oku: number | null;        // 売上高（億円）
  target_year: number | null;
  declaration_url: string | null;    // 公式宣言PDFのURL
  sales_phase: string;
  status: "active" | "suspended";
  authorized_at: string;
};
```

⚠️ **`companies.json` は約2MB**。ダッシュボード等では fetch せず、`stats.json` の事前集計を使用。

### `public/mocks/sessions.json`（相談会 / 8件）

```ts
type Session = {
  id: string;
  title: string;
  host_user_id: string;             // staff.json 参照（admin / manager のみ）
  host_user_name: string;
  scheduled_at: string;
  duration_min: number;
  attendees: {
    user_id: string;                // users.json 参照（LINE ユーザー）
    user_name: string;
    company_name: string;
    position: string;
  }[];
  status: "scheduled" | "completed" | "cancelled" | "planning" | "confirmed";
  notes: string;
};
```

**キャンセル済み（`cancelled`）は再開不可**。新規作成のみで対応。

### `public/mocks/stats.json`（事前集計）

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
  matchings_by_status: {
    待機中: number;
    要対応: number;
    開催準備中: number;
    終了: number;
  };
  closed_breakdown: Record<string, number>;
  weekly_trend: { week: string; cases: number; matchings: number; new_users: number; }[];
  top_industries: { industry: string; count: number; }[];
  recent_activities: { ...; actor_id: string; actor_name: string; }[];
  upcoming_publishes: { ... }[];
  threshold_companies: { ... }[];
  company_counts_by_industry_phase: Record<string, Record<string, number>>;
  company_counts_by_industry: Record<string, number>;
  company_counts_by_phase: Record<string, number>;
  generated_at: string;
};
```

---

## 重要な実装パターン

### 1. ステータス・ロールラベルの日本語化

`src/lib/status-labels.ts` に英語キー → 日本語ラベルのマッピング：

```tsx
import {
  CASE_STATUS_LABELS,           // draft → 下書き、published → 公開中 など
  MATCHING_STATUS_LABELS,       // 待機中/要対応/開催準備中/終了
  USER_STATUS_LABELS,           // NEW → 新規登録 など
  ROLE_LABELS,                  // admin → 管理者、manager → マネージャー など
  SALES_PHASES,                 // 7段階
  CLOSED_REASON_LABELS,
  getMatchingDisplayLabel,
} from "@/lib/status-labels";

<Badge variant={MATCHING_STATUS_VARIANTS[m.status]}>
  {MATCHING_STATUS_LABELS[m.status]}
</Badge>
```

### 2. 配信対象企業数のリアルタイム計算

```tsx
import { countTargetCompanies } from "@/lib/master-data";

const targetCount = countTargetCompanies(
  stats.company_counts_by_industry_phase,
  selectedIndustries,
  selectedSalesPhases
);
```

### 3. `/login` の AppShell バイパス

```tsx
// src/components/layout/conditional-layout.tsx
"use client";
const BARE_ROUTES = ["/login"];
const isBare = BARE_ROUTES.some(r => pathname.startsWith(r));
return isBare ? <>{children}</> : <AppShell>{children}</AppShell>;
```

### 4. URL クエリで初期フィルタ・コンテキスト・キャンセル戻り先

```tsx
const searchParams = useSearchParams();
const initialStatus = searchParams.get("status");
const companyHighlight = searchParams.get("company");
const from = searchParams.get("from");

// 「相談会作成」キャンセル時の戻り先制御
const handleCancel = () => {
  if (from === "dashboard") router.push("/");
  else if (from === "aggregate") router.push("/matchings/aggregate");
  else router.push("/sessions");
};
```

ダッシュボードからの遷移：
- 「すべての配信予定を見る →」→ `/cases?status=scheduled`
- 「相談会作成 →」→ `/sessions/new?company={id}&from=dashboard`
- 「すべての企業別集約を見る →」→ `/matchings/aggregate`

### 5. リアルタイム時計（TopBar）

```tsx
const [now, setNow] = useState(new Date());
useEffect(() => {
  const id = setInterval(() => setNow(new Date()), 60_000);
  return () => clearInterval(id);
}, []);
```

### 6. 現在ログインユーザー（staff.json から動的取得）

```tsx
// サイドバー、設定、チャットの送信者識別等で使用
const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
useEffect(() => {
  fetch("/mocks/staff.json")
    .then(r => r.json())
    .then((staff: Staff[]) => {
      const me = staff.find(s => s.id === "s_0001");
      if (me) setCurrentStaff(me);
    });
}, []);
```

`s_0001`（吉田航平）が「現在ログイン中」の前提。本実装では認証で動的取得。

### 7. 公開予定事例の編集モード切替

```tsx
const [isEditing, setIsEditing] = useState(false);

{!isEditing && <ReadOnlyBanner onEditClick={() => setIsEditing(true)} />}
{isEditing && <EditingBanner onCancelClick={() => setIsEditing(false)} />}
```

### 8. 公開済み事例の読み取り専用表示

```tsx
{status === "published" && (
  <div className="px-3 py-2 bg-muted rounded-md text-sm cursor-not-allowed">
    {format(new Date(publish_at), "yyyy年M月d日（EEE）HH:mm", { locale: ja })}
    <p className="text-xs text-muted-foreground">
      ※ 公開済みのため、配信日は変更できません
    </p>
  </div>
)}
```

### 9. ドーナツチャート 4分割集計

データ層も4状態で統一されているため、`stats.matchings_by_status` から直接取得：

```tsx
const breakdown = stats.matchings_by_status;
// { 待機中: 2, 要対応: 9, 開催準備中: 2, 終了: 2 }
```

### 10. マッチング画面のタブ統合

```tsx
const pathname = usePathname();
const currentView = pathname.includes("aggregate") ? "aggregate" : "individual";

<Tabs value={currentView}>
  <TabsList>
    <TabsTrigger value="individual" asChild>
      <Link href="/matchings">個別申請（{matchings.length}件）</Link>
    </TabsTrigger>
    <TabsTrigger value="aggregate" asChild>
      <Link href="/matchings/aggregate">企業別集約（{uniqueCompanies}社）</Link>
    </TabsTrigger>
  </TabsList>
</Tabs>
```

### 11. 列ヘッダークリックでのソート

```tsx
const [sortKey, setSortKey] = useState<string>("updated_at");
const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

const handleSort = (key: string) => {
  if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
  else { setSortKey(key); setSortDir("desc"); }
};

const sorted = [...items].sort((a, b) => {
  const va = a[sortKey], vb = b[sortKey];
  if (va === vb) return 0;
  return (va < vb ? -1 : 1) * (sortDir === "asc" ? 1 : -1);
});

<TableHead onClick={() => handleSort("updated_at")}>
  更新日 {sortKey === "updated_at" && (sortDir === "asc" ? <ArrowUp /> : <ArrowDown />)}
</TableHead>
```

実装画面：取り組み事例 / ユーザー / マッチング / 企業マスタ / 相談会。

### 12. 確認ダイアログパターン

ログアウトや admin ロール変更など、誤操作防止が必要な操作：

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="ghost">ログアウト</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>ログアウトしますか？</AlertDialogTitle>
      <AlertDialogDescription>
        現在の作業内容は保存されません。
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>キャンセル</AlertDialogCancel>
      <AlertDialogAction onClick={handleLogout}>
        ログアウトする
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

自分自身の admin → 非 admin 変更時にも同じパターン。

### 13. DatePicker の auto-close + 過去日 disabled

```tsx
const [open, setOpen] = useState(false);

<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger>...</PopoverTrigger>
  <PopoverContent>
    <Calendar
      mode="single"
      selected={date}
      onSelect={(d) => {
        setDate(d);
        setOpen(false);  // 自動クローズ
      }}
      disabled={(date) => date < startOfToday()}  // 過去日不可
    />
  </PopoverContent>
</Popover>
```

### 14. アーカイブ表示トグル（取り組み事例一覧）

```tsx
const [showArchived, setShowArchived] = useState(false);

const visibleCases = useMemo(() => {
  if (showArchived) return cases;
  return cases.filter(c => c.status !== "archived");
}, [cases, showArchived]);

<Switch checked={showArchived} onCheckedChange={setShowArchived} />
<Label>アーカイブも表示</Label>
```

---

## UI/UX 設計上の判断（重要）

事務局スタッフ（5〜10名、ITリテラシー中程度）の業務効率を優先し、**データ層と表示層を意図的に統一**しています。

### マッチングステータスの再定義

**Before（RFP §4-E 記載）**：3値
- 受付 / 相談会割当済 / クローズ

**After（提案・採用済み）**：4値
- 待機中 / 要対応 / 開催準備中 / 終了

#### この再定義を採用した理由

1. **業務的意味の明示**：「受付」より「**要対応**」の方が事務局スタッフが直感的に動ける
2. **しきい値の柔軟性**：`MATCHING_THRESHOLD = 4` を変更するだけで判定が更新される
3. **UI と データの一貫性**：画面表示と内部値が揃い、エンジニアの認知コストが下がる
4. **将来の拡張性**：別の表示軸（例：30日経過で「至急対応」）が必要になっても、UI 関数を拡張するだけ

### ユーザーとスタッフの分離

**Before（私の最初の設計）**：`users.json` に admin / manager / member ロールが混在

**After（RFP準拠）**：
- `users.json`：LINE ユーザー（企業名・役職・売上フェーズ表示、ロールなし）
- `staff.json`：事務局スタッフ（管理者/マネージャー/メンバー/閲覧のみ）

RFP §4-I, §4-J, §4-L 準拠。LINE ユーザーに事務局のロール概念は不要。

### 本実装への引き継ぎポイント

- バックエンド API はマッチングを **4状態**（待機中/要対応/開催準備中/終了）で返す
- 状態遷移ロジック：受付4件目で待機中→要対応へ自動遷移
- LINE ユーザーと事務局スタッフは別エンティティとして DB 設計
- 通知トリガー：「要対応」になった瞬間にメール等（サーバー側で同等の判定）

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
5. **しきい値到達検知**：マッチング受付が 4件目に到達した瞬間にダッシュボードへ反映する仕組み（Webhook/Polling）
6. **Cron**：`stats.json` の事前集計を定期再生成（実本番では DB 集計クエリ）
7. **アクセス制御**：role に応じた画面アクセス制限（管理者/マネージャー/メンバー/閲覧のみ）
8. **エラーハンドリング**：API エラー時のフォールバック UI

### パフォーマンス注意点

1. **`companies.json` の重さ**：3,135件で約2MB。ダッシュボード等では使わない
2. **/companies のページネーション**：50件/ページに制限済み。DB 実装後はサーバーサイド paging 推奨
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

Vercel にデプロイ済み：https://ynmo-admin.vercel.app/

---

## ライセンス・著作権

- 本プロトタイプ：受注先（YNMO チーム）に納品。再利用条件は別途契約に従う。
- 100億宣言企業データ：[中小企業庁公開リスト](https://growth-100-oku.smrj.go.jp/) 由来（公開データ）。

---

## ドキュメント一覧

| ファイル | 内容 |
|---|---|
| `README.md`（本書） | エンジニア向け実装メモ |
| `docs/01-screen-flows.md` | 画面遷移図（Mermaid） |
| `docs/02-component-states.md` | コンポーネント状態定義 |
| `docs/03-operations-manual.md` | 事務局向け操作マニュアル |
| `docs/progress.md` | 開発進捗ログ |
| `docs/proposal-status-redesign.md` | マッチングステータス再定義の設計提案 |

---

## 連絡先

- 受注者：キャプテンズ
- リード・実装：小野寺 香織（s_0002）
- 依頼側窓口：吉田 航平 様（s_0001）
