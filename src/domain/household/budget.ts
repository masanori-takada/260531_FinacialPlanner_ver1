// 家計管理の月次集計（US6）。純粋関数。

import type { BudgetRecord, BudgetSummary, ExpenseCategory } from "../types";

export function summarizeBudget(record: BudgetRecord): BudgetSummary {
  const totalIncome = record.incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpense = record.expenses.reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalExpense;
  const savingRate = totalIncome > 0 ? balance / totalIncome : 0;

  // カテゴリ別集計
  const categoryMap = new Map<ExpenseCategory, number>();
  for (const e of record.expenses) {
    categoryMap.set(e.category, (categoryMap.get(e.category) ?? 0) + e.amount);
  }
  const byCategory = Array.from(categoryMap.entries()).map(([category, amount]) => ({
    category,
    amount,
  }));

  return { totalIncome, totalExpense, balance, savingRate, byCategory };
}
