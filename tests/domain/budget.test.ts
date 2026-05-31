import { describe, it, expect } from "vitest";
import { summarizeBudget } from "../../src/domain/household/budget";
import type { BudgetRecord } from "../../src/domain/types";

const record: BudgetRecord = {
  id: "2025-01",
  yearMonth: "2025-01",
  incomes: [
    { label: "給与", amount: 400_000 },
    { label: "副業", amount: 50_000 },
  ],
  expenses: [
    { category: "living", amount: 150_000 },
    { category: "housing", amount: 100_000 },
    { category: "other", amount: 30_000 },
  ],
};

describe("summarizeBudget", () => {
  it("収入合計が正しい", () => {
    const result = summarizeBudget(record);
    expect(result.totalIncome).toBe(450_000);
  });

  it("支出合計が正しい", () => {
    const result = summarizeBudget(record);
    expect(result.totalExpense).toBe(280_000);
  });

  it("収支 = 収入 - 支出", () => {
    const result = summarizeBudget(record);
    expect(result.balance).toBe(170_000);
  });

  it("貯蓄率 ≈ 収支 / 収入", () => {
    const result = summarizeBudget(record);
    expect(result.savingRate).toBeCloseTo(170_000 / 450_000, 5);
  });

  it("カテゴリ別内訳が全支出分揃う", () => {
    const result = summarizeBudget(record);
    const total = result.byCategory.reduce((s, c) => s + c.amount, 0);
    expect(total).toBe(280_000);
  });

  it("収入0のとき貯蓄率は0（ゼロ除算しない）", () => {
    const zero: BudgetRecord = { ...record, incomes: [] };
    const result = summarizeBudget(zero);
    expect(result.savingRate).toBe(0);
  });
});
