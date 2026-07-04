# FP Planner Bug Fixes & Coverage Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 日本版・包括的FP支援アプリにおけるUIと計算コアの網羅的なバグ修正と、計算コア（src/domain）のカバレッジ100%達成。

**Architecture:** UI入力値のローカル状態管理（NumberField）、マイナス資産運用利回りの無視、および各ドメイン処理（円未満切り捨て・元金均等返済軽減等）の再計算と検証用テストの追加。

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3, Recharts 2, TypeScript 5, Vitest 2

## Global Constraints
- Node.js 22 LTS
- TypeScript 5.x (strict)
- フロントエンドのみのSPA。バックエンドなし。
- 個人データは localStorage にのみ保存する。
- 全ての計算ロジックは純粋関数としてテスト可能に分離する。
- 丸め方針を一元管理し、円未満端数の扱いは正負に関わらず絶対値の切り捨て（trunc）とする。

---

### Task 1: Rounding Fix (`rounding.ts`)

**Files:**
- Modify: `src/domain/finance/rounding.ts`
- Test: `tests/domain/rounding.test.ts`

**Interfaces:**
- Consumes: `safeNumber(value: number): number`
- Produces: `yen(value: number): number` (端数処理を零方向への丸め＝truncに変更)

- [ ] **Step 1: Write the failing test**
  `tests/domain/rounding.test.ts` に負の数に対する端数切り捨てテストを追加。
  ```typescript
  // tests/domain/rounding.test.ts
  import { describe, it, expect } from "vitest";
  import { yen } from "../../src/domain/finance/rounding";

  describe("yen rounding for negative values", () => {
    it("負の数の端数を零方向に切り捨てること", () => {
      expect(yen(-100.2)).toBe(-100);
      expect(yen(-100.9)).toBe(-100);
      expect(yen(0)).toBe(0);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run tests/domain/rounding.test.ts`
  Expected: FAIL (Math.floorにより -101 になって失敗する)

- [ ] **Step 3: Write minimal implementation**
  `src/domain/finance/rounding.ts` の `yen` 関数を修正。
  ```typescript
  // src/domain/finance/rounding.ts の該当箇所
  export function yen(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.trunc(value);
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run tests/domain/rounding.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/domain/finance/rounding.ts tests/domain/rounding.test.ts
  git commit -m "fix: change yen rounding to use Math.trunc for negative amounts"
  ```

---

### Task 2: Cashflow Depletion Interest Fix (`projection.ts`)

**Files:**
- Modify: `src/domain/cashflow/projection.ts`
- Test: `tests/domain/projection.test.ts`

**Interfaces:**
- Consumes: `projectCashflow(state: AppState): CashflowResult`
- Produces: 資産残高がマイナスの際に利息が発生しないよう修正された `CashflowResult`

- [ ] **Step 1: Write the failing test**
  `tests/domain/projection.test.ts` に負の残高に対する利回り適用のテストを追加。
  ```typescript
  // tests/domain/projection.test.ts 内
  it("資産がマイナスのとき運用利息が発生せず、生活支出のみで減少すること", () => {
    const state = baseState({
      assumptions: { currentYear: 2025, endAge: 37, inflationRate: 0, salaryGrowthRate: 0 },
      incomes: [],
      expenses: [{ id: "e1", label: "生活費", category: "living", annualAmount: 1_000_000 }],
      assets: [{ id: "a1", label: "投資", balance: -1_000_000, annualReturnRate: 0.05 }],
    });
    const result = projectCashflow(state);
    // 35歳末: -100万(初期) - 100万(支出) = -200万 (利息0)
    expect(result.rows[0].balance).toBe(-2_000_000);
    // 36歳末: -200万 - 100万(支出) = -300万 (利息0)
    expect(result.rows[1].balance).toBe(-3_000_000);
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run tests/domain/projection.test.ts`
  Expected: FAIL (利回りが適用され、-205万, -315.25万などになって失敗する)

- [ ] **Step 3: Write minimal implementation**
  `src/domain/cashflow/projection.ts` の残高更新処理を修正。
  ```typescript
  // src/domain/cashflow/projection.ts の該当箇所 (59-61行目)
  // 残高更新: 前年残高がプラスの場合のみ運用利回りを乗じ、当年の収支を加える
  const interest = balance > 0 ? balance * returnRate : 0;
  balance = yen(balance + interest + net);
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run tests/domain/projection.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/domain/cashflow/projection.ts tests/domain/projection.test.ts
  git commit -m "fix: ignore return rate when asset balance is negative"
  ```

