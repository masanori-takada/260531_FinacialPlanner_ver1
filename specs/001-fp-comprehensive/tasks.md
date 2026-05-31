# Tasks: 日本版・包括的FP支援アプリ

**Input**: `specs/001-fp-comprehensive/` の plan.md / spec.md / research.md / data-model.md / contracts/

**Tests**: 含む（憲章I/IV により計算コアの単体テストは必須）。テストは実装前に書き、失敗を確認する。

**Organization**: ユーザーストーリー（US1〜US6）ごとに、独立して実装・テスト・デモ可能な単位で構成。

## Format: `[ID] [P?] [Story] 説明`
- **[P]**: 並行実行可能（別ファイル・依存なし）
- **[Story]**: 対応ユーザーストーリー

---

## Phase 1: Setup（共有基盤）

- [X] T001 Viteプロジェクト初期化（`package.json`, `vite.config.ts`, `tsconfig.json` strict, `index.html`, `src/main.tsx`, `src/App.tsx` の雛形）
- [X] T002 [P] Tailwind CSS導入（`tailwind.config.js`, `postcss.config.js`, `src/index.css`）
- [X] T003 [P] Vitest導入（`vitest`設定を`vite.config.ts`に追加、`npm test`/`npm run test:watch`スクリプト）
- [X] T004 [P] 依存追加（react, react-dom, recharts）

---

## Phase 2: Foundational（全ストーリーの前提・ブロッキング）

**⚠️ 完了までユーザーストーリー着手不可**

- [X] T005 共有エンティティ型を `src/domain/types.ts` に定義（data-model.md準拠）
- [X] T006 [P] 丸め方針 `src/domain/finance/rounding.ts`（円未満切り捨て等）＋テスト `tests/domain/rounding.test.ts`
- [X] T007 [P] 改定されうる定数を出典・適用年度コメント付きで作成: `src/domain/constants/tax.ts`, `pension.ts`, `education.ts`（前提扱い）
- [X] T008 localStorage永続化層 `src/store/persistence.ts`（load/save/clear、schemaVersion、外部送信なし）
- [X] T009 [P] 免責コンポーネント `src/components/Disclaimer.tsx`（FR-002/III）
- [X] T010 タブ構成のダッシュボード骨組み `src/App.tsx`（6機能タブ＋常設免責バナー）

**Checkpoint**: 基盤完成。各ユーザーストーリーに着手可能。

---

## Phase 3: User Story 1 - ライフプラン/キャッシュフロー (P1) 🎯 MVP

**Goal**: 最小入力で生涯キャッシュフロー表＋資産推移グラフ＋枯渇年齢警告を表示。

**Independent Test**: 年齢・年収・年間支出・貯蓄を入力すると、年次の収支・残高表とグラフが出て、枯渇年齢（あれば）が警告される。

### Tests（実装前・失敗確認）
- [X] T011 [P] [US1] `tests/domain/compound.test.ts`（`futureValueLumpSum`/`futureValueOfMonthly`、r=0境界、ハンド計算期待値）
- [X] T012 [P] [US1] `tests/domain/projection.test.ts`（収支・残高漸化式、枯渇年齢検出、非枯渇時null、インフレ/昇給率反映）

### Implementation
- [X] T013 [US1] `src/domain/finance/compound.ts` 実装（T011を通す）
- [X] T014 [US1] `src/domain/cashflow/projection.ts` 実装（T012を通す、`projectCashflow`/`depletionAge`）
- [X] T015 [US1] ライフプラン入力フォーム `src/features/lifeplan/LifeplanForm.tsx`（本人/配偶者/子・収入・支出・資産・前提・サンプル入力ボタン）
- [X] T016 [US1] キャッシュフロー表＋資産推移グラフ `src/features/lifeplan/CashflowView.tsx`（Recharts折れ線、枯渇年齢警告、結果画面に免責）
- [X] T017 [US1] 入力のlocalStorage自動保存・復元の結線（persistence利用）

**Checkpoint**: P1単独で動作する動くMVP。`npm run dev`/`npm test`が通ること。

---

## Phase 4: User Story 3 - 住宅ローン (P2)

**Goal**: 借入条件から毎月返済額・総返済額・総利息・償還表、繰上返済効果を表示。

**Independent Test**: 借入額・金利・期間入力で返済額・償還表が出て、繰上返済入力で総利息が減少。

### Tests
- [X] T018 [P] [US3] `tests/domain/loan.test.ts`（元利均等の毎月返済額、元金均等の逓減、総利息、繰上返済の利息軽減/期間短縮、r=0境界）

### Implementation
- [X] T019 [US3] `src/domain/finance/loan.ts` 実装（`monthlyPaymentEqual`/`buildAmortization`、T018を通す）
- [X] T020 [US3] 住宅ローンUI `src/features/loan/LoanView.tsx`（入力・結果・償還表・繰上返済・免責）

**Checkpoint**: US1とUS3が独立して動作。

---

## Phase 5: User Story 2 - NISA/iDeCo/特定 積立シミュレーション (P2)

