import { describe, it, expect } from "vitest";
import { projectCashflow } from "../../src/domain/cashflow/projection";
import { createDefaultState } from "../../src/store/persistence";
import type { AppState } from "../../src/domain/types";

// テスト用に最小構成のAppStateを作るヘルパ。
function baseState(overrides: Partial<AppState> = {}): AppState {
  const s = createDefaultState();
  s.household.members = [{ id: "self", role: "self", name: "本人", birthYear: 1990 }];
  s.assumptions = {
    currentYear: 2025, // 本人35歳
    endAge: 40,
    inflationRate: 0,
    salaryGrowthRate: 0,
  };
  return { ...s, ...overrides };
}

describe("projectCashflow", () => {
  it("収入500万・支出400万・貯蓄500万で毎年100万ずつ増える", () => {
    const state = baseState({
      incomes: [
        { id: "i1", label: "給与", annualAmount: 5_000_000, startAge: 35, endAge: 40 },
      ],
      expenses: [
        { id: "e1", label: "生活費", category: "living", annualAmount: 4_000_000 },
      ],
      assets: [{ id: "a1", label: "預金", balance: 5_000_000 }],
    });

    const result = projectCashflow(state);

    // 35〜40歳の6行
    expect(result.rows).toHaveLength(6);
    const first = result.rows[0];
    expect(first.age).toBe(35);
    expect(first.year).toBe(2025);
    expect(first.income).toBe(5_000_000);
    expect(first.expense).toBe(4_000_000);
    expect(first.net).toBe(1_000_000);
    expect(first.balance).toBe(6_000_000); // 500万 + 100万
    // 6年後（40歳）: 500万 + 100万×6 = 1100万
    expect(result.rows[5].balance).toBe(11_000_000);
    // 一度も枯渇しない
    expect(result.depletionAge).toBeNull();
  });

  it("支出が収入を上回ると資産が枯渇し、その年齢を検出する", () => {
    const state = baseState({
      incomes: [
        { id: "i1", label: "給与", annualAmount: 3_000_000, startAge: 35, endAge: 40 },
      ],
      expenses: [
        { id: "e1", label: "生活費", category: "living", annualAmount: 5_000_000 },
      ],
      assets: [{ id: "a1", label: "預金", balance: 3_000_000 }],
    });

    const result = projectCashflow(state);
    // 毎年 -200万。初期300万 → 35歳末で100万, 36歳末で-100万 → 枯渇は36歳
    expect(result.rows[0].balance).toBe(1_000_000);
    expect(result.rows[1].balance).toBe(-1_000_000);
    expect(result.depletionAge).toBe(36);
  });

  it("ライフイベント（退職金）が該当年の収入に加算される", () => {
    const state = baseState({
      assumptions: {
        currentYear: 2025,
        endAge: 66,
        inflationRate: 0,
        salaryGrowthRate: 0,
      },
      incomes: [],
      expenses: [],
      assets: [{ id: "a1", label: "預金", balance: 0 }],
      lifeEvents: [
        { id: "ev1", label: "退職金", age: 36, amount: 10_000_000, kind: "income" },
      ],
    });

    const result = projectCashflow(state);
    // 35歳: 収支0 残高0、36歳: +1000万、37歳: 据え置き
    expect(result.rows[0].balance).toBe(0);
    expect(result.rows[1].income).toBe(10_000_000);
    expect(result.rows[1].balance).toBe(10_000_000);
    expect(result.rows[2].balance).toBe(10_000_000);
  });

  it("インフレ率2%で支出が複利的に増える", () => {
    const state = baseState({
      assumptions: {
        currentYear: 2025,
        endAge: 36,
        inflationRate: 0.02,
        salaryGrowthRate: 0,
      },
      incomes: [],
      expenses: [
        { id: "e1", label: "生活費", category: "living", annualAmount: 1_000_000 },
      ],
      assets: [{ id: "a1", label: "預金", balance: 10_000_000 }],
    });

    const result = projectCashflow(state);
    // 35歳の支出は100万（初年は上昇なし）、36歳は102万
    expect(result.rows[0].expense).toBe(1_000_000);
    expect(result.rows[1].expense).toBe(1_020_000);
  });

  it("既定昇給率で個別未指定の収入が複利的に増える", () => {
    const state = baseState({
      assumptions: {
        currentYear: 2025,
        endAge: 36,
        inflationRate: 0,
        salaryGrowthRate: 0.02,
      },
      incomes: [
        { id: "i1", label: "給与", annualAmount: 5_000_000, startAge: 35, endAge: 36 },
      ],
      expenses: [],
      assets: [],
    });

    const result = projectCashflow(state);

    expect(result.rows[0].income).toBe(5_000_000);
    expect(result.rows[1].income).toBe(5_100_000);
  });

  it("個別昇給率がある収入は既定昇給率より優先される", () => {
    const state = baseState({
      assumptions: {
        currentYear: 2025,
        endAge: 36,
        inflationRate: 0,
        salaryGrowthRate: 0.05,
      },
      incomes: [
        {
          id: "i1",
          label: "給与",
          annualAmount: 5_000_000,
          startAge: 35,
          endAge: 36,
          growthRate: 0.01,
        },
      ],
      expenses: [],
      assets: [],
    });

    const result = projectCashflow(state);

    expect(result.rows[1].income).toBe(5_050_000);
  });

  it("資産の運用利回りが残高に複利で効く", () => {
    const state = baseState({
      assumptions: {
        currentYear: 2025,
        endAge: 36,
        inflationRate: 0,
        salaryGrowthRate: 0,
      },
      incomes: [],
      expenses: [],
      assets: [{ id: "a1", label: "投資", balance: 1_000_000, annualReturnRate: 0.05 }],
    });

    const result = projectCashflow(state);
    // 35歳末: 100万×1.05=105万、36歳末: 105万×1.05=110.25万
    expect(result.rows[0].balance).toBe(1_050_000);
    expect(result.rows[1].balance).toBe(1_102_500);
  });

  it("教育費・年金・住宅ローン・積立をMECEな年次明細として統合する", () => {
    const state = baseState({
      assumptions: {
        currentYear: 2025,
        endAge: 66,
        inflationRate: 0,
        salaryGrowthRate: 0,
      },
      incomes: [
        { id: "salary", label: "給与", annualAmount: 5_000_000, startAge: 35, endAge: 66 },
      ],
      expenses: [],
      assets: [{ id: "cash", label: "預金", balance: 0 }],
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
      pensionProfile: {
        category: "selfEmployed",
        averageAnnualIncome: 0,
        enrolledYears: 40,
        startAge: 65,
      },
      loans: [
        {
          id: "loan1",
          principal: 1_200_000,
          annualRate: 0,
          years: 1,
          method: "equalPayment",
          prepayments: [],
          startAge: 35,
        },
      ],
      investmentPlans: [
        {
          id: "inv1",
          monthlyAmount: 30_000,
          annualRate: 0.03,
          years: 2,
          accountType: "nisa",
          startAge: 35,
        },
      ],
    });

    const result = projectCashflow(state);
    const age35 = result.rows[0];
    const age36 = result.rows[1];
    const age65 = result.rows.find((r) => r.age === 65);

    expect(age35.income).toBe(5_000_000);
    expect(age35.expense).toBe(1_553_000); // 住宅ローン120万円 + 小学校公立35.3万円
    expect(age35.assetTransfer).toBe(360_000);
    expect(age35.net).toBe(3_447_000);
    expect(age35.sourceBreakdown.map((x) => x.sourceKind)).toEqual([
      "manualIncome",
      "education",
      "loan",
      "investment",
    ]);

    expect(age36.income).toBe(5_000_000);
    expect(age36.expense).toBe(353_000);
    expect(age36.assetTransfer).toBe(360_000);
    expect(age36.sourceBreakdown.some((x) => x.sourceKind === "loan")).toBe(false);
    expect(age65?.income).toBe(5_816_000); // 給与500万円 + 満額基礎年金81.6万円
    expect(age65?.sourceBreakdown.some((x) => x.sourceKind === "pension")).toBe(true);
    expect(result.sources.filter((x) => x.age === 35 && x.type === "expense")).toHaveLength(2);
  });
});