---

### Task 3: Loan Equal Principal reducePayment recalculation Fix (`loan.ts`)

**Files:**
- Modify: `src/domain/finance/loan.ts`
- Test: `tests/domain/loan.test.ts`

**Interfaces:**
- Consumes: `buildAmortization(loan: Loan): AmortizationResult`
- Produces: 元金均等での返済額軽減型繰上返済が正しく反映された `AmortizationResult`

- [ ] **Step 1: Write the failing test**
  `tests/domain/loan.test.ts` に元金均等での軽減型繰上返済テストを追加。
  ```typescript
  // tests/domain/loan.test.ts 内
  it("元金均等返済において返済額軽減型繰上返済時に毎月の元金返済額が再計算されること", () => {
    const loan = {
      id: "l1",
      principal: 12_000_000,
      annualRate: 0,
      years: 10, // 120回
      method: "equalPrincipal" as const,
      prepayments: [
        { atMonth: 12, amount: 1_200_000, mode: "reducePayment" as const }
      ],
    };
    const result = buildAmortization(loan);
    // 初期元金部分: 1200万 / 120 = 100,000円
    // 12ヶ月返済後、残高は 1200万 - 120万 = 1080万。そこから120万繰上返済で残高960万。
    // 残期間は 120 - 12 = 108ヶ月。
    // 返済額軽減型では、新たな元金返済額は 960万 / 108 = 88,888円 (yen切り捨てで88,888)
    expect(result.rows[12].principalPart).toBe(88_888);
    // 総返済期間は120回のまま維持されること
    expect(result.monthsToPayoff).toBe(120);
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run tests/domain/loan.test.ts`
  Expected: FAIL (元金部分が100,000円のままで、期間が短縮され108回で終わって失敗する)

- [ ] **Step 3: Write minimal implementation**
  `src/domain/finance/loan.ts` 内の `buildAmortization` を修正。
  `fixedPrincipalPart` を `let` にし、軽減型繰上返済時に再計算。
  ```typescript
  // src/domain/finance/loan.ts の該当箇所 (38-40行目、60-66行目)
  let fixedPrincipalPart =
    method === "equalPrincipal" ? yen(principal / totalMonths) : 0;
  
  // ...
  if (prepay.mode === "shortenTerm") {
    // 期間短縮型: 毎月返済額を変えず残期間を短縮
  } else {
    // 返済額軽減型: 残期間は変えず毎月返済額を再計算
    const remainMonths = totalMonths - (index - 1);
    if (remainMonths > 0) {
      if (method === "equalPrincipal") {
        fixedPrincipalPart = yen(balance / remainMonths);
      } else {
        monthlyPay = monthlyPaymentEqual(balance, annualRate, remainMonths / 12);
      }
    }
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run tests/domain/loan.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/domain/finance/loan.ts tests/domain/loan.test.ts
  git commit -m "fix: recalculate equal principal part on reducePayment prepayments"
  ```

---

### Task 4: Store Empty State Reload Fix (`persistence.ts`)

**Files:**
- Modify: `src/store/persistence.ts`

**Interfaces:**
- Consumes: `loadState(): AppState`
- Produces: 空データを許容して読み込む `loadState`

- [ ] **Step 1: Write the minimal implementation**
  `src/store/persistence.ts` 内の `isEmptyLifeplanState` による初期化戻し判定を削除。
  ```typescript
  // src/store/persistence.ts の該当箇所 (86-88行目)
  // 以下の行を削除する
  // if (isEmptyLifeplanState(parsed)) {
  //   return createInitialState();
  // }
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add src/store/persistence.ts
  git commit -m "fix: allow saving and loading empty states without sample restoration"
  ```

---

### Task 5: NumberField Cursor and 0-retention Fix (`ui.tsx`)

**Files:**
- Modify: `src/components/ui.tsx`

**Interfaces:**
- Consumes: `NumberField` コンポーネント
- Produces: ユーザー入力時に空欄を許容し、頭に0が残らない `NumberField`

