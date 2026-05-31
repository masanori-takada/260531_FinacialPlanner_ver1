# Phase 1 Data Model: エンティティ定義

すべて`src/domain/types.ts`にTypeScript型として表現し、localStorageにJSON永続化する。

## 永続ルート

```
AppState {
  schemaVersion: number            // 例: 1
  household: Household
  incomes: Income[]
  expenses: Expense[]
  assets: Asset[]
  lifeEvents: LifeEvent[]
  investmentPlans: InvestmentPlan[]
  loans: Loan[]
  pensionProfile: PensionProfile | null
  budgetRecords: BudgetRecord[]
  assumptions: Assumptions          // インフレ率・昇給率・終了年齢 等
}
```

## エンティティ

### Household（世帯）
- `members: Member[]` — 本人・配偶者・子ども
- Member: `{ id, role: 'self'|'spouse'|'child', name, birthYear }`
- 検証: 本人は必須。birthYearは1900〜現在+0。

### Assumptions（前提）
- `currentYear: number`（既定: 実行時の西暦）
- `endAge: number`（既定95、範囲50〜120）
- `inflationRate: number`（既定0、小数。例 0.01 = 1%）
- `salaryGrowthRate: number`（既定0）

### Income（収入）
- `{ id, label, ownerId, annualAmount, startAge, endAge, growthRate? }`
- 検証: annualAmount ≥ 0、startAge ≤ endAge。

### Expense（支出）
- `{ id, label, category, annualAmount, startAge?, endAge?, growthRate? }`
- category: 生活費/住居費/教育費/保険/その他 等。

### Asset（資産）
- `{ id, label, balance, annualReturnRate? }` — 現預金・投資・退職金原資 等

### LifeEvent（ライフイベント）
- `{ id, label, age, amount, kind: 'income'|'expense' }` — 退職金・住宅購入 等の一時項目

### InvestmentPlan（積立プラン・US2）
- `{ id, monthlyAmount, annualRate, years, accountType: 'nisa'|'ideco'|'taxable', taxableIncomeBand? }`
- taxableIncomeBand は iDeCo節税概算用の課税所得帯キー。

### Loan（住宅ローン・US3）
- `{ id, principal, annualRate, years, method: 'equalPayment'|'equalPrincipal', prepayments: Prepayment[] }`
- Prepayment: `{ atMonth, amount, mode: 'shortenTerm'|'reducePayment' }`

### PensionProfile（年金前提・US5）
- `{ category: 'employee'|'selfEmployed', averageAnnualIncome, enrolledYears, startAge }`
- startAge 範囲: 60〜75。

### BudgetRecord（家計記録・US6）
- `{ id, yearMonth: 'YYYY-MM', incomes: {label, amount}[], expenses: {category, amount}[] }`

## 計算結果（非永続・必要に応じ再計算）

### CashflowRow（US1）
- `{ age, year, income, expense, net, balance }`

### CashflowResult
- `{ rows: CashflowRow[], depletionAge: number | null }`
  - depletionAge: 資産残高が初めて負になる年齢（なければnull）。

### AmortizationRow（US3）
- `{ index, payment, principalPart, interestPart, balance }`

### InvestmentComparison（US2）
- accountType別に `{ finalValue, totalContributions, gain, taxSaving? }`

### PensionEstimate（US5）
- `{ basicAnnual, employeesAnnual, totalAnnual, totalMonthly, adjustmentRate }`
