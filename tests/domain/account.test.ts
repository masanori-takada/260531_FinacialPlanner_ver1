import { describe, it, expect } from "vitest";
import { compareAccounts } from "../../src/domain/investment/account";

const basePlan = {
  id: "t",
  monthlyAmount: 30_000,
  annualRate: 0.04,
  years: 20,
};

describe("compareAccounts", () => {
  it("NISA: 運用益に課税なし（手取り＝評価額）", () => {
    const result = compareAccounts({ ...basePlan, accountType: "nisa" });
    expect(result.nisa.gain).toBeGreaterThan(0);
    // NISA は課税されないため finalValue = totalContributions + gain
    expect(result.nisa.finalValue).toBe(
      result.nisa.totalContributions + result.nisa.gain,
    );
  });

  it("特定口座: 運用益に約20.315%課税され、NISAより手取りが少ない", () => {
    const result = compareAccounts({ ...basePlan, accountType: "taxable" });
    // finalValue = totalContributions + gain(税引後)
    const afterTax = result.taxable.totalContributions + result.taxable.gain;
    // finalValue は totalContributions + gain（税引後）
    expect(result.taxable.finalValue).toBe(afterTax);
    // 特定口座 < NISA
    expect(result.taxable.finalValue).toBeLessThan(result.nisa.finalValue);
  });

  it("iDeCo: 節税額が正（課税所得帯を指定した場合）", () => {
    const result = compareAccounts({
      ...basePlan,
      accountType: "ideco",
      taxableIncomeBand: "band695", // 限界税率20%
    });
    expect(result.ideco.taxSaving).toBeDefined();
    expect(result.ideco.taxSaving!).toBeGreaterThan(0);
    // 節税額 ≒ 年間掛金 × (20% + 10%) × 年数
    const annual = basePlan.monthlyAmount * 12;
    const expected = Math.floor(annual * (0.2 + 0.1) * basePlan.years);
    expect(result.ideco.taxSaving!).toBeCloseTo(expected, -3); // 1000円以内
  });

  it("積立0円のとき評価額も0", () => {
    const result = compareAccounts({ ...basePlan, monthlyAmount: 0, accountType: "nisa" });
    expect(result.nisa.finalValue).toBe(0);
    expect(result.nisa.gain).toBe(0);
  });

  it("3口座すべての結果が返る", () => {
    const result = compareAccounts({ ...basePlan, accountType: "nisa" });
    expect(result.nisa).toBeDefined();
    expect(result.ideco).toBeDefined();
    expect(result.taxable).toBeDefined();
  });
});