- [ ] **Step 1: Write the minimal implementation**
  `src/components/ui.tsx` の `NumberField` にローカルステートを導入。
  ```typescript
  // src/components/ui.tsx の該当箇所 (26-62行目)
  import { useState, useEffect } from "react"; // インポート追加

  export function NumberField({
    label,
    value,
    onChange,
    suffix,
    step = 1,
    min,
    help,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    suffix?: string;
    step?: number;
    min?: number;
    help?: string;
  }) {
    const [inputValue, setInputValue] = useState<string>(() =>
      Number.isFinite(value) ? value.toString() : ""
    );

    useEffect(() => {
      setInputValue(Number.isFinite(value) ? value.toString() : "");
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const valStr = e.target.value;
      setInputValue(valStr);
      const parsed = parseFloat(valStr);
      if (!isNaN(parsed)) {
        onChange(parsed);
      } else {
        onChange(0); // 空の場合は0を親に通知
      }
    };

    return (
      <label className="block mb-3">
        <span className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="tabular w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
            value={inputValue}
            step={step}
            min={min}
            onChange={handleChange}
          />
          {suffix && <span className="text-sm text-gray-500 shrink-0">{suffix}</span>}
        </div>
        {help && <span className="block text-xs text-gray-400 mt-1">{help}</span>}
      </label>
    );
  }
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add src/components/ui.tsx
  git commit -m "fix: resolve 0-retention bug in NumberField with local inputValue state"
  ```

---

### Task 6: Loan Prepayment Form UI Addition (`LifeplanForm.tsx`)

**Files:**
- Modify: `src/features/lifeplan/LifeplanForm.tsx`

**Interfaces:**
- Consumes: `patchLoan(id: string, patch: Partial<Loan>)`
- Produces: 住宅ローンの繰上返済（`prepayments`）を編集するUI

- [ ] **Step 1: Write the minimal implementation**
  `src/features/lifeplan/LifeplanForm.tsx` の住宅ローンのループ内に、繰上返済リストおよび追加ボタンを記述する。
  ```typescript
  // src/features/lifeplan/LifeplanForm.tsx 内 住宅ローンのマップ箇所
  {/* 既存の入力欄の下に追加 */}
  <div className="sm:col-span-3 mt-3">
    <span className="block text-xs font-semibold text-gray-600 mb-2">繰上返済設定</span>
    <div className="space-y-2">
      {loan.prepayments.map((p, pIdx) => (
        <div key={pIdx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-md border border-gray-100">
          <NumberField
            label="返済月"
            value={p.atMonth}
            onChange={(v) => {
              const nextPrepays = [...loan.prepayments];
              nextPrepays[pIdx] = { ...p, atMonth: v };
              patchLoan(loan.id, { prepayments: nextPrepays });
            }}
            suffix="ヶ月目"
          />
          <NumberField
            label="繰上金額"
            value={p.amount}
            onChange={(v) => {
              const nextPrepays = [...loan.prepayments];
              nextPrepays[pIdx] = { ...p, amount: v };
              patchLoan(loan.id, { prepayments: nextPrepays });
            }}
            suffix="円"
            step={100_000}
          />
          <SelectField
            label="方式"
            value={p.mode}
            options={[
              { value: "shortenTerm", label: "期間短縮" },
              { value: "reducePayment", label: "返済額軽減" },
            ]}
            onChange={(v) => {
              const nextPrepays = [...loan.prepayments];
              nextPrepays[pIdx] = { ...p, mode: v as any };
              patchLoan(loan.id, { prepayments: nextPrepays });
            }}
          />
          <div className="flex items-end pb-3">
            <Button
              variant="danger"
              onClick={() => {
                const nextPrepays = loan.prepayments.filter((_, idx) => idx !== pIdx);
                patchLoan(loan.id, { prepayments: nextPrepays });
              }}
            >
              削除
            </Button>
          </div>
        </div>
      ))}
      <Button
        variant="secondary"
        onClick={() => {
          const nextPrepays = [
            ...loan.prepayments,
            { atMonth: 12, amount: 1_000_000, mode: "shortenTerm" as const },
          ];
          patchLoan(loan.id, { prepayments: nextPrepays });
        }}
      >
        ＋ 繰上返済を追加
      </Button>
    </div>
  </div>
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add src/features/lifeplan/LifeplanForm.tsx
  git commit -m "feat: add dynamic prepayments form to loan inputs"
  ```

---

### Task 7: Education Commute Type UI Addition (`LifeplanForm.tsx`)

**Files:**
- Modify: `src/features/lifeplan/LifeplanForm.tsx`

