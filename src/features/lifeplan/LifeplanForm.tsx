// ライフプラン入力フォーム（US1）。世帯・収入・支出・資産・ライフイベント・前提を編集する。

import type {
  AppState,
  Asset,
  BudgetRecord,
  EducationPlan,
  EducationPath,
  Expense,
  ExpenseCategory,
  IncomeBandKey,
  Income,
  InvestmentPlan,
  LifeEvent,
  Loan,
  LoanMethod,
  PensionCategory,
  PensionProfile,
  SchoolType,
  UniversityKind,
} from "../../domain/types";
import { Button, Card, NumberField, PercentField, SelectField } from "../../components/ui";
import { INCOME_BAND_LABELS } from "../../domain/constants/tax";

const uid = () => Math.random().toString(36).slice(2, 9);

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "living", label: "生活費" },
  { value: "housing", label: "住居費" },
  { value: "education", label: "教育費" },
  { value: "insurance", label: "保険" },
  { value: "other", label: "その他" },
];

const SCHOOL_TYPE_OPTIONS: { value: SchoolType; label: string }[] = [
  { value: "public", label: "公立" },
  { value: "private", label: "私立" },
];

const UNIVERSITY_OPTIONS: { value: UniversityKind | "none"; label: string }[] = [
  { value: "nationalPublic", label: "国公立大学" },
  { value: "privateHumanities", label: "私立大学（文系）" },
  { value: "privateScience", label: "私立大学（理系）" },
  { value: "none", label: "大学進学なし" },
];

const ACCOUNT_OPTIONS = [
  { value: "nisa", label: "NISA" },
  { value: "ideco", label: "iDeCo" },
  { value: "taxable", label: "特定口座" },
] as const;

const BAND_OPTIONS = Object.entries(INCOME_BAND_LABELS).map(([value, label]) => ({
  value: value as IncomeBandKey,
  label,
}));

const defaultEducationPath = (): EducationPath => ({
  kindergarten: "public",
  elementary: "public",
  juniorHigh: "public",
  highSchool: "public",
  university: "nationalPublic",
  universityCommute: "home",
});

const defaultBudgetRecord = (): BudgetRecord => ({
  id: uid(),
  yearMonth: new Date().toISOString().slice(0, 7),
  incomes: [{ label: "給与", amount: 0 }],
  expenses: [{ category: "living", amount: 0 }],
});

