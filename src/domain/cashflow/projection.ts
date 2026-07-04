// 生涯キャッシュフロー投影（US1の中核）。純粋関数。
// 本人の現在年齢から endAge までの年次の収入・支出・収支・資産残高を計算し、
// 資産が初めて負になる年齢（枯渇年齢）を検出する。

import type { AppState, CashflowResult, CashflowRow } from "../types";
import { yen, safeNumber } from "../finance/rounding";
import { normalizeCashflowSources, selfCurrentAge } from "./sources";

export function projectCashflow(state: AppState): CashflowResult {
  const startAge = selfCurrentAge(state);
  const { endAge, currentYear } = state.assumptions;
  const sources = normalizeCashflowSources(state);

  const assetsTracker = (state.assets && state.assets.length > 0)
    ? state.assets.map(a => ({
        id: a.id,
        balance: safeNumber(a.balance),
        rate: safeNumber(a.annualReturnRate ?? 0)
      }))
    : [{ id: "default_cash", balance: 0, rate: 0 }];

  const rows: CashflowRow[] = [];
  let depletionAge: number | null = null;

  for (let age = startAge; age <= endAge; age++) {
    const yearIndex = age - startAge;
    const year = currentYear + yearIndex;
    const yearSources = sources.filter((x) => x.age === age);
    const income = yen(
      yearSources
        .filter((x) => x.type === "income")
        .reduce((sum, x) => sum + x.amount, 0),
    );
    const expense = yen(
      yearSources
        .filter((x) => x.type === "expense")
        .reduce((sum, x) => sum + x.amount, 0),
    );
    const assetTransfer = yen(
      yearSources
        .filter((x) => x.type === "assetTransfer")
        .reduce((sum, x) => sum + x.amount, 0),
    );
    const net = income - expense;

    for (const a of assetsTracker) {
      if (a.balance > 0) {
        const interest = a.balance * a.rate;
        a.balance = yen(a.balance + interest);
      }
    }

    const lowest = assetsTracker.reduce((min, cur) => cur.rate < min.rate ? cur : min, assetsTracker[0]);
    const highest = assetsTracker.reduce((max, cur) => cur.rate > max.rate ? cur : max, assetsTracker[0]);

    if (assetTransfer > 0) {
      if (lowest) {
        lowest.balance = yen(lowest.balance - assetTransfer);
      }
      if (highest && highest.rate > 0) {
        highest.balance = yen(highest.balance + assetTransfer);
      } else if (lowest) {
        lowest.balance = yen(lowest.balance + assetTransfer);
      }
    }

    if (net >= 0) {
      if (lowest) {
        lowest.balance = yen(lowest.balance + net);
      }
    } else {
      let deficit = -net;
      const sorted = [...assetsTracker].sort((a, b) => a.rate - b.rate);
      for (const a of sorted) {
        if (deficit <= 0) break;
        if (a.balance > 0) {
          const withdraw = Math.min(a.balance, deficit);
          a.balance = yen(a.balance - withdraw);
          deficit -= withdraw;
        }
      }
      if (deficit > 0 && lowest) {
        lowest.balance = yen(lowest.balance - deficit);
      }
    }

    const balance = yen(assetsTracker.reduce((sum, a) => sum + a.balance, 0));

    if (depletionAge === null && balance < 0) {
      depletionAge = age;
    }

    rows.push({
      age,
      year,
      income,
      expense,
      assetTransfer,
      net,
      balance,
      sourceBreakdown: yearSources.map((x) => ({
        sourceKind: x.sourceKind,
        label: x.label,
        type: x.type,
        amount: x.amount,
      })),
    });
  }

  return { rows, depletionAge, sources };
}
