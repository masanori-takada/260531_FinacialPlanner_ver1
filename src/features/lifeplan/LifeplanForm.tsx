// ライフプラン入力フォーム（US1）。世帯・収入・支出・資産・ライフイベント・前提を編集する。

import type {
  AppState,
  Asset,
  Expense,
  ExpenseCategory,
  Income,
  LifeEvent,
} from "../../domain/types";
import { Button, Card, NumberField, PercentField, SelectField } from "../../components/ui";

const uid = () => Math.random().toString(36).slice(2, 9);

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "living", label: "生活費" },
  { value: "housing", label: "住居費" },
  { value: "education", label: "教育費" },
  { value: "insurance", label: "保険" },
  { value: "other", label: "その他" },
];

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

  const remove = (key: "incomes" | "expenses" | "assets" | "lifeEvents", id: string) =>
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
          <PercentField
            label="昇給率（収入の増加・既定）"
            value={state.assumptions.salaryGrowthRate}
            onChange={(v) =>
              setState((s) => ({ ...s, assumptions: { ...s.assumptions, salaryGrowthRate: v } }))
            }
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3">
              <NumberField label="年額" value={inc.annualAmount} onChange={(v) => patchIncome(inc.id, { annualAmount: v })} suffix="円" step={100000} />
              <NumberField label="開始年齢" value={inc.startAge} onChange={(v) => patchIncome(inc.id, { startAge: v })} suffix="歳" />
              <NumberField label="終了年齢" value={inc.endAge} onChange={(v) => patchIncome(inc.id, { endAge: v })} suffix="歳" />
              <div className="flex items-end pb-3">
                <Button variant="danger" onClick={() => remove("incomes", inc.id)}>削除</Button>
              </div>
            </div>
          </div>
        ))}
        <Button variant="secondary" onClick={() => setState((s) => ({ ...s, incomes: [...s.incomes, { id: uid(), label: "新しい収入", annualAmount: 0, startAge: selfAge, endAge: 64 }] }))}>＋ 収入を追加</Button>
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
    </div>
  );
}
