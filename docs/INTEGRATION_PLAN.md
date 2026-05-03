# 100億宣言支援AI 管理コンソール 統合実装計画

最終更新：2026-05-03 / 著者：吉田航平 (s_0001)

本書は、現状 UI プロトタイプである `ynmo-admin` を本実装化し、本番稼働中の LINE Bot (`line-mvp-api`) と同じ Azure MySQL Flexible Server（`linemvp`）を共有しながら独立稼働させるまでの手順書である。

---

## 0. 前提とゴール

### 既存スタック

| 項目 | Bot (`line-mvp-api`) | 管理画面 (`ynmo-admin`) |
|---|---|---|
| ランタイム | Node.js 20 + Express | Node.js 20 + Next.js 16 (App Router) |
| 言語 | JavaScript (CommonJS) | TypeScript (strict) |
| DB | Azure MySQL Flexible Server (`linemvp`) | （未接続。本計画で接続する） |
| デプロイ | App Service `tech0-gen-11-step4-node-3` | （未デプロイ。本計画で新設する） |
| 認証 | LINE 署名検証のみ | （未実装。本計画で Easy Auth を入れる） |
| CI/CD | GitHub Actions（main push で自動デプロイ） | （未設定。本計画で新設する） |

### 確定した統合方針

1. **デプロイ構成**：別 App Service に独立デプロイ。Bot と管理画面はプロセス・リポジトリとも分離する
2. **DB アクセス**：管理画面側にも `mysql2/promise` の pool を持ち、同じ Azure MySQL に直接接続する。env 変数名は Bot 側と揃える
3. **認証**：App Service 組み込みの Easy Auth + Microsoft Entra ID で、テナント内ユーザーのみアクセス可能にする。staff テーブルとの突合で role ベース制御を Next.js 側に実装する

### 非ゴール（このフェーズではやらない）

- Bot 側 (`line-mvp-api`) のコード変更
- ORM (Prisma 等) 導入
- マイクロサービス化、API Gateway 導入
- フロントエンドの SSR / ISR 高度活用（Route Handlers と CSR で十分）

---

## 1. リポジトリ切り出し（GitHub 新規リポ作成）

現状 `ynmo-admin-main` はローカルにのみ存在する。Bot とは別リポにして独立 CI/CD を回す。

### 手順

1. GitHub で新規プライベートリポを作成：`ysdthai0414/ynmo-admin`
2. ローカルのフォルダ名を `ynmo-admin-main` → `ynmo-admin` に変更（任意）
3. リポ初期化と push

```bash
cd C:\Users\ysdys\OneDrive\デスクトップ\ynmo-admin-main\ynmo-admin-main
git init
git add .
git commit -m "initial commit: UI prototype handover from キャプテンズ"
git branch -M main
git remote add origin https://github.com/ysdthai0414/ynmo-admin.git
git push -u origin main
```

4. Bot 側の `HANDOVER.md` / `RFP_admin_console.md` / `DESIGN_BRIEF_admin_console.md` のうち管理画面に関係する章を、本リポ `docs/` にコピーする（Bot 側は出典として残す）

### `.gitignore` 追加項目

既存の `.gitignore` に以下を追加：

```
.env
.env.local
.env.production.local
.env.development.local
.next/
out/
*.log
```

---

## 2. 環境変数の整理

### Bot 側で使っている env（コピー元）

`line-mvp-api/.env.example` で定義済み：

```
MYSQL_HOST=...
MYSQL_PORT=3306
MYSQL_USER=...
MYSQL_PASSWORD=...
MYSQL_DATABASE=linemvp
MYSQL_SSL=true
```

### 管理画面側 `.env.local`（ローカル開発用）

ルート直下に作成：

```
# DB（Bot と同じ値を入れる）
MYSQL_HOST=...
MYSQL_PORT=3306
MYSQL_USER=...
MYSQL_PASSWORD=...
MYSQL_DATABASE=linemvp
MYSQL_SSL=true

# ローカル開発時の認証バイパス（true なら staff[0] でログイン扱い）
DEV_AUTH_BYPASS=true
DEV_AUTH_BYPASS_EMAIL=k.yoshida@office-gensen.jp
```

### `.env.example` を作って同じ内容（値抜き）をリポにコミット

---

## 3. DB 接続レイヤ実装

### 3-1. 依存追加

```bash
npm install mysql2
npm install -D @types/node
```

### 3-2. `src/lib/db.ts` 新規作成

Bot 側 `src/db.js` の lazy pool パターンを TypeScript で踏襲する：

