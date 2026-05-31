// 家計管理（US6）。月次収支の記録と集計。

import { useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { summarizeBudget } from "../../domain/household/budget";
import type {
  AppState,
  BudgetExpenseLine,
  BudgetLine,
  BudgetRecord,
  ExpenseCategory,
} from "../../domain/types";
import { Card, NumberField, SelectField, StatTile, Button } from "../../components/ui";
import { DisclaimerNote } from "../../components/Disclaimer";
import { formatYen, formatPercent } from "../../components/format";

const uid = () => Math.random().toString(36).slice(2, 9);

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  living: "生活費",
  housing: "住居費",
  education: "教育費",
  insurance: "保険",
  other: "その他",
};

const PIE_COLORS = ["#0c7274", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

function emptyRecord(): BudgetRecord {
  return {
    id: uid(),
    yearMonth: CURRENT_MONTH,
    incomes: [{ label: "給与", amount: 0 }],
    expenses: [{ category: "living", amount: 0 }],
  };
}

export function BudgetPage({ state: _state, setState: _setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const [record, setRecord] = useState<BudgetRecord>(emptyRecord);

  const summary = summarizeBudget(record);

  const patchIncome = (idx: number, patch: Partial<BudgetLine>) =>
    setRecord((r) => ({
      ...r,
      incomes: r.incomes.map((x, i) => (i === idx ? { ...x, ...patch } : x)),
    }));

  const patchExpense = (idx: number, patch: Partial<BudgetExpenseLine>) =>
    setRecord((r) => ({
      ...r,
      expenses: r.expenses.map((x, i) => (i === idx ? { ...x, ...patch } : x)),
    }));

  const pieData = summary.byCategory
    .filter((c) => c.amount > 0)
    .map((c) => ({ name: CATEGORY_LABELS[c.category], value: c.amount }));

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800">家計管理</h2>
        <p className="text-sm text-gray-500">月次の収入・支出を入力すると、収支・貯蓄率・内訳が確認できます。</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-5">
          <Card title="収入">
            {record.incomes.map((inc, i) => (
              <div key={i} className="flex gap-2 items-center mb-2">
                <input
                  className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                  value={inc.label}
                  placeholder="項目名"
                  onChange={(e) => patchIncome(i, { label: e.target.value })}
                />
                <NumberField label="" value={inc.amount} onChange={(v) => patchIncome(i, { amount: v })} suffix="円" step={10_000} />
                <Button variant="danger" onClick={() => setRecord((r) => ({ ...r, incomes: r.incomes.filter((_, j) => j !== i) }))}>×</Button>
              </div>
            ))}
            <Button variant="secondary" onClick={() => setRecord((r) => ({ ...r, incomes: [...r.incomes, { label: "その他収入", amount: 0 }] }))}>＋ 収入を追加</Button>
          </Card>

          <Card title="支出">
            {record.expenses.map((exp, i) => (
              <div key={i} className="flex gap-2 items-center mb-2">
                <div className="w-36 shrink-0">
                  <SelectField
                    label=""
                    value={exp.category}
                    options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v as ExpenseCategory, label: l }))}
                    onChange={(v) => patchExpense(i, { category: v as ExpenseCategory })}
                  />
                </div>
                <NumberField label="" value={exp.amount} onChange={(v) => patchExpense(i, { amount: v })} suffix="円" step={10_000} />
                <Button variant="danger" onClick={() => setRecord((r) => ({ ...r, expenses: r.expenses.filter((_, j) => j !== i) }))}>×</Button>
              </div>
            ))}
            <Button variant="secondary" onClick={() => setRecord((r) => ({ ...r, expenses: [...r.expenses, { category: "other", amount: 0 }] }))}>＋ 支出を追加</Button>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="月次収支サマリー">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatTile label="収入合計" value={formatYen(summary.totalIncome)} />
              <StatTile label="支出合計" value={formatYen(summary.totalExpense)} />
              <StatTile label="収支" value={formatYen(summary.balance)} tone={summary.balance >= 0 ? "good" : "warn"} />
              <StatTile label="貯蓄率" value={formatPercent(summary.savingRate)} tone={summary.savingRate >= 0.2 ? "good" : "neutral"} />
            </div>
            <DisclaimerNote />
          </Card>

          {pieData.length > 0 && (
            <Card title="支出カテゴリ内訳">
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatYen(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="text-sm space-y-1 mt-2">
                {summary.byCategory.map((c) => (
                  <li key={c.category} className="flex justify-between text-gray-700">
                    <span>{CATEGORY_LABELS[c.category]}</span>
                    <span className="tabular">{formatYen(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