export function LifeplanForm({
  state,
  setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  const self = state.household.members.find((m) => m.role === "self");
  const selfAge = self ? state.assumptions.currentYear - self.birthYear : 35;

  const setSelfAge = (age: number) => {
    setState((s) => ({
      ...s,
      household: {
        members: s.household.members.map((m) =>
          m.role === "self"
            ? { ...m, birthYear: s.assumptions.currentYear - age }
            : m,
        ),
      },
    }));
  };

  // 配列項目の汎用更新
  const patchIncome = (id: string, patch: Partial<Income>) =>
    setState((s) => ({
      ...s,
      incomes: s.incomes.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  const patchExpense = (id: string, patch: Partial<Expense>) =>
    setState((s) => ({
      ...s,
      expenses: s.expenses.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  const patchAsset = (id: string, patch: Partial<Asset>) =>
    setState((s) => ({
      ...s,
      assets: s.assets.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  const patchEvent = (id: string, patch: Partial<LifeEvent>) =>
    setState((s) => ({
      ...s,
      lifeEvents: s.lifeEvents.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  const patchLoan = (id: string, patch: Partial<Loan>) =>
    setState((s) => ({
      ...s,
      loans: s.loans.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  const patchInvestment = (id: string, patch: Partial<InvestmentPlan>) =>
    setState((s) => ({
      ...s,
      investmentPlans: s.investmentPlans.map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    }));
  const patchEducation = (id: string, patch: Partial<EducationPlan>) =>
    setState((s) => ({
      ...s,
      educationPlans: (s.educationPlans ?? []).map((x) =>
        x.id === id ? { ...x, ...patch } : x,
      ),
    }));
  const patchEducationPath = (id: string, patch: Partial<EducationPath>) =>
    setState((s) => ({
      ...s,
      educationPlans: (s.educationPlans ?? []).map((x) =>
        x.id === id ? { ...x, path: { ...x.path, ...patch } } : x,
      ),
    }));
  const patchPension = (patch: Partial<PensionProfile>) =>
    setState((s) => ({
      ...s,
      pensionProfile: {
        ...(s.pensionProfile ?? {
          category: "employee",
          averageAnnualIncome: 5_000_000,
          enrolledYears: 40,
          startAge: 65,
        }),
        ...patch,
      },
    }));
  const patchBudget = (id: string, patch: Partial<BudgetRecord>) =>
    setState((s) => ({
      ...s,
      budgetRecords: s.budgetRecords.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));

  const remove = (
    key:
      | "incomes"
      | "expenses"
      | "assets"
      | "lifeEvents"
      | "loans"
      | "investmentPlans"
      | "educationPlans"
      | "budgetRecords",
    id: string,
  ) =>
    setState((s) => ({ ...s, [key]: s[key].filter((x) => x.id !== id) }));

  return (
    <div className="space-y-5">
      <Card title="① 世帯・前提">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <NumberField label="本人の現在年齢" value={selfAge} onChange={setSelfAge} suffix="歳" min={0} />
          <NumberField
            label="何歳まで試算するか"
            value={state.assumptions.endAge}
            onChange={(v) =>
              setState((s) => ({ ...s, assumptions: { ...s.assumptions, endAge: v } }))
            }
            suffix="歳"
          />
          <PercentField
            label="物価上昇率（支出の増加）"
            value={state.assumptions.inflationRate}
            onChange={(v) =>
              setState((s) => ({ ...s, assumptions: { ...s.assumptions, inflationRate: v } }))
            }
            help="未設定なら0%。例: 1%"
          />
        </div>
      </Card>

      <Card title="② 収入（年額）">
        {state.incomes.map((inc) => (
          <div key={inc.id} className="border-b border-gray-100 pb-3 mb-3 last:border-0">
            <input
              className="w-full mb-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              value={inc.label}
              placeholder="項目名"
              onChange={(e) => patchIncome(inc.id, { label: e.target.value })}
            />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-3">
              <NumberField label="年額" value={inc.annualAmount} onChange={(v) => patchIncome(inc.id, { annualAmount: v })} suffix="円" step={100000} />
              <NumberField label="開始年齢" value={inc.startAge} onChange={(v) => patchIncome(inc.id, { startAge: v })} suffix="歳" />
              <NumberField label="終了年齢" value={inc.endAge} onChange={(v) => patchIncome(inc.id, { endAge: v })} suffix="歳" />
              <PercentField
                label="昇給率"
                value={inc.growthRate ?? 0}
                onChange={(v) => patchIncome(inc.id, { growthRate: v })}
                help="毎年の増加率。0%なら据え置き。"
              />
              <div className="flex items-end pb-3">
                <Button variant="danger" onClick={() => remove("incomes", inc.id)}>削除</Button>
              </div>
            </div>
          </div>
        ))}
        <Button variant="secondary" onClick={() => setState((s) => ({ ...s, incomes: [...s.incomes, { id: uid(), label: "新しい収入", annualAmount: 0, startAge: selfAge, endAge: 64, growthRate: 0 }] }))}>＋ 収入を追加</Button>
      </Card>

      <Card title="③ 支出（年額）">
        {state.expenses.map((exp) => (
          <div key={exp.id} className="border-b border-gray-100 pb-3 mb-3 last:border-0">
            <input
              className="w-full mb-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              value={exp.label}
              placeholder="項目名"
              onChange={(e) => patchExpense(exp.id, { label: e.target.value })}
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3">
              <NumberField label="年額" value={exp.annualAmount} onChange={(v) => patchExpense(exp.id, { annualAmount: v })} suffix="円" step={100000} />
              <SelectField label="分類" value={exp.category} options={EXPENSE_CATEGORIES} onChange={(v) => patchExpense(exp.id, { category: v })} />
              <NumberField label="終了年齢(任意)" value={exp.endAge ?? state.assumptions.endAge} onChange={(v) => patchExpense(exp.id, { endAge: v })} suffix="歳" />
              <div className="flex items-end pb-3">
                <Button variant="danger" onClick={() => remove("expenses", exp.id)}>削除</Button>
              </div>
            </div>
          </div>
        ))}
        <Button variant="secondary" onClick={() => setState((s) => ({ ...s, expenses: [...s.expenses, { id: uid(), label: "新しい支出", category: "living", annualAmount: 0 }] }))}>＋ 支出を追加</Button>
      </Card>

      <Card title="④ 保有資産">
        {state.assets.map((a) => (
          <div key={a.id} className="border-b border-gray-100 pb-3 mb-3 last:border-0">
            <input
              className="w-full mb-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              value={a.label}
              placeholder="項目名"
              onChange={(e) => patchAsset(a.id, { label: e.target.value })}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3">
              <NumberField label="現在残高" value={a.balance} onChange={(v) => patchAsset(a.id, { balance: v })} suffix="円" step={100000} />
              <PercentField label="想定利回り" value={a.annualReturnRate ?? 0} onChange={(v) => patchAsset(a.id, { annualReturnRate: v })} />
              <div className="flex items-end pb-3">
                <Button variant="danger" onClick={() => remove("assets", a.id)}>削除</Button>
              </div>
            </div>
          </div>
        ))}
        <Button variant="secondary" onClick={() => setState((s) => ({ ...s, assets: [...s.assets, { id: uid(), label: "新しい資産", balance: 0, annualReturnRate: 0 }] }))}>＋ 資産を追加</Button>
      </Card>

      <Card title="⑤ ライフイベント（一時的な収入・支出）">
        {state.lifeEvents.map((ev) => (
          <div key={ev.id} className="border-b border-gray-100 pb-3 mb-3 last:border-0">
            <input
              className="w-full mb-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              value={ev.label}
              placeholder="イベント名"
              onChange={(e) => patchEvent(ev.id, { label: e.target.value })}
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3">
              <NumberField label="発生年齢" value={ev.age} onChange={(v) => patchEvent(ev.id, { age: v })} suffix="歳" />
              <NumberField label="金額" value={ev.amount} onChange={(v) => patchEvent(ev.id, { amount: v })} suffix="円" step={100000} />
              <SelectField label="種別" value={ev.kind} options={[{ value: "income", label: "収入" }, { value: "expense", label: "支出" }]} onChange={(v) => patchEvent(ev.id, { kind: v })} />
              <div className="flex items-end pb-3">
                <Button variant="danger" onClick={() => remove("lifeEvents", ev.id)}>削除</Button>
              </div>
            </div>
          </div>
        ))}
        <Button variant="secondary" onClick={() => setState((s) => ({ ...s, lifeEvents: [...s.lifeEvents, { id: uid(), label: "新しいイベント", age: selfAge + 5, amount: 0, kind: "expense" }] }))}>＋ イベントを追加</Button>
      </Card>

      <Card title="⑥ 住宅ローン（住居支出として自動反映）">
        <p className="text-xs text-gray-500 mb-3">
          ここに入力した返済額は年次キャッシュフローの住居支出へ自動反映されます。手入力の住居費と重複しないよう、同じ返済を二重登録しないでください。
        </p>
        {state.loans.map((loan) => (
          <div key={loan.id} className="border-b border-gray-100 pb-3 mb-3 last:border-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3">
              <NumberField label="返済開始年齢" value={loan.startAge ?? selfAge} onChange={(v) => patchLoan(loan.id, { startAge: v })} suffix="歳" />
              <NumberField label="借入金額" value={loan.principal} onChange={(v) => patchLoan(loan.id, { principal: v })} suffix="円" step={1_000_000} />
              <PercentField label="年利" value={loan.annualRate} onChange={(v) => patchLoan(loan.id, { annualRate: v })} />
              <NumberField label="返済期間" value={loan.years} onChange={(v) => patchLoan(loan.id, { years: v })} suffix="年" min={1} />
              <SelectField
                label="返済方式"
                value={loan.method}
                options={[
                  { value: "equalPayment", label: "元利均等" },
                  { value: "equalPrincipal", label: "元金均等" },
                ]}
                onChange={(v) => patchLoan(loan.id, { method: v as LoanMethod })}
              />
              <div className="flex items-end pb-3">
                <Button variant="danger" onClick={() => remove("loans", loan.id)}>削除</Button>
              </div>
            </div>
          </div>
        ))}
        <Button
          variant="secondary"
          onClick={() =>
            setState((s) => ({
              ...s,
              loans: [
                ...s.loans,
                {
                  id: uid(),
                  principal: 30_000_000,
                  annualRate: 0.01,
                  years: 35,
                  method: "equalPayment",
                  prepayments: [],
                  startAge: selfAge,
                },
              ],
            }))
          }
        >
          ＋ 住宅ローンを追加
        </Button>
      </Card>

      <Card title="⑦ 教育費（子ども別の年次支出として自動反映）">
        {(state.educationPlans ?? []).map((plan) => (
          <div key={plan.id} className="border-b border-gray-100 pb-3 mb-3 last:border-0">
            <input
              className="w-full mb-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              value={plan.childName}
              placeholder="子どもの名前"
              onChange={(e) => patchEducation(plan.id, { childName: e.target.value })}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3">
              <NumberField label="子の現在年齢" value={plan.childCurrentAge} onChange={(v) => patchEducation(plan.id, { childCurrentAge: v })} suffix="歳" min={0} />
              <SelectField label="小学校" value={plan.path.elementary} options={SCHOOL_TYPE_OPTIONS} onChange={(v) => patchEducationPath(plan.id, { elementary: v })} />
              <SelectField label="中学校" value={plan.path.juniorHigh} options={SCHOOL_TYPE_OPTIONS} onChange={(v) => patchEducationPath(plan.id, { juniorHigh: v })} />
              <SelectField label="高校" value={plan.path.highSchool} options={SCHOOL_TYPE_OPTIONS} onChange={(v) => patchEducationPath(plan.id, { highSchool: v })} />
              <SelectField label="大学" value={plan.path.university} options={UNIVERSITY_OPTIONS} onChange={(v) => patchEducationPath(plan.id, { university: v as UniversityKind | "none" })} />
              <div className="flex items-end pb-3">
                <Button variant="danger" onClick={() => remove("educationPlans", plan.id)}>削除</Button>
              </div>
            </div>
          </div>
        ))}
        <Button
          variant="secondary"
          onClick={() =>
            setState((s) => ({
              ...s,
              educationPlans: [
                ...(s.educationPlans ?? []),
                {
                  id: uid(),
                  childName: `子ども${(s.educationPlans ?? []).length + 1}`,
                  childCurrentAge: 3,
                  path: defaultEducationPath(),
                },
              ],
            }))
          }
        >
          ＋ 教育費プランを追加
        </Button>
      </Card>

      <Card title="⑧ 公的年金（老後収入として自動反映）">
        {state.pensionProfile ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3">
            <SelectField
              label="加入区分"
              value={state.pensionProfile.category}
              options={[
                { value: "employee", label: "会社員・公務員" },
                { value: "selfEmployed", label: "自営業等" },
              ]}
              onChange={(v) => patchPension({ category: v as PensionCategory })}
            />
            <NumberField label="平均年収" value={state.pensionProfile.averageAnnualIncome} onChange={(v) => patchPension({ averageAnnualIncome: v })} suffix="円" step={100_000} />
            <NumberField label="加入年数" value={state.pensionProfile.enrolledYears} onChange={(v) => patchPension({ enrolledYears: v })} suffix="年" min={1} />
            <NumberField label="受給開始年齢" value={state.pensionProfile.startAge} onChange={(v) => patchPension({ startAge: v })} suffix="歳" min={60} />
            <div className="sm:col-span-4">
              <Button variant="danger" onClick={() => setState((s) => ({ ...s, pensionProfile: null }))}>年金反映を削除</Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => patchPension({})}>＋ 年金をライフプランへ反映</Button>
        )}
      </Card>

      <Card title="⑨ 積立（資産内移転として表示）">
        <p className="text-xs text-gray-500 mb-3">
          積立は消費支出ではなく、現預金から投資等への資産内移転として表示します。キャッシュフローの収支には二重計上しません。
        </p>
        {state.investmentPlans.map((plan) => (
          <div key={plan.id} className="border-b border-gray-100 pb-3 mb-3 last:border-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3">
              <NumberField label="開始年齢" value={plan.startAge ?? selfAge} onChange={(v) => patchInvestment(plan.id, { startAge: v })} suffix="歳" />
              <NumberField label="毎月積立額" value={plan.monthlyAmount} onChange={(v) => patchInvestment(plan.id, { monthlyAmount: v })} suffix="円" step={1_000} />
              <PercentField label="想定年利" value={plan.annualRate} onChange={(v) => patchInvestment(plan.id, { annualRate: v })} />
              <NumberField label="積立年数" value={plan.years} onChange={(v) => patchInvestment(plan.id, { years: v })} suffix="年" min={1} />
              <SelectField label="口座種別" value={plan.accountType} options={[...ACCOUNT_OPTIONS]} onChange={(v) => patchInvestment(plan.id, { accountType: v })} />
              <SelectField label="課税所得帯" value={plan.taxableIncomeBand ?? "band695"} options={BAND_OPTIONS} onChange={(v) => patchInvestment(plan.id, { taxableIncomeBand: v })} />
              <div className="flex items-end pb-3">
                <Button variant="danger" onClick={() => remove("investmentPlans", plan.id)}>削除</Button>
              </div>
            </div>
          </div>
        ))}
        <Button
          variant="secondary"
          onClick={() =>
            setState((s) => ({
              ...s,
              investmentPlans: [
                ...s.investmentPlans,
                {
                  id: uid(),
                  monthlyAmount: 30_000,
                  annualRate: 0.04,
                  years: 20,
                  accountType: "nisa",
                  taxableIncomeBand: "band695",
                  startAge: selfAge,
                },
              ],
            }))
          }
        >
          ＋ 積立プランを追加
        </Button>
      </Card>

      <Card title="⑩ 家計実績（年間生活費の根拠）">
        <p className="text-xs text-gray-500 mb-3">
          月次実績は平均化して、現在年の支出根拠として表示します。継続的な将来支出は「③ 支出」に移すと長期表へ反映できます。
        </p>
        {state.budgetRecords.map((record) => (
          <div key={record.id} className="border-b border-gray-100 pb-3 mb-3 last:border-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3">
              <label className="block mb-3">
                <span className="block text-sm font-medium text-gray-700 mb-1">対象月</span>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  value={record.yearMonth}
                  onChange={(e) => patchBudget(record.id, { yearMonth: e.target.value })}
                />
              </label>
              <NumberField
                label="月収"
                value={record.incomes[0]?.amount ?? 0}
                onChange={(v) => patchBudget(record.id, { incomes: [{ label: "収入", amount: v }] })}
                suffix="円"
                step={10_000}
              />
              <SelectField
                label="主な支出分類"
                value={record.expenses[0]?.category ?? "living"}
                options={EXPENSE_CATEGORIES}
                onChange={(v) => patchBudget(record.id, { expenses: [{ category: v, amount: record.expenses[0]?.amount ?? 0 }] })}
              />
              <NumberField
                label="月支出"
                value={record.expenses[0]?.amount ?? 0}
                onChange={(v) => patchBudget(record.id, { expenses: [{ category: record.expenses[0]?.category ?? "living", amount: v }] })}
                suffix="円"
                step={10_000}
              />
              <div className="flex items-end pb-3">
                <Button variant="danger" onClick={() => remove("budgetRecords", record.id)}>削除</Button>
              </div>
            </div>
          </div>
        ))}
        <Button variant="secondary" onClick={() => setState((s) => ({ ...s, budgetRecords: [...s.budgetRecords, defaultBudgetRecord()] }))}>＋ 家計実績を追加</Button>
      </Card>
    </div>
  );
}
