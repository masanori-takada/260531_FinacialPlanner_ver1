// 生涯キャッシュフロー投影（US1の中核）。純粋関数。
// 本人の現在年齢から endAge までの年次の収入・支出・収支・資産残高を計算し、
// 資産が初めて負になる年齢（枯渇年齢）を検出する。

import type { AppState, CashflowResult, CashflowRow } from "../types";
import { yen, safeNumber } from "../finance/rounding";
import { normalizeCashflowSources, selfCurrentAge } from "./sources";

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
  const { endAge, currentYear } = state.assumptions;
  const returnRate = portfolioReturnRate(state);
  const sources = normalizeCashflowSources(state);

  const rows: CashflowRow[] = [];
  let balance = initialBalance(state);
  let depletionAge: number | null = null;

  for (let age = startAge; age <= endAge; age++) {
    const yearIndex = age - startAge; // 投影開始からの経過年（0始まり）
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

    // 残高更新: 前年残高がプラスの場合のみ運用利回りを乗じ、当年の収支を加える
    const interest = balance > 0 ? balance * returnRate : 0;
    balance = yen(balance + interest + net);

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
