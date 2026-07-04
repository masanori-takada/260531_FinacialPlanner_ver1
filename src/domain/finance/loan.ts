// 住宅ローンの返済計算（US3）。純粋関数（憲章I）。
// 元利均等・元金均等・繰上返済を実装する。

import type { AmortizationResult, AmortizationRow, Loan } from "../types";
import { yen, ratePerMonth, safeNumber } from "./rounding";

/**
 * 元利均等の毎月返済額。
 * pay = P * r / (1 - (1+r)^-n), r=月利, n=総返済回数
 * r=0 なら P/n（ゼロ除算回避）。円未満切り捨て。
 */
export function monthlyPaymentEqual(
  principal: number,
  annualRate: number,
  years: number,
): number {
  const p = safeNumber(principal);
  const r = ratePerMonth(annualRate);
  const n = Math.round(safeNumber(years) * 12);
  if (p <= 0 || n <= 0) return 0;
  if (r === 0) return yen(p / n);
  return yen((p * r) / (1 - Math.pow(1 + r, -n)));
}

/**
 * 償還表を構築する。
 * 元利均等・元金均等を method で切り替え。
 * 繰上返済（期間短縮型・返済額軽減型）を prepayments で指定。
 */
export function buildAmortization(loan: Loan): AmortizationResult {
  const { principal, annualRate, years, method, prepayments } = loan;
  const r = ratePerMonth(annualRate);
  const totalMonths = Math.round(safeNumber(years) * 12);

  const rows: AmortizationRow[] = [];
  let balance = safeNumber(principal);
  let monthlyPay = monthlyPaymentEqual(principal, annualRate, years);
  // 元金均等の場合: 毎回の元金返済額は固定
  let fixedPrincipalPart =
    method === "equalPrincipal" ? yen(principal / totalMonths) : 0;

  let index = 1;
  let totalPayment = 0;
  let totalInterest = 0;

  while (balance > 0 && index <= totalMonths * 2) {
    // 繰上返済を確認（このインデックスの直前に実行）
    const prepay = prepayments.find((p) => p.atMonth === index - 1);
    if (prepay) {
      const prepayAmount = Math.min(safeNumber(prepay.amount), balance);
      balance -= prepayAmount;
      if (balance <= 0) break;

      if (prepay.mode === "shortenTerm") {
        // 期間短縮型: 毎月返済額を変えず残期間を短縮（再計算）
        // ここでは残高・月利から残月数を算出（返済額変えない）
        // 月利0なら残元金÷毎月返済額
        // 実装上は 残高 と monthlyPay を保ったまま継続し、残高が尽きれば自然終了。
        // （monthlyPayはそのまま、ループが早く終わる）
      } else {
        // 返済額軽減型: 残期間は変えず毎月返済額を再計算
        const remainMonths = totalMonths - (index - 1);
        if (remainMonths > 0) {
          if (method === "equalPrincipal") {
            fixedPrincipalPart = yen(balance / remainMonths);
          } else {
            monthlyPay = monthlyPaymentEqual(balance, annualRate, remainMonths / 12);
          }
        }
      }
    }

    // 当月の利息
    const interestPart = yen(balance * r);
    let principalPart: number;
    let payment: number;

    if (method === "equalPrincipal") {
      // 元金均等: 元金部分固定、最終回は残高全額
      principalPart =
        index === totalMonths ? balance : Math.min(fixedPrincipalPart, balance);
      payment = yen(principalPart + interestPart);
    } else {
      // 元利均等: 返済額固定、最終回は残高＋利息
      if (balance <= monthlyPay || index >= totalMonths) {
        principalPart = balance;
        payment = yen(balance + interestPart);
      } else {
        payment = monthlyPay;
        principalPart = yen(payment - interestPart);
      }
    }

    // 過払い防止（最終回調整）
    principalPart = Math.min(principalPart, balance);

    totalPayment += payment;
    totalInterest += interestPart;
    balance = yen(balance - principalPart);

    rows.push({ index, payment, principalPart, interestPart, balance });

    if (balance <= 0) break;
    index++;
  }

  return {
    rows,
    totalPayment: yen(totalPayment),
    totalInterest: yen(totalInterest),
    monthsToPayoff: rows.length,
  };
}