```ts
import mysql, { Pool, PoolOptions, RowDataPacket } from "mysql2/promise";

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const options: PoolOptions = {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: true } : undefined,
    connectionLimit: 10,
    namedPlaceholders: true,
  };
  pool = mysql.createPool(options);
  return pool;
}

export async function query<T extends RowDataPacket>(
  sql: string,
  params?: Record<string, unknown> | unknown[]
): Promise<T[]> {
  const [rows] = await getPool().execute<T[]>(sql, params);
  return rows;
}

export async function execute(
  sql: string,
  params?: Record<string, unknown> | unknown[]
): Promise<{ affectedRows: number; insertId: number }> {
  const [result] = await getPool().execute(sql, params);
  return result as { affectedRows: number; insertId: number };
}
```

### 3-3. `src/types/db.ts` でテーブル型を定義

Bot 側 `db/schema.sql` を見て、管理画面で使うテーブルだけ TypeScript 型化する：

```ts
import { RowDataPacket } from "mysql2";

export interface MatchingRequestRow extends RowDataPacket {
  id: number;
  initiative_id: number;
  applicant_user_id: string;
  target_company_id: number;
  status: "pending" | "queued_for_event" | "closed";
  closed_reason: string | null;
  message: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface InitiativeRow extends RowDataPacket {
  id: number;
  title: string;
  status: "draft" | "published";
  publish_at: Date | null;
  pdf_url: string | null;
  // ... 他のカラム
}

// Users / Profiles / ApprovedCompanies / DeliveryLog 等も同様
```

### 3-4. UI 側ステータスとの変換ユーティリティ

UI は 4値 (`待機中`/`要対応`/`開催準備中`/`終了`)、DB は 3値 (`pending`/`queued_for_event`/`closed`) で異なる。`docs/proposal-status-redesign.md` の方針に従って変換層を作る：

`src/lib/matching-status.ts`：

```ts
const MATCHING_THRESHOLD = 4;

export function toUIStatus(
  dbStatus: "pending" | "queued_for_event" | "closed",
  companyTotalCount: number,
  closedReason: string | null
): "待機中" | "要対応" | "開催準備中" | "終了" {
  if (dbStatus === "closed") return "終了";
  if (dbStatus === "queued_for_event") return "開催準備中";
  // dbStatus === "pending"
  return companyTotalCount >= MATCHING_THRESHOLD ? "要対応" : "待機中";
}
```

---

## 4. API Route Handlers 実装

UI 側が現在 fetch している `public/mocks/*.json` のレスポンス形を踏襲して、置き換え可能にする。

### 4-1. ファイル配置

```
src/app/api/
├── matchings/
│   ├── route.ts              # GET 一覧 / POST 新規（無いなら省略）
│   └── [id]/route.ts         # GET 詳細 / PATCH ステータス更新
├── initiatives/
│   ├── route.ts              # GET 一覧 / POST 新規
│   └── [id]/route.ts         # GET 詳細 / PATCH 編集 / DELETE
├── users/
│   ├── route.ts
│   └── [id]/route.ts
├── companies/route.ts
├── stats/route.ts
└── me/route.ts               # 現在ログイン中スタッフ情報（Easy Auth 連携）
```

### 4-2. 例：`src/app/api/matchings/route.ts`

```ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { toUIStatus } from "@/lib/matching-status";
import type { MatchingRequestRow } from "@/types/db";
import { requireStaff } from "@/lib/auth";

export async function GET(request: Request) {
  await requireStaff(request);  // 未認証なら 401

  const rows = await query<MatchingRequestRow>(`
    SELECT
      m.id, m.initiative_id, i.title AS case_title,
      m.applicant_user_id, p.profile_json,
      m.target_company_id, c.name AS target_company_name,
      m.status, m.closed_reason, m.message,
      m.created_at, m.updated_at,
      (SELECT COUNT(*) FROM MatchingRequests m2
       WHERE m2.target_company_id = m.target_company_id
         AND m2.status != 'closed') AS company_total_count
    FROM MatchingRequests m
    LEFT JOIN Initiatives i ON i.id = m.initiative_id
    LEFT JOIN Profiles p ON p.line_user_id = m.applicant_user_id
    LEFT JOIN ApprovedCompanies c ON c.id = m.target_company_id
    ORDER BY m.updated_at DESC
  `);

  const result = rows.map((r) => ({
    id: `m_${String(r.id).padStart(4, "0")}`,
    case_id: `case_${String(r.initiative_id).padStart(4, "0")}`,
    case_title: r.case_title,
    // ... profile_json から applicant_* を展開
    company_total_count: Number((r as any).company_total_count),
    status: toUIStatus(r.status, Number((r as any).company_total_count), r.closed_reason),
    closed_reason: r.closed_reason,
    message: r.message,
    created_at: r.created_at.toISOString(),
    updated_at: r.updated_at.toISOString(),
  }));

  return NextResponse.json(result);
}
```

