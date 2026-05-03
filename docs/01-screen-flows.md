# 画面遷移図｜YNMO 100億宣言支援AI 管理コンソール

主要3フローの画面遷移を Mermaid で記述。VSCode の Markdown プレビューで図として表示されます。

---

## 全体ナビゲーション

```mermaid
graph TD
  Login["ログイン<br/>(/login)"]
  Dash["ダッシュボード<br/>(/)"]

  CasesList["取り組み事例<br/>一覧 (/cases)"]
  CasesDetail["取り組み事例<br/>詳細 (/cases/:id)<br/>※状態別ロック有"]
  CasesNew["取り組み事例<br/>新規 (/cases/new)"]

  MatchList["マッチング<br/>個別申請 (/matchings)"]
  MatchAggr["マッチング<br/>企業別集約<br/>(/matchings/aggregate)<br/>※タブで切替可"]

  UsersList["ユーザー一覧<br/>(/users)"]
  UsersDetail["ユーザー詳細<br/>(/users/:id)"]

  Companies["認可企業マスタ<br/>(/companies)"]

  SessionsList["相談会一覧<br/>(/sessions)"]
  SessionsDetail["相談会詳細<br/>(/sessions/:id)"]

  Settings["設定<br/>(/settings)"]

  Login -->|SSO ログイン成功| Dash

  Dash -->|サイドバー| CasesList
  Dash -->|サイドバー| MatchList
  Dash -->|サイドバー| UsersList
  Dash -->|サイドバー| Companies
  Dash -->|サイドバー| SessionsList
  Dash -->|サイドバー| Settings

  Dash -->|"今後の配信予定<br/>カード"| CasesDetail
  Dash -->|"相談会調整開始<br/>「相談会作成」(直接)"| SessionsDetail
  Dash -->|"すべての企業別集約を見る →"| MatchAggr
  Dash -->|"直近の相談会"| SessionsDetail

  CasesList -->|"+ 新規追加"| CasesNew
  CasesList -->|行クリック| CasesDetail

  MatchList <-.->|"タブ切替"| MatchAggr
  MatchAggr -->|"相談会作成"| SessionsDetail

  UsersList -->|行クリック| UsersDetail
  UsersDetail -->|"配信履歴<br/>クリック"| CasesDetail
  UsersDetail -->|"マッチング履歴<br/>クリック"| MatchList

  Companies -->|"行クリック<br/>(外部 PDF)"| External["宣言PDF<br/>(別タブ)"]

  SessionsList -->|行クリック| SessionsDetail

  classDef priorityA fill:#1F4E79,color:#fff,stroke:#0F2A4A
  classDef priorityB fill:#FFE082,color:#5F4700,stroke:#FF9800
  classDef priorityC fill:#E0E0E0,color:#212121,stroke:#757575
  classDef external fill:#FFFFFF,color:#000,stroke:#999,stroke-dasharray: 5 5

  class Login,Dash,CasesList,CasesDetail,MatchList,MatchAggr priorityA
  class UsersList,UsersDetail,Companies priorityB
  class SessionsList,SessionsDetail,Settings priorityC
  class External external
```

凡例：
- 🔵 紺：優先度A（必須納品）
- 🟡 黄：優先度B（時間内対応）
- ⚪ 灰：優先度C（次フェーズ推奨）
- ⬜ 点線：外部リンク（別タブ）

---

## フロー1：取り組み事例レビュー

事務局員が、新しい事例（外部で作成した PDF）を配信予定として設定する流れ。

```mermaid
sequenceDiagram
  participant Staff as 事務局員
  participant Dash as ダッシュボード
  participant List as 取り組み事例一覧
  participant Editor as 詳細・編集画面
  participant API as モックデータ

  Note over Staff,API: 朝 出社・状況確認

  Staff->>Dash: 開く
  Dash->>API: stats.json 取得
  API-->>Dash: KPI / 配信予定 / 申込状況
  Dash-->>Staff: 配信予定3件カレンダー表示

  Note over Staff,API: 新規事例の登録

  Staff->>List: サイドバーから遷移
  List->>API: cases.json 取得
  API-->>List: 既存10件
  List-->>Staff: 一覧表示

  Staff->>Editor: 「+ 新規追加」
  Editor-->>Staff: 空のフォーム

  Staff->>Editor: PDFアップロード（プレースホルダー）
  Staff->>Editor: 配信予定日設定（DatePicker）
  Staff->>Editor: 配信先業界 multi-select
  Staff->>Editor: 配信先売上規模 multi-select
  Editor-->>Staff: 「配信対象：約 152 社」表示

  Staff->>Editor: 「公開予定として保存」
  Editor->>API: status="scheduled" + publish_at + targets
  API-->>Editor: 保存通知（toast）
  Editor->>List: 自動遷移
  List-->>Staff: 新規事例が「公開予定」で表示

  Note over Dash,API: 翌朝
  Staff->>Dash: 開く
  Dash-->>Staff: カレンダーに新しい配信予定がマーキング
```

---

## フロー2：相談会作成（マッチングしきい値到達）

マッチング申請が4件以上集まった企業について、事務局員が相談会を企画する流れ。

