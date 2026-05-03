# コンポーネント状態定義書｜YNMO 100億宣言支援AI 管理コンソール

各 UI コンポーネントの状態（hover / focus / disabled / loading / error / success / locked）を定義。
実装は `src/components/ui/` 配下の shadcn/ui コンポーネントをベースとし、デザイントークン（`globals.css`）で制御。

---

## 共通：状態の意味

| 状態 | トリガ | 視覚的な変化 |
|---|---|---|
| **default** | 通常 | ベースのスタイル |
| **hover** | マウスオーバー | 微妙に明度・透明度変化 |
| **focus** | キーボード操作（Tab） | リング表示 (focus-visible) |
| **active** | 押下中（押した瞬間） | スケール 0.98 程度に縮小 |
| **disabled** | 無効化（非クリック） | 透明度50%、cursor: not-allowed |
| **locked** | 状態によりロック（編集不可） | グレーアウト + 注釈表示 |
| **loading** | 非同期処理中 | スピナーまたはスケルトン |
| **error** | バリデーション失敗・通信エラー | 赤系のアウトライン |
| **success** | 完了通知 | 緑系の表示・toast |

トークンは `globals.css` の `:root` に定義され、`bg-primary`, `text-destructive` 等のクラス経由で適用。

---

## 1. Button（ボタン）

| variant | 用途 | base | hover | active | disabled |
|---|---|---|---|---|---|
| `default` | 主要アクション | bg-primary text-primary-foreground | bg-primary/90 | scale-95 | opacity-50 |
| `secondary` | 副次アクション | bg-secondary text-secondary-foreground | bg-secondary/80 | scale-95 | opacity-50 |
| `destructive` | 削除・キャンセル | bg-destructive text-destructive-foreground | bg-destructive/90 | scale-95 | opacity-50 |
| `outline` | 中立的アクション | border bg-background | bg-accent | scale-95 | opacity-50 |
| `ghost` | アイコンボタン等 | (透明) | bg-accent | scale-95 | opacity-50 |
| `link` | リンク風 | text-primary underline-offset-4 | underline | – | opacity-50 |

### loading 状態
ボタン内に `Loader2` アイコン（spin animation） + テキスト「読み込み中...」「保存中...」など。
disabled 化して二重押下防止。

```tsx
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="size-4 animate-spin mr-2" />}
  {isLoading ? "保存中..." : "保存"}
</Button>
```

---

## 2. Input / Textarea（テキスト入力）

| 状態 | 視覚 |
|---|---|
| **default** | border-input、bg-background、`text-sm` |
| **focus** | ring-2 ring-ring ring-offset-2（focus-visible:ring-2 ring-ring） |
| **disabled** | opacity-50 cursor-not-allowed bg-muted |
| **error** | border-destructive ring-destructive/30 |

エラー時の表示：
```tsx
<Input className={cn(error && "border-destructive ring-destructive/30")} />
{error && <p className="text-sm text-destructive mt-1">{error}</p>}
```

プレースホルダー：text-muted-foreground

---

## 3. Select / Combobox（選択）

| 状態 | 視覚 |
|---|---|
| **default** | border、bg-background、トリガに ChevronDown |
| **open** | ボーダーが ring 化、ドロップダウン表示 |
| **selected** | bg-accent text-accent-foreground |
| **disabled** | opacity-50 |

ドロップダウン項目の hover：bg-accent
選択中のチェックマーク：右に Check アイコン

---

## 4. Checkbox / Switch（トグル）

### Checkbox
| 状態 | 視覚 |
|---|---|
| **unchecked** | border、bg-background |
| **checked** | bg-primary、Check アイコン白 |
| **focus** | ring-2 |
| **disabled** | opacity-50 |

### Switch
| 状態 | 視覚 |
|---|---|
| **off** | bg-input |
| **on** | bg-primary、サムが右へスライド（200ms） |
| **focus** | ring-2 |

---

## 5. Card（カード）

### 通常カード
| 状態 | 視覚 |
|---|---|
| **default** | bg-card border rounded-lg shadow-sm |
| **hover**（クリック可能の場合） | shadow-md transition-shadow |
| **selected** | ring-2 ring-primary |

