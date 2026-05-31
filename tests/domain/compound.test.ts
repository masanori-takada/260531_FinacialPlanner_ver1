import { describe, it, expect } from "vitest";
import {
  futureValueLumpSum,
  futureValueOfMonthly,
} from "../../src/domain/finance/compound";

describe("futureValueLumpSum（元本一括・年複利）", () => {
  it("年利0%なら元本のまま", () => {
    expect(futureValueLumpSum(1_000_000, 0, 10)).toBe(1_000_000);
  });

  it("100万円・年利5%・10年 = 1,628,894円（1.05^10で厳密）", () => {
    // 1,000,000 * 1.05^10 = 1,628,894.6267... → 円未満切り捨て
    expect(futureValueLumpSum(1_000_000, 0.05, 10)).toBe(1_628_894);
  });

  it("0年なら元本のまま", () => {
    expect(futureValueLumpSum(500_000, 0.1, 0)).toBe(500_000);
  });

  it("マイナス運用（-10%）でも逓減して計算できる", () => {
    // 1,000,000 * 0.9^2 = 810,000
    expect(futureValueLumpSum(1_000_000, -0.1, 2)).toBe(810_000);
  });
});

describe("futureValueOfMonthly（毎月積立・月複利）", () => {
  it("年利0%なら 月額×月数", () => {
    // 30,000 * 12 * 10 = 3,600,000
    expect(futureValueOfMonthly(30_000, 0, 10)).toBe(3_600_000);
  });

  it("毎月10万円・年利12%（月利1%）・3ヶ月 = 303,010円（手計算で厳密）", () => {
    // r=0.01, n=3, fv = 100000 * ((1.01^3 - 1)/0.01)
    // 1.01^3 = 1.030301 → (0.030301/0.01)=3.0301 → *100000 = 303,010
    expect(futureValueOfMonthly(100_000, 0.12, 0.25)).toBe(303_010);
  });

  it("毎月3万円・年利4%・20年は概ね1,100万円規模（数式の妥当性域チェック）", () => {
    // 精密な円単位は手計算で固定しないが、数式バグを検出する妥当域で確認する
    const result = futureValueOfMonthly(30_000, 0.04, 20);
    expect(result).toBeGreaterThan(10_900_000);
    expect(result).toBeLessThan(11_100_000);
  });

  it("積立0円なら0", () => {
    expect(futureValueOfMonthly(0, 0.05, 10)).toBe(0);
  });

  it("0年なら0", () => {
    expect(futureValueOfMonthly(30_000, 0.05, 0)).toBe(0);
  });
});
