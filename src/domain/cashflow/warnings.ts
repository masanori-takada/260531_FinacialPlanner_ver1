// 統合キャッシュフローの「抜け漏れ・ダブり」を利用者に知らせるための警告検出。
// 純粋関数。各機能を1つの年次表へ集約する設計上、二重計上やendAge超過の打ち切りが
// 起こりうるため、ドメイン層で検出してUIに提示する（MECEの担保を支援する）。

import type { AppState, CashflowWarning } from "../types";
import { buildAmortization } from "../finance/loan";
import { PENSION_MAX_AGE, PENSION_MIN_AGE } from "../constants/pension";
import { selfCurrentAge } from "./sources";

const EDUCATION_END_AGE = 22; // 教育費スケジュールの最終年齢（大学4年）

export function detectCashflowWarnings(state: AppState): CashflowWarning[] {
  const warnings: CashflowWarning[] = [];
  const startAge = selfCurrentAge(state);
  const { endAge } = state.assumptions;

  // --- 二重計上の可能性 ---
  if (
    state.loans.length > 0 &&
    state.expenses.some((e) => e.category === "housing")
  ) {
    warnings.push({
      kind: "duplicate-housing",
      message:
        "住居費（手入力）と住宅ローンの両方が入力されています。同じ返済を二重計上していないか確認してください。",
    });
  }

  if (
    (state.educationPlans ?? []).length > 0 &&
    state.expenses.some((e) => e.category === "education")
  ) {
    warnings.push({
      kind: "duplicate-education",
      message:
        "教育費（手入力）と教育費プランの両方が入力されています。同じ教育費を二重計上していないか確認してください。",
    });
  }

  if (
    state.pensionProfile &&
    (state.incomes.some((i) => i.label.includes("年金")) ||
      state.lifeEvents.some((e) => e.kind === "income" && e.label.includes("年金")))
  ) {
    warnings.push({
      kind: "duplicate-pension",
      message:
        "年金（手入力の収入/イベント）と公的年金プランの両方が入力されています。二重計上していないか確認してください。",
    });
  }

  if (state.budgetRecords.length > 0 && state.expenses.length > 0) {
    warnings.push({
      kind: "duplicate-budget",
      message:
        "家計実績は年間支出の根拠として現在年に反映されます。同じ支出を『③ 支出』にも入れている場合は二重計上に注意してください。",
    });
  }

  // --- endAge を超える項目（黙って打ち切られる）---
  for (const loan of state.loans) {
    const loanStartAge = loan.startAge ?? startAge;
    const months = buildAmortization(loan).monthsToPayoff;
    if (months <= 0) continue;
    const payoffAge = loanStartAge + Math.ceil(months / 12) - 1;
    if (payoffAge > endAge) {
      warnings.push({
        kind: "loan-beyond-end",
        message: `住宅ローンの返済完了（約${payoffAge}歳）が試算終了年齢（${endAge}歳）を超えています。終了年齢以降の返済は表に含まれません。`,
      });
    }
  }

  if (state.pensionProfile) {
    const clampedStart = Math.max(
      PENSION_MIN_AGE,
      Math.min(PENSION_MAX_AGE, state.pensionProfile.startAge),
    );
    if (clampedStart > endAge) {
      warnings.push({
        kind: "pension-beyond-end",
        message: `年金の受給開始年齢（${clampedStart}歳）が試算終了年齢（${endAge}歳）を超えています。年金収入が表に反映されません。`,
      });
    }
  }

  for (const plan of state.educationPlans ?? []) {
    const lastAge = startAge + (EDUCATION_END_AGE - plan.childCurrentAge);
    if (plan.childCurrentAge <= EDUCATION_END_AGE && lastAge > endAge) {
      warnings.push({
        kind: "education-beyond-end",
        message: `${plan.childName || "子ども"}の教育費の一部が試算終了年齢（${endAge}歳）以降になります。終了年齢以降の教育費は表に含まれません。`,
      });
    }
  }

  return warnings;
}