### 4-3. 例：`src/app/api/matchings/[id]/route.ts`（PATCH）

```ts
import { NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await requireStaff(request, ["admin", "manager"]);
  const { id } = await params;
  const body = await request.json();

  const numericId = Number(id.replace(/^m_/, ""));
  // status を DB 値に逆変換
  const dbStatus =
    body.status === "終了" ? "closed" :
    body.status === "開催準備中" ? "queued_for_event" : "pending";

  await execute(
    `UPDATE MatchingRequests
     SET status = :status, closed_reason = :reason, updated_at = NOW()
     WHERE id = :id`,
    { status: dbStatus, reason: body.closed_reason ?? null, id: numericId }
  );

  // 監査ログテーブルがあれば staff.id を記録
  return NextResponse.json({ ok: true });
}
```

### 4-4. KPI 集計：`src/app/api/stats/route.ts`

`stats.json` 相当の集計を SQL で生成する。負荷が問題になったら `linemvp.Stats` のような事前集計テーブル + cron に切り替える（RFP の「Cron」要件）。

---

## 5. UI 側を mock → 実 API に切替

各画面で `fetch("/mocks/*.json")` の箇所を `fetch("/api/...")` に置換する。

### 影響ファイル一覧（grep 想定）

```
src/app/page.tsx                     → /api/stats
src/app/cases/page.tsx               → /api/initiatives
src/app/cases/[id]/page.tsx          → /api/initiatives/[id]
src/app/cases/new/page.tsx           → POST /api/initiatives
src/app/matchings/page.tsx           → /api/matchings
src/app/matchings/aggregate/page.tsx → /api/matchings/aggregate
src/app/users/page.tsx               → /api/users
src/app/users/[id]/page.tsx          → /api/users/[id]
src/app/companies/page.tsx           → /api/companies
src/app/sessions/...                 → （Sessions テーブル新設が必要。後述）
src/components/layout/sidebar.tsx    → /api/me
```

### 段階的移行戦略

各 `fetch()` コールに薄いラッパーを噛ませて、env で切り替えられるようにすると安全：

```ts
// src/lib/api-client.ts
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function getMatchings() {
  return fetch(USE_MOCK ? "/mocks/matchings.json" : "/api/matchings")
    .then((r) => r.json());
}
```

ローカル開発の早い段階から本物の DB を見れるようにし、`.env.local` を切り替えればモックにも戻せる構成にする。

---

## 6. 認証実装（Easy Auth + Entra ID）

### 6-1. Azure ポータル側の設定（App Service 作成後）

1. App Service > 設定 > 認証 > 認証プロバイダーの追加
2. プロバイダー：Microsoft（Entra ID）
3. アプリ登録：「新しいアプリ登録を作成する」
4. サポート対象アカウント：「現在のテナントのみ」
5. クライアント シークレット：「ID プロバイダーが作成」
6. 認証されていない要求の制限：「認証が必要」
7. リダイレクト先：HTTP 302（Microsoft）

これでアプリには **Entra ID テナント内ユーザーしかアクセスできない**状態になる。

### 6-2. Next.js 側でユーザー情報を読む

Easy Auth 経由のアクセスでは、各リクエストに以下のヘッダが自動で付く：

- `X-MS-CLIENT-PRINCIPAL-NAME` … メールアドレス
- `X-MS-CLIENT-PRINCIPAL-ID` … Entra ID オブジェクト ID
- `X-MS-CLIENT-PRINCIPAL` … Base64 エンコードされた JSON（claims 込み）

`src/lib/auth.ts` を新規作成：