**Goal**: 積立条件から3口座の最終評価額・運用益・iDeCo節税を比較。

**Independent Test**: 積立額・利回り・期間入力で3口座の結果が比較表示される。

### Tests
- [X] T021 [P] [US2] `tests/domain/account.test.ts`（NISA非課税、特定の20.315%課税後手取り、iDeCo節税概算、`compareAccounts`）

### Implementation
- [X] T022 [US2] `src/domain/investment/account.ts` 実装（compound利用、tax定数参照、T021を通す）
- [X] T023 [US2] 積立UI `src/features/investment/InvestmentView.tsx`（入力・3口座比較表/グラフ・受取時課税の概算注記・免責）

**Checkpoint**: US1/US2/US3が独立動作。

---

## Phase 6: User Story 4 - 教育資金 (P3)

**Goal**: 子の進路選択から年次教育費・総額を算出し、ライフプランへ取り込み可能に。

**Independent Test**: 子の年齢と進路区分選択で年次教育費・総額が表示。

### Tests
- [X] T024 [P] [US4] `tests/domain/education.test.ts`（進路別代表値テーブルからの年次配分・総額、`educationCostSchedule`）

### Implementation
- [X] T025 [US4] `src/domain/education/cost.ts` 実装（education定数参照、T024を通す）
- [X] T026 [US4] 教育資金UI `src/features/education/EducationView.tsx`（子・進路選択・年次表・ライフプラン取り込みボタン・免責）

**Checkpoint**: US1〜US4が独立動作。

---

## Phase 7: User Story 5 - 公的年金の概算試算 (P3)

**Goal**: 加入区分・年収・加入年数・受給開始年齢から概算年金額＋繰上/繰下調整。

**Independent Test**: 入力で概算年額/月額が表示、受給開始年齢変更で増減反映。

### Tests
- [X] T027 [P] [US5] `tests/domain/pension.test.ts`（基礎年金の納付月按分、厚生年金簡略式、繰上-0.4%/月・繰下+0.7%/月、範囲60〜75、`estimatePension`）

### Implementation
- [X] T028 [US5] `src/domain/pension/estimate.ts` 実装（pension定数参照、T027を通す）
- [X] T029 [US5] 年金UI `src/features/pension/PensionView.tsx`（入力・概算結果・「正式試算ではない」注記・免責）

**Checkpoint**: US1〜US5が独立動作。

---

## Phase 8: User Story 6 - 家計管理 (P3)

**Goal**: 月次収支のカテゴリ別記録から収支・貯蓄率・構成比を集計。

**Independent Test**: 月次収入・支出入力で月間収支・貯蓄率・カテゴリ内訳が表示。

### Tests
- [X] T030 [P] [US6] `tests/domain/budget.test.ts`（合計・収支・貯蓄率・カテゴリ集計、`summarizeBudget`）

### Implementation
- [X] T031 [US6] `src/domain/household/budget.ts` 実装（T030を通す）
- [X] T032 [US6] 家計UI `src/features/budget/BudgetView.tsx`（月次入力・集計表/グラフ・免責）

**Checkpoint**: 全ストーリー独立動作。

---

## Phase 9: Polish & 統合（横断）

- [X] T033 教育費（US4）・年金（US5）の結果をライフプラン（US1）の支出/収入へ取り込む結線
- [X] T034 [P] 全データ削除（リセット）UIの結線（FR-005）
- [X] T035 [P] README.md（概要・起動手順・プライバシー/免責の明記）
- [X] T036 全テスト実行（`npm test`緑）＋本番ビルド（`npm run build`成功）＋ブラウザでP1フロー目視確認
- [X] T037 外部送信コードの不在確認（fetch/XHR/解析タグが無いこと＝憲章II・SC-005）

---

## Dependencies & Execution Order

- **Phase 1 Setup** → **Phase 2 Foundational**（全ストーリーをブロック）→ **Phase 3+ 各US**。
- 各US内: テスト（失敗確認）→ domain実装 → UI。domainはUIに先行。
- 優先度順の逐次実装を基本とする（P1 → P2 → P3）。チーム並行時はFoundational後に各USを並行可能。
- **Phase 9 Polish** は対象USの完了後。

### Parallel Opportunities
- T002/T003/T004（Setup）は並行可。
- T006/T007/T009（Foundational の[P]）は並行可。
- 各USのテストタスク（[P]）は相互に並行可。

---

## Implementation Strategy

1. Phase 1+2（基盤）→ 2. Phase 3（US1）で動くMVPを確立し**停止して検証** →
3. Phase 4以降を優先度順に追加（各チェックポイントで独立検証）→ 4. Phase 9で統合・仕上げ。

## Notes
- [P]=別ファイル・依存なし。テストは実装前に失敗を確認（憲章IV）。
- 各結果画面に免責表示を必ず残す（憲章III）。外部送信を入れない（憲章II）。
- 税率・教育費・年金式は定数（前提）として隔離。テストは数式の正しさを検証する。
