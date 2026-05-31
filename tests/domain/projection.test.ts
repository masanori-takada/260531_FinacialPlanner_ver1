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
        endAge: 37,
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
});
