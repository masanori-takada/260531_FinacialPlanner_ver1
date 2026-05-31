import { describe, it, expect } from "vitest";
import {
  monthlyPaymentEqual,
  buildAmortization,
} from "../../src/domain/finance/loan";
import type { Loan } from "../../src/domain/types";

// 基本的なローン設定（元利均等）
const baseLoan: Loan = {
  id: "test",
  principal: 30_000_000,
  annualRate: 0.01,
  years: 35,
  method: "equalPayment",
  prepayments: [],
};

describe("monthlyPaymentEqual（元利均等・毎月返済額）", () => {
  it("3000万円・年利1%・35年 ≒ 84,685円/月", () => {
    // r=0.01/12, n=420, P*(r/(1-(1+r)^-n))
    // 手計算: ≒84,685円 (標準的な試算サイトの代表値で確認)
    const pay = monthlyPaymentEqual(30_000_000, 0.01, 35);
    expect(pay).toBeGreaterThan(84_000);
    expect(pay).toBeLessThan(86_000);
  });

  it("年利0%なら元金÷月数", () => {
    // 1200万円・0%・10年 = 100,000円/月
    expect(monthlyPaymentEqual(12_000_000, 0, 10)).toBe(100_000);
  });

  it("元本0なら0", () => {
    expect(monthlyPaymentEqual(0, 0.02, 30)).toBe(0);
  });
});

describe("buildAmortization（元利均等・償還表）", () => {
  it("総返済額は毎月返済額×回数に近い（円未満丸め誤差のみ）", () => {
    const result = buildAmortization(baseLoan);
    const monthly = monthlyPaymentEqual(
      baseLoan.principal,
      baseLoan.annualRate,
      baseLoan.years,
    );
    const n = baseLoan.years * 12;
    // 丸め誤差は最大でn円（1回あたり1円の誤差が積み上がった最大値）
    expect(result.totalPayment).toBeGreaterThanOrEqual(monthly * n - n);
    expect(result.totalPayment).toBeLessThanOrEqual(monthly * n + n);
  });

  it("最終残高は0円（完済）", () => {
    const result = buildAmortization(baseLoan);
    const lastRow = result.rows[result.rows.length - 1];
    expect(lastRow.balance).toBe(0);
  });

  it("各行: 元金部分＋利息部分＝返済額", () => {
    const result = buildAmortization(baseLoan);
    for (const row of result.rows.slice(0, 12)) {
      // 丸め誤差は1円以内
      expect(Math.abs(row.payment - (row.principalPart + row.interestPart))).toBeLessThanOrEqual(1);
    }
  });

  it("各行: 残高は前行より元金分だけ減る（元利均等の構造的不変条件）", () => {
    const result = buildAmortization(baseLoan);
    for (let i = 1; i < Math.min(result.rows.length, 12); i++) {
      const diff = result.rows[i - 1].balance - result.rows[i].balance;
      expect(diff).toBeCloseTo(result.rows[i].principalPart, -1); // 10円以内
    }
  });

  it("繰上返済（期間短縮）で返済回数が減り利息も減る", () => {
    const loanWithPrepay: Loan = {
      ...baseLoan,
      prepayments: [{ atMonth: 120, amount: 5_000_000, mode: "shortenTerm" }],
    };
    const base = buildAmortization(baseLoan);
    const withPrepay = buildAmortization(loanWithPrepay);
    expect(withPrepay.monthsToPayoff).toBeLessThan(base.monthsToPayoff);
    expect(withPrepay.totalInterest).toBeLessThan(base.totalInterest);
  });

  it("元金均等: 初回返済額が最大で以降逓減する", () => {
    const equalPrincipalLoan: Loan = {
      ...baseLoan,
      method: "equalPrincipal",
    };
    const result = buildAmortization(equalPrincipalLoan);
    // 毎回の元金部分は一定
    const principalPart = Math.floor(baseLoan.principal / (baseLoan.years * 12)); // 丸め方針: 円未満切り捨て
    expect(result.rows[0].principalPart).toBe(principalPart);
    // 初回 > 最終回（利息が逓減するため）
    expect(result.rows[0].payment).toBeGreaterThan(
      result.rows[result.rows.length - 1].payment,
    );
  });
});