### KPI カード
4枚構成、各カードに：
- アイコン（左、`size-12 rounded-lg bg-{color}/10`）
- ラベル（小、`text-xs uppercase tracking-wider text-muted-foreground`）
- 大きな数字（`text-3xl font-bold tracking-tight`）
- 変化率（小、`text-xs text-success`、**「前月比 +N」**形式）

**4枚目の反転スタイル**（要対応の強調）：
- カード背景：`bg-primary text-primary-foreground`
- アイコン背景：`bg-white/15`、アイコン色：白
- 変化率：`text-primary-foreground/80`、表記「現在の要対応件数」

---

## 6. Badge（バッジ）

ステータス表示用。`MATCHING_STATUS_VARIANTS` などのマッピング経由で variant を動的に決定。

| variant | 用途 | 配色 |
|---|---|---|
| `default` | 主要 / 公開中 | bg-primary text-primary-foreground |
| `secondary` | クローズ / アーカイブ | bg-secondary text-secondary-foreground |
| `destructive` | キャンセル / エラー | bg-destructive text-destructive-foreground |
| `outline` | 公開予定 / 補助 | border text-foreground |
| `success` | 確認済み / 開催準備中 | bg-success/15 text-success border-success/30 |
| `warning` | 受付 / 確認待ち / 要対応 | bg-warning/15 text-warning border-warning/30 |
| `info` | 情報 / 配信開封 | bg-info/15 text-info border-info/30 |

ステータス値ごとの variant マッピング：
- 取り組み事例：draft → secondary、scheduled → outline、published → default、archived → secondary
- マッチング：受付 → warning、相談会割当済 → success、クローズ → secondary
- ユーザー：NEW → default、AWAITING_CONFIRM → warning、CONFIRMED → success

---

## 7. Toast（通知）

| variant | 用途 | 配色 |
|---|---|---|
| `default` | 一般通知 | bg-background |
| `success` | 保存完了等 | bg-success text-white |
| `destructive` | エラー | bg-destructive text-white |

表示時間：4秒（`duration: 4000`）
位置：bottom-right
最大同時表示：3件、超えたら古いものが消える

---

## 8. Modal / AlertDialog（モーダル）

| パーツ | スタイル |
|---|---|
| Overlay | bg-black/50 backdrop-blur-sm fixed inset-0 |
| Content | bg-background border rounded-lg shadow-lg max-w-md p-6 |
| Title | text-lg font-semibold |
| Description | text-sm text-muted-foreground |
| Actions | flex gap-2 justify-end |

確認系モーダル：「キャンセル」（outline）+ 「{動作}」（destructive or default）の2ボタン

---

## 9. Loading（ローディング）

### Skeleton
- bg-muted animate-pulse rounded
- リスト：行ごとに 16px 高、間隔 8px
- カード：100px 高 × カードサイズ
- テキスト：複数行（80%幅、60%幅、40%幅）でリアル感

### Spinner
- Loader2 アイコン + animate-spin
- 中央寄せ、size 24px
- 補助テキスト：text-sm text-muted-foreground「読み込み中...」

---

## 10. Empty State（空の状態）

各セクションが0件のとき。**ポジティブな印象**を意識。

| 場所 | アイコン | 文言 |
|---|---|---|
| 取り組み事例 一覧 | `FileText` | 「まだ取り組み事例がありません。新規追加してみましょう」+ 「+ 新規追加」ボタン |
| マッチング個別申請 | `Inbox` | 「該当する申請がありません」 |
| **相談会調整開始企業（0件時）** | `CheckCircle`（緑）| 「現在、調整が必要な案件はありません ✓ お疲れ様です！」 |
| ユーザー一覧 | `Users2` | 「該当するユーザーがいません」 |
| 認可企業マスタ | `Building2` | 「条件に該当する企業がありません」 |
| 相談会一覧 | `Calendar` | 「相談会がまだ登録されていません」 |

---

## 11. Error State（エラー状態）

### バリデーションエラー（フォーム）
- 該当 Input の border を destructive に
- 下に小さな赤テキストで具体的なエラー文：
  - 「配信予定日は必須です」
  - 「業界を1つ以上選択してください」
