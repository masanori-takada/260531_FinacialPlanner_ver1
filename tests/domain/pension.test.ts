import { describe, it, expect } from "vitest";
import { estimatePension } from "../../src/domain/pension/estimate";
import {
  BASIC_PENSION_FULL_ANNUAL,
  PENSION_BASE_AGE,
} from "../../src/domain/constants/pension";

const baseProfile = {
  category: "employee" as const,
  averageAnnualIncome: 5_000_000,
  enrolledYears: 40,
  startAge: 65,
};

describe("estimatePension", () => {
  it("65歳受給: 調整率は1.0（増減なし）", () => {
    const result = estimatePension(baseProfile);
    expect(result.adjustmentRate).toBeCloseTo(1.0, 5);
  });

  it("基礎年金は40年納付で満額", () => {
    const result = estimatePension(baseProfile);
    expect(result.basicAnnual).toBe(BASIC_PENSION_FULL_ANNUAL);
  });

  it("20年加入なら基礎年金は満額の半分", () => {
    const half = estimatePension({ ...baseProfile, enrolledYears: 20 });
    expect(half.basicAnnual).toBe(Math.floor(BASIC_PENSION_FULL_ANNUAL / 2));
  });

  it("厚生年金（概算）は収入・加入年数に比例", () => {
    const result = estimatePension(baseProfile);
    expect(result.employeesAnnual).toBeGreaterThan(0);
    // 年収5,000万円は「高すぎ」テストではないが、高い収入で高くなることを確認
    const highIncome = estimatePension({ ...baseProfile, averageAnnualIncome: 8_000_000 });
    expect(highIncome.employeesAnnual).toBeGreaterThan(result.employeesAnnual);
  });

  it("自営業はenrolledYearsに関わらず厚生年金が0", () => {
    const self = estimatePension({ ...baseProfile, category: "selfEmployed" });
    expect(self.employeesAnnual).toBe(0);
  });

  it("totalMonthly ≈ totalAnnual / 12（1円以内の誤差）", () => {
    const result = estimatePension(baseProfile);
    expect(Math.abs(result.totalMonthly - Math.floor(result.totalAnnual / 12))).toBeLessThanOrEqual(1);
  });

  it("70歳繰下げで増額（+0.7%×60ヶ月=+42%）", () => {
    const base = estimatePension(baseProfile);
    const deferred = estimatePension({ ...baseProfile, startAge: 70 });
    const months = (70 - PENSION_BASE_AGE) * 12;
    expect(deferred.adjustmentRate).toBeCloseTo(1 + 0.007 * months, 5);
    expect(deferred.totalAnnual).toBeGreaterThan(base.totalAnnual);
  });

  it("60歳繰上げで減額（-0.4%×60ヶ月=-24%）", () => {
    const base = estimatePension(baseProfile);
    const early = estimatePension({ ...baseProfile, startAge: 60 });
    const months = (PENSION_BASE_AGE - 60) * 12;
    expect(early.adjustmentRate).toBeCloseTo(1 - 0.004 * months, 5);
    expect(early.totalAnnual).toBeLessThan(base.totalAnnual);
  });

  it("受給開始年齢が60未満なら60に丸め、75超なら75に丸める", () => {
    const too_early = estimatePension({ ...baseProfile, startAge: 50 });
    const at60 = estimatePension({ ...baseProfile, startAge: 60 });
    expect(too_early.adjustmentRate).toBeCloseTo(at60.adjustmentRate, 5);

    const too_late = estimatePension({ ...baseProfile, startAge: 80 });
    const at75 = estimatePension({ ...baseProfile, startAge: 75 });
    expect(too_late.adjustmentRate).toBeCloseTo(at75.adjustmentRate, 5);
  });
});
