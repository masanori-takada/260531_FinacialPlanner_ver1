import { describe, it, expect } from "vitest";
import { yen, ratePerMonth, safeNumber } from "../../src/domain/finance/rounding";

describe("rounding", () => {
  describe("yen（円未満切り捨て）", () => {
    it("正の小数を切り捨てる", () => {
      expect(yen(100.9)).toBe(100);
      expect(yen(100.0001)).toBe(100);
    });
    it("整数はそのまま", () => {
      expect(yen(100)).toBe(100);
    });
    it("負の値は0方向ではなく数値的に切り捨て（floor）", () => {
      // 損失額などで負になる場合、floorで一貫させる
      expect(yen(-0.5)).toBe(-1);
    });
    it("NaN/Infinityは0に丸める", () => {
      expect(yen(NaN)).toBe(0);
      expect(yen(Infinity)).toBe(0);
    });
  });

  describe("ratePerMonth（年利→月利）", () => {
    it("年利を12で割る", () => {
      expect(ratePerMonth(0.12)).toBeCloseTo(0.01, 10);
    });
    it("0%は0", () => {
      expect(ratePerMonth(0)).toBe(0);
    });
  });

  describe("safeNumber", () => {
    it("有限数はそのまま", () => {
      expect(safeNumber(3.14)).toBe(3.14);
    });
    it("NaN/Infinityは既定値", () => {
      expect(safeNumber(NaN)).toBe(0);
      expect(safeNumber(Infinity, 5)).toBe(5);
    });
  });
});