- form トップに集約エラー表示は不要（インラインで十分）

### 通信エラー（fetch失敗等）
- セクション全体に表示：
  ```
  ⚠ データの読み込みに失敗しました
  しばらくたってから再度お試しください
  [再試行] ボタン
  ```
- bg-destructive/5 border border-destructive/20 rounded-lg p-4

---

## 12. Success State（成功状態）

### Toast
- 緑色背景 + Check アイコン
- 「保存しました」「送信しました」など簡潔な完了文言
- 4秒で自動消滅

---

## 13. Sidebar（サイドバー）

| 状態 | 視覚 |
|---|---|
| **default** | bg-sidebar text-sidebar-foreground/70 |
| **hover** | bg-sidebar-accent/50 text-sidebar-foreground |
| **active**（現在のページ） | border-l-4 border-sidebar-primary、font-medium |
| **collapsed**（折りたたみ時） | icon のみ表示、tooltip でラベル |

折りたたみアニメーション：transform translate-x、200ms ease-in-out

### サイドバープロフィール（上部）
- Avatar：`size-16`、`AvatarImage` + `AvatarFallback`（背景 sidebar-primary、文字「小」）
- 名前：`text-sm font-semibold`、中央寄せ
- ロールバッジ：`bg-sidebar-primary/20 text-sidebar-primary-foreground text-xs px-2 py-0.5 rounded-full`

### ナビゲーショングループ
3グループに分割：
- **メイン**：ダッシュボード / 取り組み事例 / マッチング申請
- **運用管理**：相談会 / ユーザー / 認可企業マスタ
- **システム**：設定

各 SidebarGroupLabel：`text-xs uppercase tracking-wider text-sidebar-foreground/50`

### フッター
「ログアウト」リンク（LogOut アイコン + テキスト）のみ。
**プロフィール / 設定リンクは置かない**（TopBar からも辿れる、サイドバーはシンプル維持）。

---

## 14. TopBar（トップバー）

刷新済みの構成：

```
[SidebarTrigger] [Separator] [Breadcrumb slot]   ⋯⋯⋯⋯   [YNMO 管理コンソール] [時計] [Bell]
```

| パーツ | スタイル |
|---|---|
| **左側** | SidebarTrigger + 縦 Separator + パンくず slot |
| **ブランドテキスト** | `text-sm font-medium text-muted-foreground`、デスクトップのみ表示（md以下では非表示） |
| **時計** | `text-sm font-medium tabular-nums`、毎分更新、「4/30 (水) 22:34」形式 |
| **通知ベル** | `Button variant="ghost" size="icon"`、`Bell` アイコン |
| 高さ | `var(--topbar-height) = 56px` |
| 背景 | `bg-background border-b` |

**※ アバターメニュー（DropdownMenu）は完全削除済み**。サイドバー下部の「ログアウト」で代替。

---

## 15. Chat Bubble（ユーザー詳細のチャット式 push UI）

| 送信者 | 配置 | 配色 |
|---|---|---|
| 事務局（admin） | 左寄せ | bg-muted text-foreground |
| ユーザー（user） | 右寄せ | bg-primary text-primary-foreground |

形：rounded-2xl px-4 py-2、最大幅80%
日付：text-xs text-muted-foreground、メッセージの上または横に小さく
連続するメッセージ（同送信者・5分以内）は連結（任意）

入力欄：
- `Textarea` で複数行対応
- 送信ボタン（`Send` アイコン付き）
- `Cmd/Ctrl+Enter` で送信ショートカット
- 入力欄が空のとき送信ボタン disabled

---

## 16. Donut Chart（マッチング申込状況・4分割）

中央に総件数、外周に4状態の比率：

| ステータス | 色 | 業務的意味 |
|---|---|---|
| **待機中** | `hsl(var(--muted-foreground) / 0.4)` | 受付 + company_total_count < 4、何もしなくてOK |
| **要対応** | `hsl(var(--warning))` | 受付 + company_total_count >= 4、相談会調整開始 |
| **開催準備中** | `hsl(var(--info))` | 相談会割当済、開催待ち |
| **終了** | `hsl(var(--muted-foreground) / 0.6)` | クローズ全般（完了 or 辞退） |

