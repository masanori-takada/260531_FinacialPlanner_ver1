// ライフプランのサンプル入力（SC-001: 5分以内に最初の結果へ到達するための例）。

import type { AppState } from "./types";

export function applySampleLifeplan(state: AppState): AppState {
  const currentYear = state.assumptions.currentYear;
  return {
    ...state,
    household: {
      members: [
        { id: "self", role: "self", name: "本人", birthYear: currentYear - 35 },
        { id: "spouse", role: "spouse", name: "配偶者", birthYear: currentYear - 33 },
        { id: "child1", role: "child", name: "第一子", birthYear: currentYear - 3 },
      ],
    },
    incomes: [
      { id: "i-self", label: "本人 給与（手取り）", annualAmount: 4_200_000, startAge: 35, endAge: 64, growthRate: 0.01 },
      { id: "i-spouse", label: "配偶者 給与（手取り）", annualAmount: 2_400_000, startAge: 35, endAge: 59, growthRate: 0.01 },
    ],
    expenses: [
      { id: "e-living", label: "生活費", category: "living", annualAmount: 3_000_000, growthRate: 0.01 },
      { id: "e-housing", label: "住居費（家賃/ローン）", category: "housing", annualAmount: 1_440_000, endAge: 64, growthRate: 0.01 },
    ],
    assets: [
      { id: "a-cash", label: "預貯金", balance: 5_000_000, annualReturnRate: 0.001 },
      { id: "a-invest", label: "投資（NISA等）", balance: 2_000_000, annualReturnRate: 0.03 },
    ],
    lifeEvents: [
      { id: "ev-retire", label: "退職金", age: 65, amount: 12_000_000, kind: "income" },
      { id: "ev-car", label: "車の買い替え", age: 45, amount: 2_500_000, kind: "expense" },
      { id: "ev-pension", label: "公的年金（概算・夫婦）", age: 65, amount: 2_600_000, kind: "income" },
    ],
    assumptions: {
      ...state.assumptions,
      endAge: 95,
      inflationRate: 0,
      salaryGrowthRate: 0,
    },
  };
}
