// 生涯キャッシュフロー投影（US1の中核）。純粋関数。
// 本人の現在年齢から endAge までの年次の収入・支出・収支・資産残高を計算し、
// 資産が初めて負になる年齢（枯渇年齢）を検出する。

import type { AppState, CashflowResult, CashflowRow } from "../types";
import { yen, safeNumber } from "../finance/rounding";

/** 本人の現在年齢を求める。本人が居なければ0。 */
function selfCurrentAge(state: AppState): number {
  const self = state.household.members.find((m) => m.role === "self");
  if (!self) return 0;
  return state.assumptions.currentYear - self.birthYear;
}

/** 資産の初期残高合計。 */
function initialBalance(state: AppState): number {
  return state.assets.reduce((sum, a) => sum + safeNumber(a.balance), 0);
}

/**
 * 資産全体の加重平均利回り（残高で加重）。
 * 残高合計が0なら0。複数資産を単一ポートフォリオとして扱う簡略モデル。
 */
function portfolioReturnRate(state: AppState): number {
  const total = initialBalance(state);
  if (total <= 0) return 0;
  const weighted = state.assets.reduce(
    (sum, a) => sum + safeNumber(a.balance) * safeNumber(a.annualReturnRate ?? 0),
    0,
  );
  return weighted / total;
}

export function projectCashflow(state: AppState): CashflowResult {
  const startAge = selfCurrentAge(state);
  const { endAge, currentYear, inflationRate, salaryGrowthRate } =
    state.assumptions;
  const returnRate = portfolioReturnRate(state);

  const rows: CashflowRow[] = [];
  let balance = initialBalance(state);
  let depletionAge: number | null = null;

  for (let age = startAge; age <= endAge; age++) {
    const yearIndex = age - startAge; // 投影開始からの経過年（0始まり）
    const year = currentYear + yearIndex;

    // 収入: 該当年齢で有効な定常収入 ＋ ライフイベント（kind=income）
    let income = 0;
    for (const inc of state.incomes) {
      if (age >= inc.startAge && age <= inc.endAge) {
        const g = inc.growthRate ?? salaryGrowthRate;
        income += safeNumber(inc.annualAmount) * Math.pow(1 + g, yearIndex);
      }
    }
    // 支出: 該当年齢で有効な定常支出 ＋ ライフイベント（kind=expense）
    let expense = 0;
    for (const exp of state.expenses) {
      const from = exp.startAge ?? startAge;
      const to = exp.endAge ?? endAge;
      if (age >= from && age <= to) {
        const g = exp.growthRate ?? inflationRate;
        expense += safeNumber(exp.annualAmount) * Math.pow(1 + g, yearIndex);
      }
    }
    for (const ev of state.lifeEvents) {
      if (ev.age === age) {
        if (ev.kind === "income") income += safeNumber(ev.amount);
        else expense += safeNumber(ev.amount);
      }
    }

    income = yen(income);
    expense = yen(expense);
    const net = income - expense;

    // 残高更新: 前年残高に運用利回りを乗じ、当年の収支を加える
    balance = yen(balance * (1 + returnRate) + net);

    if (depletionAge === null && balance < 0) {
      depletionAge = age;
    }

    rows.push({ age, year, income, expense, net, balance });
  }

  return { rows, depletionAge };
}