各セクションにマウスオーバーで Tooltip：状態名 + 件数 + 説明文（「終了」は内訳も）

---

## 17. Read-Only Mode（読み取り専用モード）

公開予定の取り組み事例で使用。状態に応じてバナー表示：

### 情報バナー（読み取り専用時）
- `bg-info/10 border border-info/30 rounded-md p-4`
- 左：`Calendar` アイコン + 「この事例は公開予定です」 + 配信予定日
- 右：「公開予定を変更」ボタン（`variant="default" size="lg"`）

### 警告バナー（編集モード時）
- `bg-warning/10 border border-warning/30 rounded-md p-4`
- 左：`AlertTriangle` アイコン + 「公開予定を変更中」 + 注意文
- 右：「キャンセル」ボタン

### 完全ロックバナー（公開中・キャンセル相談会）
- `bg-destructive/10 border border-destructive/30 rounded-md p-4`
- 中央寄せの強調表示
- 「⛔ {状態の説明}」

---

## 18. Tabs（タブ）

マッチング画面のサブビュー切替で使用：

```tsx
<Tabs value={currentView}>
  <TabsList>
    <TabsTrigger value="individual" asChild>
      <Link href="/matchings">個別申請（15件）</Link>
    </TabsTrigger>
    <TabsTrigger value="aggregate" asChild>
      <Link href="/matchings/aggregate">企業別集約（8社）</Link>
    </TabsTrigger>
  </TabsList>
</Tabs>
```

| 状態 | 視覚 |
|---|---|
| **default** | text-muted-foreground |
| **active** | bg-background text-foreground、下線 ring |
| **hover** | text-foreground |

各タブの右に件数バッジ（`text-xs text-muted-foreground`）。

---

## 19. AlertDialog（確認ダイアログ・誤操作防止）

重要な操作（ログアウト・admin ロール変更・削除・キャンセル等）には必ず確認ダイアログを挟む。

### ログアウト確認

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="ghost" size="sm" className="w-full justify-start">
      <LogOut className="size-4 mr-2" />
      ログアウト
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>ログアウトしますか？</AlertDialogTitle>
      <AlertDialogDescription>現在の作業内容は保存されません。</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>キャンセル</AlertDialogCancel>
      <AlertDialogAction onClick={handleLogout}>ログアウトする</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### admin ロール降格警告

自分自身（現在ログイン中のスタッフ）を admin から降格しようとする時：

```tsx
<AlertDialog open={showAdminWarning}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>⚠ 管理者権限を失いますが、よろしいですか？</AlertDialogTitle>
      <AlertDialogDescription>
        自分自身の管理者権限を変更しようとしています。
        変更後はスタッフ管理画面にアクセスできなくなる可能性があります。
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>キャンセル</AlertDialogCancel>
      <AlertDialogAction onClick={confirmRoleChange}>権限を変更する</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 削除・キャンセル確認

destructive アクション（取り組み事例の削除・相談会のキャンセル）には常に AlertDialog で確認。

---

## 20. ソート可能な列（Table の Header）

一覧画面で列ヘッダーをクリックして昇順/降順切替。

### 視覚

| 状態 | 表示 |
|---|---|
| **default** | text-muted-foreground、`cursor-pointer hover:bg-muted/50` |
| **active 昇順** | text-foreground + `ArrowUp` アイコン |
| **active 降順** | text-foreground + `ArrowDown` アイコン |

```tsx
<TableHead 
  className="cursor-pointer hover:bg-muted/50 select-none"
  onClick={() => handleSort("updated_at")}
>
  <span className="flex items-center gap-1">
    更新日
    {sortKey === "updated_at" && (
      sortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
    )}
  </span>