```mermaid
sequenceDiagram
  participant User as LINE ユーザー
  participant Bot as LINE Bot
  participant Dash as ダッシュボード
  participant Aggr as 集約ビュー
  participant SDetail as 相談会詳細
  participant Staff as 事務局員

  Note over User,Bot: ユーザー側（実装済み・既存）
  User->>Bot: 「コーリョー建販株式会社の話を聞きたい」
  Bot->>Dash: マッチング申請を pending で記録
  Note over Dash: 申請が4件目に到達 → threshold_flag=true

  Note over Staff,Aggr: 翌朝、事務局員が画面確認

  Staff->>Dash: 開く
  Dash-->>Staff: 「相談会調整開始企業一覧」に2社表示<br/>「コーリョー建販 5件、最古61日経過 ⚠」

  Staff->>Aggr: 「相談会作成 →」クリック
  Aggr-->>Staff: ?company=co_00001 でハイライト遷移

  Staff->>Aggr: 想定参加者を確認（5名のアバター）
  Staff->>Aggr: 「相談会作成」ボタン押下

  Note over Aggr,SDetail: プロトタイプ：alert で通知
  Note over Aggr,SDetail: 本実装：相談会レコード作成 → SDetail へ遷移

  Aggr->>SDetail: 相談会レコード作成（仮）
  SDetail-->>Staff: 基本情報・参加者リスト・Zoom URL

  Staff->>SDetail: 日時調整・Zoom URL 設定
  Staff->>SDetail: 「参加者にリマインド一斉送信」

  Note over User,SDetail: 当日
  User->>Bot: 相談会参加（実装済み・既存）
  SDetail-->>Staff: ステータスを「開催済」に更新
```

---

## フロー3：個別ユーザーへの連絡

特定のユーザーに対して、事務局員が個別に連絡を送る流れ。

```mermaid
sequenceDiagram
  participant Staff as 事務局員
  participant List as ユーザー一覧
  participant Detail as ユーザー詳細
  participant Chat as チャット式 push UI
  participant Bot as LINE Bot
  participant User as LINE ユーザー

  Note over Staff,List: 連絡したい相手を探す

  Staff->>List: サイドバーから遷移
  List->>List: 売上フェーズ「30〜50億」でフィルタ
  Staff->>List: 行クリック「田中健太」

  List->>Detail: /users/u_0003 へ遷移
  Detail-->>Staff: プロフィール・履歴タブ・チャット式UI

  Staff->>Detail: 配信履歴タブ確認
  Detail-->>Staff: 過去配信した事例3件

  Staff->>Detail: マッチング申請履歴タブ確認
  Detail-->>Staff: 申請2件、承認1件

  Note over Staff,Chat: チャット式 push 送信

  Staff->>Chat: メッセージ入力<br/>「田中様、新しいマッチング先候補です」
  Staff->>Chat: 「送信」or Cmd+Enter
  Chat->>Chat: 楽観的UIに即追加
  Chat-->>Staff: toast「送信しました」

  Note over Chat,User: 本実装での動作
  Chat->>Bot: メッセージを LINE Bot 経由で配信
  Bot->>User: LINE プッシュ通知
  User->>Bot: 返信
  Bot->>Chat: 返信メッセージを記録
  Chat-->>Staff: 次回画面表示時に履歴更新
```

---

## URL クエリパラメータ規約

| URL | クエリ | 用途 |
|---|---|---|
| `/cases` | `?status=scheduled` | ステータス絞込で初期表示 |
| `/matchings/aggregate` | `?company=co_xxxxx` | 特定企業のハイライト |
| `/sessions/new` | `?company=co_xxxxx&from=dashboard` | 企業を pre-fill、キャンセル戻り先を制御 |
| `/sessions/new` | `?from=aggregate` | 集約ビューから新規作成、キャンセルで戻る |
| `/users` | `?phase=04` | 売上フェーズで絞込 |
| `/companies` | `?industry=製造業&prefecture=東京都` | 業種・地域で絞込 |

### キャンセル戻り先制御

`?from=` パラメータで遷移元を記録し、キャンセル時に適切な画面へ戻る：
- `?from=dashboard` → ダッシュボードへ戻る
- `?from=aggregate` → 企業別集約ビューへ戻る
- 指定なし → 該当一覧画面へ戻る

---

## 状態別ロックの遷移

### 取り組み事例の状態遷移

```mermaid
stateDiagram-v2
  [*] --> draft : 新規作成
  draft --> scheduled : 配信日設定して保存
  scheduled --> published : 配信日に自動公開
  published --> archived : アーカイブ操作
  archived --> draft : アーカイブ解除

  draft : 下書き<br/>編集自由
  scheduled : 公開予定<br/>読み取り↔編集モード切替
  published : 公開中<br/>完全ロック（変更不可）
  archived : アーカイブ<br/>完全ロック（解除可能）
```

### 相談会の状態遷移

```mermaid
stateDiagram-v2
  [*] --> scheduled : 新規作成（マッチング集約から）
  scheduled --> completed : 開催完了
  scheduled --> cancelled : キャンセル
  cancelled --> [*] : 再開不可<br/>（新規作成のみ）

  scheduled : 開催予定<br/>編集可
  completed : 開催済<br/>編集可（記録更新）
  cancelled : 中止<br/>完全ロック・再開不可
```

---

## サイドバー構造

```
[ロゴ + ユーザープロフィール]
─────────────────────────
■ メイン
  📊 ダッシュボード
  📄 取り組み事例
  🤝 マッチング申請

■ 運用管理
  📅 相談会
  👤 ユーザー
  🏢 認可企業マスタ

■ システム
  ⚙️ 設定
─────────────────────────
[ログアウト]
```

サイドバーは `/login` でのみ非表示（ConditionalLayout で制御）。
