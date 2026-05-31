// 各機能の入力を年次キャッシュフロー明細へ正規化する。
// キャッシュフロー表を唯一の正本にするため、ここで収入・支出・資産移転をMECEに分類する。

import type {
  AnnualCashflowItem,
  AppState,
  CashflowItemType,
  CashflowSourceKind,
} from "../types";
import { educationCostSchedule } from "../education/cost";
import { buildAmortization } from "../finance/loan";
import { yen, safeNumber } from "../finance/rounding";
import { summarizeBudget } from "../household/budget";
import { estimatePension } from "../pension/estimate";
import { PENSION_MAX_AGE, PENSION_MIN_AGE } from "../constants/pension";

export function selfCurrentAge(state: AppState): number {
  const self = state.household.members.find((m) => m.role === "self");
  if (!self) return 0;
  return state.assumptions.currentYear - self.birthYear;
}

function item(args: {
  sourceKind: CashflowSourceKind;
  sourceId: string;
  label: string;
  age: number;
  startAge: number;
  currentYear: number;
  type: CashflowItemType;
  amount: number;
}): AnnualCashflowItem {
  const year = args.currentYear + (args.age - args.startAge);
  return {
    id: `${args.sourceKind}:${args.sourceId}:${args.type}:${args.age}`,
    sourceKind: args.sourceKind,
    sourceId: args.sourceId,
    label: args.label,
    age: args.age,
    year,
    type: args.type,
    amount: yen(args.amount),
  };
}

function addAnnualAmount(
  map: Map<number, number>,
  yearOffset: number,
  amount: number,
): void {
  map.set(yearOffset, (map.get(yearOffset) ?? 0) + amount);
}

export function normalizeCashflowSources(state: AppState): AnnualCashflowItem[] {
  const startAge = selfCurrentAge(state);
  const { endAge, currentYear } = state.assumptions;
  const items: AnnualCashflowItem[] = [];

  for (let age = startAge; age <= endAge; age++) {
    const yearIndex = age - startAge;

    for (const inc of state.incomes) {
      if (age >= inc.startAge && age <= inc.endAge) {
        const g = inc.growthRate ?? 0;
        items.push(
          item({
            sourceKind: "manualIncome",
            sourceId: inc.id,
            label: inc.label,
            age,
            startAge,
            currentYear,
            type: "income",
            amount: safeNumber(inc.annualAmount) * Math.pow(1 + g, yearIndex),
          }),
        );
      }
    }

    for (const exp of state.expenses) {
      const from = exp.startAge ?? startAge;
      const to = exp.endAge ?? endAge;
      if (age >= from && age <= to) {
        const g = exp.growthRate ?? 0;
        items.push(
          item({
            sourceKind: "manualExpense",
            sourceId: exp.id,
            label: exp.label,
            age,
            startAge,
            currentYear,
            type: "expense",
            amount: safeNumber(exp.annualAmount) * Math.pow(1 + g, yearIndex),
          }),
        );
      }
    }
  }

  for (const ev of state.lifeEvents) {
    if (ev.age >= startAge && ev.age <= endAge) {
      items.push(
        item({
          sourceKind: "lifeEvent",
          sourceId: ev.id,
          label: ev.label,
          age: ev.age,
          startAge,
          currentYear,
          type: ev.kind,
          amount: safeNumber(ev.amount),
        }),
      );
    }
  }

  for (const plan of state.educationPlans ?? []) {
    const schedule = educationCostSchedule(plan.childCurrentAge, plan.path);
    for (const row of schedule.perYear) {
      if (row.cost <= 0) continue;
      const age = startAge + (row.age - plan.childCurrentAge);
      if (age < startAge || age > endAge) continue;
      items.push(
        item({
          sourceKind: "education",
          sourceId: plan.id,
          label: `${plan.childName || "子ども"} 教育費`,
          age,
          startAge,
          currentYear,
          type: "expense",
          amount: row.cost,
        }),
      );
    }
  }

  if (state.pensionProfile) {
    const pension = estimatePension(state.pensionProfile);
    const clampedPensionStartAge = Math.max(
      PENSION_MIN_AGE,
      Math.min(PENSION_MAX_AGE, state.pensionProfile.startAge),
    );
    const pensionStartAge = Math.max(startAge, clampedPensionStartAge);
    for (let age = pensionStartAge; age <= endAge; age++) {
      items.push(
        item({
          sourceKind: "pension",
          sourceId: "pensionProfile",
          label: "公的年金（概算）",
          age,
          startAge,
          currentYear,
          type: "income",
          amount: pension.totalAnnual,
        }),
      );
    }
  }

  for (const loan of state.loans ?? []) {
    const loanStartAge = loan.startAge ?? startAge;
    const annualPayments = new Map<number, number>();
    for (const row of buildAmortization(loan).rows) {
      const yearOffset = Math.floor((row.index - 1) / 12);
      addAnnualAmount(annualPayments, yearOffset, row.payment);
    }
    for (const [yearOffset, amount] of annualPayments.entries()) {
      const age = loanStartAge + yearOffset;
      if (age < startAge || age > endAge) continue;
      items.push(
        item({
          sourceKind: "loan",
          sourceId: loan.id,
          label: "住宅ローン返済",
          age,
          startAge,
          currentYear,
          type: "expense",
          amount,
        }),
      );
    }
  }

  for (const plan of state.investmentPlans ?? []) {
    const planStartAge = plan.startAge ?? startAge;
    for (let i = 0; i < safeNumber(plan.years); i++) {
      const age = planStartAge + i;
      if (age < startAge || age > endAge) continue;
      items.push(
        item({
          sourceKind: "investment",
          sourceId: plan.id,
          label: `${plan.accountType.toUpperCase()} 積立（資産内移転）`,
          age,
          startAge,
          currentYear,
          type: "assetTransfer",
          amount: safeNumber(plan.monthlyAmount) * 12,
        }),
      );
    }
  }

  if ((state.budgetRecords ?? []).length > 0) {
    const byCategory = new Map<string, number>();
    for (const record of state.budgetRecords) {
      const summary = summarizeBudget(record);
      for (const entry of summary.byCategory) {
        byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + entry.amount);
      }
    }
    for (const [category, monthlyTotal] of byCategory.entries()) {
      const annualAmount = (monthlyTotal / state.budgetRecords.length) * 12;
      items.push(
        item({
          sourceKind: "budget",
          sourceId: category,
          label: `家計実績ベース ${category}`,
          age: startAge,
          startAge,
          currentYear,
          type: "expense",
          amount: annualAmount,
        }),
      );
    }
  }

  return items.filter((x) => x.amount > 0);
}
