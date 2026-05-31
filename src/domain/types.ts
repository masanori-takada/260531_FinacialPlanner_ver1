// 共有エンティティ型（data-model.md 準拠）。
// すべて localStorage に JSON 永続化される素朴なデータ型。

export type MemberRole = "self" | "spouse" | "child";

export interface Member {
  id: string;
  role: MemberRole;
  name: string;
  birthYear: number;
}

export interface Household {
  members: Member[];
}

export interface Assumptions {
  currentYear: number; // 計算の起点となる西暦
  endAge: number; // 本人の何歳まで投影するか（既定95）
  inflationRate: number; // 支出の年次上昇率（小数。0.01=1%）
  salaryGrowthRate: number; // 収入の年次上昇率（個別未指定時の既定）
}

export interface Income {
  id: string;
  label: string;
  annualAmount: number;
  startAge: number; // 本人年齢基準
  endAge: number;
  growthRate?: number; // 年次昇給率（未指定なら0%）
}

export type ExpenseCategory =
  | "living"
  | "housing"
  | "education"
  | "insurance"
  | "other";

export interface Expense {
  id: string;
  label: string;
  category: ExpenseCategory;
  annualAmount: number;
  startAge?: number; // 未指定なら全期間
  endAge?: number;
  growthRate?: number; // 未指定なら assumptions.inflationRate
}

export interface Asset {
  id: string;
  label: string;
  balance: number;
  annualReturnRate?: number; // 未指定なら0
}

export type LifeEventKind = "income" | "expense";

export interface LifeEvent {
  id: string;
  label: string;
  age: number; // 本人年齢
  amount: number;
  kind: LifeEventKind;
}

export type AccountType = "nisa" | "ideco" | "taxable";

export interface InvestmentPlan {
  id: string;
  monthlyAmount: number;
  annualRate: number;
  years: number;
  accountType: AccountType;
  taxableIncomeBand?: IncomeBandKey; // iDeCo 節税概算用
  startAge?: number; // ライフプラン反映の開始年齢（未指定なら本人の現在年齢）
}

export type LoanMethod = "equalPayment" | "equalPrincipal";
export type PrepaymentMode = "shortenTerm" | "reducePayment";

export interface Prepayment {
  atMonth: number; // 何回目の返済直後に繰上げるか（1始まり）
  amount: number;
  mode: PrepaymentMode;
}

export interface Loan {
  id: string;
  principal: number;
  annualRate: number;
  years: number;
  method: LoanMethod;
  prepayments: Prepayment[];
  startAge?: number; // 返済開始年齢（未指定なら本人の現在年齢）
}

export type PensionCategory = "employee" | "selfEmployed";

export interface PensionProfile {
  category: PensionCategory;
  averageAnnualIncome: number;
  enrolledYears: number;
  startAge: number; // 60〜75
}

export interface BudgetLine {
  label: string;
  amount: number;
}

export interface BudgetExpenseLine {
  category: ExpenseCategory;
  amount: number;
}

export interface BudgetRecord {
  id: string;
  yearMonth: string; // "YYYY-MM"
  incomes: BudgetLine[];
  expenses: BudgetExpenseLine[];
}

export interface EducationPlan {
  id: string;
  childName: string;
  childCurrentAge: number;
  path: EducationPath;
}

// 課税所得帯キー（iDeCo節税概算用）。所得税率は constants/tax.ts で定義。
export type IncomeBandKey =
  | "band195"
  | "band330"
  | "band695"
  | "band900"
  | "band1800"
  | "band4000"
  | "bandOver";

// 永続ルート
export interface AppState {
  schemaVersion: number;
  household: Household;
  incomes: Income[];
  expenses: Expense[];
  assets: Asset[];
  lifeEvents: LifeEvent[];
  investmentPlans: InvestmentPlan[];
  loans: Loan[];
  educationPlans: EducationPlan[];
  pensionProfile: PensionProfile | null;
  budgetRecords: BudgetRecord[];
  assumptions: Assumptions;
}

// ---- 計算結果（非永続） ----

export interface CashflowRow {
  age: number;
  year: number;
  income: number;
  expense: number;
  assetTransfer: number;
  net: number;
  balance: number;
  sourceBreakdown: CashflowSourceBreakdown[];
}

export interface CashflowResult {
  rows: CashflowRow[];
  depletionAge: number | null;
  sources: AnnualCashflowItem[];
}

export type CashflowSourceKind =
  | "manualIncome"
  | "manualExpense"
  | "lifeEvent"
  | "education"
  | "pension"
  | "loan"
  | "budget"
  | "investment";

export type CashflowItemType = "income" | "expense" | "assetTransfer";

export interface AnnualCashflowItem {
  id: string;
  sourceKind: CashflowSourceKind;
  sourceId: string;
  label: string;
  age: number;
  year: number;
  type: CashflowItemType;
  amount: number;
}

export interface CashflowSourceBreakdown {
  sourceKind: CashflowSourceKind;
  label: string;
  type: CashflowItemType;
  amount: number;
}

export interface CashflowWarning {
  kind: string;
  message: string;
}

export interface AmortizationRow {
  index: number; // 返済回（1始まり）
  payment: number;
  principalPart: number;
  interestPart: number;
  balance: number;
}

export interface AmortizationResult {
  rows: AmortizationRow[];
  totalPayment: number;
  totalInterest: number;
  monthsToPayoff: number;
}

export interface AccountResult {
  finalValue: number;
  totalContributions: number;
  gain: number;
  taxSaving?: number;
}

export interface InvestmentComparison {
  nisa: AccountResult;
  ideco: AccountResult;
  taxable: AccountResult;
}

export type SchoolStage =
  | "kindergarten"
  | "elementary"
  | "juniorHigh"
  | "highSchool"
  | "university";

export type SchoolType = "public" | "private";

// 大学のみ文理・通学形態を区別する
export type UniversityKind =
  | "nationalPublic"
  | "privateHumanities"
  | "privateScience";

export interface EducationPath {
  kindergarten: SchoolType;
  elementary: SchoolType;
  juniorHigh: SchoolType;
  highSchool: SchoolType;
  university: UniversityKind | "none";
  universityCommute?: "home" | "away"; // 下宿は仕送り加算
}

export interface EducationCostRow {
  age: number;
  cost: number;
  stage: SchoolStage | null;
}

export interface EducationCostResult {
  perYear: EducationCostRow[];
  total: number;
}

export interface PensionEstimate {
  basicAnnual: number;
  employeesAnnual: number;
  totalAnnual: number;
  totalMonthly: number;
  adjustmentRate: number; // 繰上/繰下の調整率（1.0=65歳基準）
}

export interface BudgetSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingRate: number;
  byCategory: { category: ExpenseCategory; amount: number }[];
}