```ts
import { headers } from "next/headers";
import { query } from "./db";
import type { RowDataPacket } from "mysql2";

interface StaffRow extends RowDataPacket {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "member" | "viewer";
  status: "active" | "inactive";
}

export async function getCurrentStaff() {
  const h = await headers();

  // ローカル開発バイパス
  if (process.env.DEV_AUTH_BYPASS === "true") {
    const email = process.env.DEV_AUTH_BYPASS_EMAIL!;
    const rows = await query<StaffRow>(
      "SELECT * FROM Staff WHERE email = :email AND status = 'active'",
      { email }
    );
    return rows[0] ?? null;
  }

  const email = h.get("x-ms-client-principal-name");
  if (!email) return null;

  const rows = await query<StaffRow>(
    "SELECT * FROM Staff WHERE email = :email AND status = 'active'",
    { email }
  );
  return rows[0] ?? null;
}

export async function requireStaff(
  _request: Request,
  allowedRoles?: Array<StaffRow["role"]>
) {
  const staff = await getCurrentStaff();
  if (!staff) {
    throw new Response("Unauthorized", { status: 401 });
  }
  if (allowedRoles && !allowedRoles.includes(staff.role)) {
    throw new Response("Forbidden", { status: 403 });
  }
  return staff;
}
```

### 6-3. Staff テーブルの新設

Bot 側 DB にはまだ Staff テーブルがない。次のマイグレーションを Bot 側 `db/` に追加して両側で共有：

```sql
CREATE TABLE IF NOT EXISTS Staff (
  id           VARCHAR(16) PRIMARY KEY,            -- "s_0001" 形式
  email        VARCHAR(255) NOT NULL UNIQUE,
  name         VARCHAR(64) NOT NULL,
  name_kana    VARCHAR(128),
  role         ENUM('admin','manager','member','viewer') NOT NULL DEFAULT 'member',
  department   VARCHAR(64),
  status       ENUM('active','inactive') NOT NULL DEFAULT 'active',
  last_login_at DATETIME,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO Staff (id, email, name, role, department, status)
VALUES
  ('s_0001', 'k.yoshida@office-gensen.jp', '吉田 航平', 'admin', '事務局統括', 'active');
```

### 6-4. ロールベース UI 制御

`src/components/layout/sidebar.tsx` で `/api/me` から取得した role により表示メニューを出し分ける（`viewer` には設定画面非表示、など）。

---

## 7. Azure App Service 作成 & GitHub Actions

### 7-1. App Service 作成（Azure ポータル）

- リソースグループ：Bot と同じ
- 名前：`tech0-gen-11-step4-node-3-admin`（または同等の命名規則）
- ランタイム：Node 20 LTS
- OS：Linux
- リージョン：Bot と同じ
- App Service プラン：既存プラン共有 or 新規 Basic B1

### 7-2. Application settings に env を投入

Azure ポータル > 構成 > アプリケーション設定 で以下を追加：

```
MYSQL_HOST           = Bot と同値
MYSQL_PORT           = 3306
MYSQL_USER           = Bot と同値
MYSQL_PASSWORD       = Bot と同値（Key Vault 参照推奨）
MYSQL_DATABASE       = linemvp
MYSQL_SSL            = true
NODE_ENV             = production
WEBSITE_NODE_DEFAULT_VERSION = ~20
```

`DEV_AUTH_BYPASS` は **本番には絶対に入れない**。

### 7-3. 起動コマンド

Azure ポータル > 構成 > 全般設定 > スタートアップ コマンド：

```
npm run start
```

`package.json` の `"start": "next start"` がそのまま使える。

### 7-4. GitHub Actions ワークフロー

`.github/workflows/deploy-admin.yml` を新規作成。Bot 側ワークフロー (`main_tech0-gen-11-step4-node-3.yml`) を雛形にする：

```yaml
name: Build and deploy ynmo-admin to Azure Web App

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: node-app
          path: |
            .next
            public
            package.json
            package-lock.json
            next.config.ts

  deploy:
    runs-on: ubuntu-latest
    needs: build
    environment:
      name: 'Production'
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: node-app
      - uses: azure/webapps-deploy@v3
        with:
          app-name: 'tech0-gen-11-step4-node-3-admin'
          slot-name: 'Production'
          publish-profile: ${{ secrets.AZUREAPPSERVICE_PUBLISHPROFILE_ADMIN }}
```

### 7-5. publish profile を GitHub Secrets に登録

1. Azure ポータルで `tech0-gen-11-step4-node-3-admin` の「発行プロファイルの取得」
2. GitHub リポ > Settings > Secrets and variables > Actions > New repository secret
3. Name: `AZUREAPPSERVICE_PUBLISHPROFILE_ADMIN`、Value: ダウンロードした XML 全文

---

## 8. CORS と LINE Bot との連携

### 8-1. CORS

管理画面と Bot は別オリジンになるが、**管理画面側はブラウザから自分の Route Handlers を叩くだけ**で Bot の API は呼ばないので、当面 CORS 設定は不要。

### 8-2. LINE 個別 push の実送信

UI のチャット式 push は、現状「楽観的更新のみ」。本実装では2案：