**Interfaces:**
- Consumes: `patchEducationPath(id: string, patch: Partial<EducationPath>)`
- Produces: 大学進路がnone以外の場合に「大学通学方法（自宅/自宅外）」を選択するUI

- [ ] **Step 1: Write the minimal implementation**
  `src/features/lifeplan/LifeplanForm.tsx` の教育費プラン箇所を修正。
  ```typescript
  // src/features/lifeplan/LifeplanForm.tsx 内 教育費プランのSelectFieldの下に追加
  {plan.path.university !== "none" && (
    <SelectField
      label="大学通学方法"
      value={plan.path.universityCommute ?? "home"}
      options={[
        { value: "home", label: "自宅" },
        { value: "away", label: "自宅外（下宿）" },
      ]}
      onChange={(v) =>
        patchEducationPath(plan.id, { universityCommute: v as "home" | "away" })
      }
    />
  )}
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add src/features/lifeplan/LifeplanForm.tsx
  git commit -m "feat: add universityCommute select field to education forms"
  ```

---

### Task 8: Account type taxableIncomeBand conditional visibility Fix (`LifeplanForm.tsx`)

**Files:**
- Modify: `src/features/lifeplan/LifeplanForm.tsx`

**Interfaces:**
- Consumes: `plan.accountType`
- Produces: ideco選択時のみ課税所得帯を表示するUI

- [ ] **Step 1: Write the minimal implementation**
  `src/features/lifeplan/LifeplanForm.tsx` の積立プランの SelectField を条件分岐で包む。
  ```typescript
  // src/features/lifeplan/LifeplanForm.tsx 内 積立プランの課税所得帯箇所
  {plan.accountType === "ideco" && (
    <SelectField
      label="課税所得帯"
      value={plan.taxableIncomeBand ?? "band695"}
      options={BAND_OPTIONS}
      onChange={(v) => patchInvestment(plan.id, { taxableIncomeBand: v })}
    />
  )}
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add src/features/lifeplan/LifeplanForm.tsx
  git commit -m "ux: display taxableIncomeBand select field only for iDeCo investment plans"
  ```

---

### Task 9: Age Inversion Validation UI Addition (`CashflowView.tsx`)

**Files:**
- Modify: `src/features/lifeplan/CashflowView.tsx`

**Interfaces:**
- Consumes: `state.assumptions.endAge`, `selfCurrentAge(state)`
- Produces: 開始年齢が終了年齢を超えた際のエラー画面

- [ ] **Step 1: Write the minimal implementation**
  `src/features/lifeplan/CashflowView.tsx` の上部（14行目インポート、22行目周辺）を修正。
  ```typescript
  // src/features/lifeplan/CashflowView.tsx の該当箇所
  import { selfCurrentAge } from "../../domain/cashflow/sources"; // 必要ならインポート

  export function CashflowView({ state }: { state: AppState }) {
    const startAge = selfCurrentAge(state);
    const result = projectCashflow(state);
    const rows = result.rows;

    if (state.assumptions.endAge < startAge) {
      return (
        <Card title="キャッシュフロー">
          <p className="text-red-600 text-sm font-bold">
            エラー: 何歳まで試算するか（{state.assumptions.endAge}歳）が本人の現在年齢（{startAge}歳）より小さくなっています。設定を見直してください。
          </p>
        </Card>
      );
    }
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add src/features/lifeplan/CashflowView.tsx
  git commit -m "fix: display clear validation error on age inversion"
  ```

---

### Task 10: Test Coverage Expansion (`tests/domain/`)

**Files:**
- Modify: `tests/domain/projection.test.ts`
- Modify: `tests/domain/warnings.test.ts`
- Modify: `tests/domain/loan.test.ts`
- Modify: `tests/domain/education.test.ts`
- Modify: `tests/domain/account.test.ts`

**Interfaces:**
- Consumes: ドメインロジック各モジュール
- Produces: 網羅テストを追加し、カバレッジ100%を達成したVitest環境

- [ ] **Step 1: Write tests for projection.ts**
  `tests/domain/projection.test.ts` に家計実績（budgetRecords）反映のテストを追加。
  ```typescript
  // tests/domain/projection.test.ts 内
  it("家計実績がある場合に実績ベースの支出がキャッシュフローに集計されること", () => {
    const state = baseState({
      budgetRecords: [
        {
          id: "b1",
          yearMonth: "2025-01",
          incomes: [],
          expenses: [{ category: "living", amount: 250_000 }],
        },
      ],
    });
    const result = projectCashflow(state);
    // 年間換算額: 25万 * 12 = 300万円
    expect(result.rows[0].expense).toBe(3_000_000);
  });
  ```

