# Phase 1 Contract: domain関数のI/O契約

`src/domain`が公開する純粋関数の契約。すべて副作用なし。入力が不正な場合は
妥当な既定（0やnull）を返すか、呼び出し側で検証済みを前提とする（NaN/Infinityを返さない）。

## finance/compound.ts

```ts
// 毎月積立の将来価値（月複利）。
// fv = monthly * [((1+r)^n - 1) / r] , r = annualRate/12, n = years*12
// r=0 のときは monthly * n（ゼロ除算回避）。丸めは円未満切り捨て。
futureValueOfMonthly(monthly: number, annualRate: number, years: number): number

// 元本一括の将来価値（年複利）。 fv = principal * (1+rate)^years
futureValueLumpSum(principal: number, annualRate: number, years: number): number
```

## finance/loan.ts

```ts
// 元利均等の毎月返済額。 pay = P*r / (1-(1+r)^-n), r=月利, n=総回数。r=0なら P/n。
monthlyPaymentEqual(principal, annualRate, years): number

// 償還表を返す（繰上返済を反映）。method/ prepayments を考慮。
buildAmortization(loan: Loan): {
  rows: AmortizationRow[]
  totalPayment: number
  totalInterest: number
  monthsToPayoff: number
}
```

## cashflow/projection.ts

```ts
// 世帯・収入・支出・資産・イベント・前提から年次系列を生成し、資産枯渇年齢を検出。
projectCashflow(state: AppState): CashflowResult
// 各年: income/expense は該当年齢で有効な項目を合算し growthRate/inflation を適用。
//        balance(t) = balance(t-1)*(1+資産利回り) + net(t)。
//        depletionAge = balanceが初めて<0となる age（なければ null）。
```

## investment/account.ts

```ts
// NISA/iDeCo/特定 を比較。taxable は gain に 20.315% 課税。
// ideco は taxSaving = 年間掛金 * (所得税率(band) + 0.10) * years を概算。
compareAccounts(plan: InvestmentPlan): InvestmentComparison
```

## education/cost.ts

```ts
// 子どもの現年齢と進路選択から、各年の教育費と総額を返す。
educationCostSchedule(childAge: number, path: EducationPath): {
  perYear: { age: number; cost: number }[]
  total: number
}
```

## pension/estimate.ts

```ts
// 老齢基礎＋厚生（概算）。startAgeで繰上(-0.4%/月)/繰下(+0.7%/月)を適用。
estimatePension(profile: PensionProfile): PensionEstimate
```

## household/budget.ts

```ts
// 月次記録から収支・貯蓄率・カテゴリ集計。
summarizeBudget(record: BudgetRecord): {
  totalIncome: number; totalExpense: number; balance: number;
  savingRate: number; byCategory: { category: string; amount: number }[]
}
```

## store/persistence.ts

```ts
loadState(): AppState         // 無ければ既定の空状態。schemaVersion不一致はマイグレーション/初期化。
saveState(state: AppState): void
clearState(): void            // 全データ削除（FR-005）
// 外部送信は一切行わない（憲章II）。
```