- **案1（推奨）**：管理画面側 Route Handler `POST /api/users/[id]/push` から、`@line/bot-sdk` を使って直接 LINE API を叩く（Bot 側コード非依存、env に LINE_CHANNEL_ACCESS_TOKEN 追加）
- **案2**：Bot 側に `POST /internal/push` を生やしてそこから送る（Bot 側変更が必要）

LINE_CHANNEL_ACCESS_TOKEN を共有するだけで実現できる案1が良い。

---

## 9. 移行フェーズ計画

| フェーズ | 内容 | 完了条件 |
|---|---|---|
| Phase 0 | リポ切り出し + GitHub 公開 | `git push` 完了 |
| Phase 1 | DB 接続 + 型定義 + `/api/me` のみ実装 | `curl http://localhost:3000/api/me` でスタッフ情報が返る |
| Phase 2 | 読み取り API（matchings, initiatives, users, companies, stats）実装 | mock からの fetch 切替で全画面が DB データで描画される |
| Phase 3 | 書き込み API（matching ステータス更新、initiative 編集 / status 切替）実装 | UI からの編集が DB に反映される |
| Phase 4 | Staff テーブル新設 + Easy Auth 設定 + ロール制御 | テナント外ユーザーがアクセス不可、role に応じてメニュー出し分け |
| Phase 5 | Azure App Service 作成 + GitHub Actions 自動デプロイ | main push で自動デプロイされ、本番 URL で動作 |
| Phase 6 | LINE 個別 push 実送信 | 管理画面のチャット送信ボタンで実際にユーザーに届く |
| Phase 7 | しきい値到達検知 + 通知 + PDF アップロード + Cron 集計 + LINE displayName 取得 | RFP 残課題対応 |

### Phase 7 詳細：後回しにしている改善

- **しきい値到達検知**：MatchingRequests のカウントが `MATCHING_THRESHOLD = 4` を超えたタイミングで事務局に通知
- **PDF アップロード**：`/cases/new` の PDF を Azure Blob Storage 等に保存して `Initiatives.detail_url` に格納
- **Cron 集計**：`stats.json` 相当の事前集計を定期再生成
- **LINE displayName 取得 + 代表者氏名フロー**（2026-05-03 追加）
  - Bot 側オンボーディングで `client.getProfile(lineUserId)` を呼んで `displayName` を取得
  - 「代表取締役 ○○ 様でよろしいですか？」と確認 quick reply を出す
  - PK（postback）押下で `Users` テーブルに `display_name` カラムへ確定値を格納
  - 管理画面の `/api/users` を `display_name` を返すように改修（現在は placeholder の「LINEユーザー XXXX」）
  - 必要に応じて Users スキーマに `display_name VARCHAR(64) NULL` を追加するマイグレーションを発行

各 Phase ごとに main にマージしてデプロイし、段階的に確認していく。Phase 4 で Easy Auth が入るまでは、App Service 側を **Access Restrictions で IP 許可リスト化** して暫定保護する。

---

## 10. 既知の懸念とリスク

1. **`companies.json` 約2MB問題** … DB 側でページネーション必須（`/api/companies?page=1&limit=50`）。UI 側も既に 50件/ページ実装済みで適合する
2. **Sessions テーブルが Bot 側に未定義** … Phase 2 着手前に `db/schema.sql` に `Sessions` / `SessionAttendees` を追加。Bot 側で使わないテーブルだが、schema は単一の真実とする
3. **マッチング 3値 ↔ 4値の変換** … 「待機中 / 要対応」は `closed_reason` ではなく **動的 SQL カウント**で判定する。DB スキーマ変更は不要
4. **ローカルから Azure MySQL への接続** … 開発者の IP を MySQL Flexible Server のファイアウォールに追加する必要あり。`az mysql flexible-server firewall-rule create` または Azure ポータルから追加
5. **デプロイ時のダウンタイム** … Next.js は `next start` 起動なので App Service の標準デプロイで十数秒の停止が発生する。気になるなら deployment slot を使う

---

## 11. 参照ドキュメント

- `docs/01-screen-flows.md` … 画面遷移
- `docs/02-component-states.md` … コンポーネント状態
- `docs/03-operations-manual.md` … 事務局向け操作マニュアル
- `docs/proposal-status-redesign.md` … マッチングステータス再定義の根拠
- Bot 側 `HANDOVER.md` … Bot 現状仕様
- Bot 側 `RFP_admin_console.md` … 管理画面 RFP 全文
- Bot 側 `db/schema.sql` … DB スキーマ（single source of truth）