- [ ] **Step 2: Write tests for warnings.ts**
  `tests/domain/warnings.test.ts` に `duplicate-budget` 警告のテストを追加。
  ```typescript
  // tests/domain/warnings.test.ts 内
  import { detectCashflowWarnings } from "../../src/domain/cashflow/warnings";
  import { describe, it, expect } from "vitest";

  it("家計実績と手動支出の両方があるときに重複警告を生成すること", () => {
    const state = baseState({
      expenses: [{ id: "e1", label: "生活費", category: "living", annualAmount: 100_000 }],
      budgetRecords: [
        {
          id: "b1",
          yearMonth: "2025-01",
          incomes: [],
          expenses: [{ category: "living", amount: 10_000 }],
        },
      ],
    });
    const warnings = detectCashflowWarnings(state);
    expect(warnings.some((w) => w.kind === "duplicate-budget")).toBe(true);
  });
  ```

- [ ] **Step 3: Write tests for loan.ts**
  `tests/domain/loan.test.ts` に元利均等の軽減型繰上返済テストを追加。
  ```typescript
  // tests/domain/loan.test.ts 内
  it("元利均等返済において返済額軽減型繰上返済時に毎月の支払額が減少すること", () => {
    const loan = {
      id: "l2",
      principal: 10_000_000,
      annualRate: 0.02,
      years: 10,
      method: "equalPayment" as const,
      prepayments: [
        { atMonth: 12, amount: 1_000_000, mode: "reducePayment" as const }
      ],
    };
    const result1 = buildAmortization(loan);
    // 繰上返済後の月支払額が減少していることの検証
    expect(result1.rows[12].payment).toBeLessThan(result1.rows[11].payment);
  });
  ```

- [ ] **Step 4: Write tests for education.test.ts**
  `tests/domain/education.test.ts` に大学進学なし・自宅外の仕送り加算テストを追加。
  ```typescript
  // tests/domain/education.test.ts 内
  import { educationCostSchedule } from "../../src/domain/education/cost";

  it("大学進学なし（none）および自宅外仕送り加算（away）を正しく計算すること", () => {
    const pathNone = {
      kindergarten: "public" as const,
      elementary: "public" as const,
      juniorHigh: "public" as const,
      highSchool: "public" as const,
      university: "none" as const,
    };
    const resultNone = educationCostSchedule(18, pathNone);
    expect(resultNone.perYear.find((r) => r.age === 18)?.cost).toBe(0);

    const pathAway = {
      kindergarten: "public" as const,
      elementary: "public" as const,
      juniorHigh: "public" as const,
      highSchool: "public" as const,
      university: "nationalPublic" as const,
      universityCommute: "away" as const,
    };
    const resultAway = educationCostSchedule(18, pathAway);
    // 67万(国公立) + 90万(仕送り) = 157万円
    expect(resultAway.perYear.find((r) => r.age === 18)?.cost).toBe(1_570_000);
  });
  ```

- [ ] **Step 5: Write tests for account.test.ts**
  `tests/domain/account.test.ts` に所得帯未指定・無効キーのフォールバックテストを追加。
  ```typescript
  // tests/domain/account.test.ts 内
  import { compareAccounts } from "../../src/domain/investment/account";

  it("所得帯が未指定または無効なキーのときにiDeCoの節税額が0になること", () => {
    const planNoBand = {
      id: "inv1",
      monthlyAmount: 10_000,
      annualRate: 0.03,
      years: 10,
      accountType: "ideco" as const,
    };
    const result1 = compareAccounts(planNoBand);
    expect(result1.ideco.taxSaving).toBe(0);

    const planInvalidBand = {
      ...planNoBand,
      taxableIncomeBand: "invalidKey" as any,
    };
    const result2 = compareAccounts(planInvalidBand);
    expect(result2.ideco.taxSaving).toBe(0);
  });
  ```

- [ ] **Step 6: Run all tests with coverage to verify 100%**
  Run: `npx vitest run --coverage`
  Expected: ALL PASS & `src/domain` coverage 100%

- [ ] **Step 7: Commit**
  ```bash
  git add tests/domain/
  git commit -m "test: achieve 100% test coverage for the domain core modules"
  ```
