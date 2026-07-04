import { describe, it, expect } from "vitest";
import { detectCashflowWarnings } from "../../src/domain/cashflow/warnings";
import { createDefaultState } from "../../src/store/persistence";
import type { AppState } from "../../src/domain/types";

function baseState(overrides: Partial<AppState> = {}): AppState {
  const s = createDefaultState();
  s.household.members = [{ id: "self", role: "self", name: "本人", birthYear: 1990 }];
  s.assumptions = {
    currentYear: 2025, // 本人35歳
    endAge: 60,
    inflationRate: 0,
    salaryGrowthRate: 0,
  };
  return { ...s, ...overrides };
}

describe("detectCashflowWarnings", () => {
  it("問題のない入力では警告を出さない", () => {
    const state = baseState({
      incomes: [{ id: "i1", label: "給与", annualAmount: 5_000_000, startAge: 35, endAge: 60 }],
      expenses: [{ id: "e1", label: "生活費", category: "living", annualAmount: 3_000_000 }],
    });
    expect(detectCashflowWarnings(state)).toHaveLength(0);
  });

  it("住居費の手入力とローンの併用で二重計上警告を出す", () => {
    const state = baseState({
      expenses: [{ id: "e1", label: "住居費", category: "housing", annualAmount: 1_200_000 }],
      loans: [
        { id: "l1", principal: 30_000_000, annualRate: 0.01, years: 35, method: "equalPayment", prepayments: [], startAge: 35 },
      ],
    });
    const kinds = detectCashflowWarnings(state).map((w) => w.kind);
    expect(kinds).toContain("duplicate-housing");
  });

  it("教育費の手入力と教育プランの併用で二重計上警告を出す", () => {
    const state = baseState({
      expenses: [{ id: "e1", label: "教育費", category: "education", annualAmount: 500_000 }],
      educationPlans: [
        {
          id: "edu1",
          childName: "第一子",
          childCurrentAge: 6,
          path: {
            kindergarten: "public",
            elementary: "public",
            juniorHigh: "public",
            highSchool: "public",
            university: "none",
          },
        },
      ],
    });
    const kinds = detectCashflowWarnings(state).map((w) => w.kind);
    expect(kinds).toContain("duplicate-education");
  });

  it("年金の手入力収入と年金プランの併用で二重計上警告を出す", () => {
    const state = baseState({
      incomes: [{ id: "i1", label: "公的年金", annualAmount: 800_000, startAge: 65, endAge: 95 }],
      pensionProfile: { category: "employee", averageAnnualIncome: 5_000_000, enrolledYears: 40, startAge: 65 },
    });
    const kinds = detectCashflowWarnings(state).map((w) => w.kind);
    expect(kinds).toContain("duplicate-pension");
  });

  it("返済完了が試算終了年齢を超えるローンで警告を出す", () => {
    const state = baseState({
      assumptions: { currentYear: 2025, endAge: 50, inflationRate: 0, salaryGrowthRate: 0 },
      loans: [
        { id: "l1", principal: 30_000_000, annualRate: 0.01, years: 35, method: "equalPayment", prepayments: [], startAge: 35 },
      ],
    });
    const kinds = detectCashflowWarnings(state).map((w) => w.kind);
    expect(kinds).toContain("loan-beyond-end");
  });

  it("年金受給開始が試算終了年齢を超える場合に警告を出す", () => {
    const state = baseState({
      assumptions: { currentYear: 2025, endAge: 62, inflationRate: 0, salaryGrowthRate: 0 },
      pensionProfile: { category: "employee", averageAnnualIncome: 5_000_000, enrolledYears: 40, startAge: 65 },
    });
    const kinds = detectCashflowWarnings(state).map((w) => w.kind);
    expect(kinds).toContain("pension-beyond-end");
  });

  it("教育費が試算終了年齢以降に及ぶ場合に警告を出す", () => {
    const state = baseState({
      assumptions: { currentYear: 2025, endAge: 40, inflationRate: 0, salaryGrowthRate: 0 },
      educationPlans: [
        {
          id: "edu1",
          childName: "第一子",
          childCurrentAge: 3,
          path: {
            kindergarten: "public",
            elementary: "public",
            juniorHigh: "public",
            highSchool: "public",
            university: "privateScience",
          },
        },
      ],
    });
    const kinds = detectCashflowWarnings(state).map((w) => w.kind);
    expect(kinds).toContain("education-beyond-end");
  });

  it("家計実績と手動支出の両方があるときに重複警告を生成すること", () => {
    const state = baseState({
      expenses: [{ id: "e1", label: "生活費", category: "living", annualAmount: 100_000 }],
      budgetRecords: [
        {
          id: "b1",
          yearMonth: "2025-01",
          incomes: [],
          expenses: [{ category: "living", amount: 10_000 }],
        },
      ],
    });
    const warnings = detectCashflowWarnings(state);
    expect(warnings.some((w) => w.kind === "duplicate-budget")).toBe(true);
  });

  it("各種未定義値や空名称などのエッジケースに対する警告生成の動作確認", () => {
    const state = baseState({
      educationPlans: undefined,
      loans: [
        {
          id: "l1",
          principal: 0,
          annualRate: 0,
          years: 10,
          method: "equalPayment",
          prepayments: [],
          startAge: undefined,
        },
      ],
    });
    const warnings = detectCashflowWarnings(state);
    expect(warnings).toHaveLength(0);
  });

  it("名前のない教育費プランで試算終了年齢を超える場合にデフォルト名で警告を出すこと", () => {
    const state = baseState({
      assumptions: { currentYear: 2025, endAge: 40, inflationRate: 0, salaryGrowthRate: 0 },
      educationPlans: [
        {
          id: "edu1",
          childName: "",
          childCurrentAge: 3,
          path: {
            kindergarten: "public",
            elementary: "public",
            juniorHigh: "public",
            highSchool: "public",
            university: "privateScience",
          },
        },
      ],
    });
    const warnings = detectCashflowWarnings(state);
    const targetWarning = warnings.find((w) => w.kind === "education-beyond-end");
    expect(targetWarning?.message).toContain("子ども");
  });
});