</TableHead>
```

実装画面：
- 取り組み事例（資料名、企業名、配信予定日、ステータス、更新日）
- ユーザー（氏名、企業名、登録日、最終アクティブ）
- マッチング個別申請（申請日時、申請者、希望先企業、スコア）
- 認可企業マスタ（法人番号、企業名、都道府県、業種、従業員数、売上高、目標年）
- 相談会（タイトル、ホスト、開催日時、定員/参加者）

---

## 21. アーカイブ表示トグル（取り組み事例一覧）

```tsx
<div className="flex items-center gap-2">
  <Switch
    id="show-archived"
    checked={showArchived}
    onCheckedChange={setShowArchived}
  />
  <Label htmlFor="show-archived">アーカイブも表示</Label>
</div>
```

| 状態 | 動作 |
|---|---|
| **OFF（デフォルト）** | `status === "archived"` を一覧から除外 |
| **ON** | アーカイブも含めて全件表示 |

---

## 22. DatePicker（auto-close + 過去日 disabled）

| 状態 | 視覚・動作 |
|---|---|
| **default** | placeholder「日付を選択」 |
| **open** | Calendar ポップアップ表示、過去日はグレーアウト・disabled |
| **selected** | 日付表示、選択時に**自動でポップアップが閉じる** |
| **disabled（公開済み事例等）** | 全体グレーアウト、クリック不可 |

```tsx
const [open, setOpen] = useState(false);

<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline">{date ? format(date, "yyyy年M月d日") : "日付を選択"}</Button>
  </PopoverTrigger>
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

---

## 23. 公開済み事例の読み取り専用表示

`status === "published"` の取り組み事例詳細では、配信日・配信先業界・配信先売上規模を**読み取り専用テキスト**で表示（DatePicker 等の編集 UI を使わない）。

```tsx
<div className="space-y-2">
  <Label className="text-sm text-muted-foreground">配信日時（読み取り専用）</Label>
  <div className="px-3 py-2 bg-muted rounded-md text-sm cursor-not-allowed">
    {format(new Date(publish_at), "yyyy年M月d日（EEE）HH:mm", { locale: ja })}
  </div>
  <p className="text-xs text-muted-foreground">
    ※ 公開済みのため、配信日は変更できません
  </p>
</div>
```

配信先業界・規模も同様に Badge を `cursor-not-allowed` で読み取り専用表示。

---

## 24. ステータス基準のツールチップ

ユーザー一覧の「状態」列ヘッダーに `Info` アイコン + Tooltip で基準を説明：

```tsx
<TableHead>
  <span className="flex items-center gap-1">
    状態
    <Tooltip>
      <TooltipTrigger>
        <InfoIcon className="size-3 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          <p><strong>新規登録</strong>：LINE で友だち追加されたが、プロファイル確認前</p>
          <p><strong>確認待ち</strong>：プロファイル登録中</p>
          <p><strong>確認済み</strong>：プロファイル確定、配信対象</p>
        </div>
      </TooltipContent>
    </Tooltip>
  </span>
</TableHead>
```

マッチングのスコア列・アーカイブボタンにも同様の Tooltip パターンで説明を追加。

---

## 共通アクセシビリティ

- 全てのインタラクティブ要素に **focus ring**（focus-visible:ring-2）
- color contrast：WCAG AA 準拠（白背景に primary 紺は十分）
- スクリーンリーダー：aria-label、aria-describedby を適切に
- Tab 順：意味的な順序（左から右、上から下）
- キーボード操作：すべてのボタン・メニュー項目が Tab + Enter で操作可

---

## アニメーション原則

- **基本**：200ms ease-in-out
- **微小変化**（hover、focus）：150ms
- **大きな移動**（モーダル、ドロワー）：250ms
- **`prefers-reduced-motion: reduce`** でアニメーション無効化を尊重

---

## カラートークン参照

詳細は `globals.css` の `:root` セクションを参照。主要トークン：

```css
--primary: oklch(0.40 0.090 243);  /* #1F4E79 */
--success: oklch(0.55 0.155 145);  /* 緑 */
--warning: oklch(0.74 0.165 65);   /* 黄 */
--destructive: oklch(0.58 0.220 27); /* 赤 */
--info: oklch(0.66 0.150 220);     /* 青 */
```

各色には `-foreground`（コントラスト用文字色）と、primary は 50〜900 のパレットも定義済み。
