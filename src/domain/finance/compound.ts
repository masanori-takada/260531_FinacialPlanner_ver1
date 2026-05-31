// 複利・積立の将来価値（検証可能な数式。憲章I: ハンド計算でテスト固定）。

import { ratePerMonth, yen, safeNumber } from "./rounding";

/**
 * 元本一括の将来価値（年複利）。
 * fv = principal * (1 + annualRate)^years
 * 円未満切り捨て。
 */
export function futureValueLumpSum(
  principal: number,
  annualRate: number,
  years: number,
): number {
  const p = safeNumber(principal);
  const r = safeNumber(annualRate);
  const n = safeNumber(years);
  return yen(p * Math.pow(1 + r, n));
}

/**
 * 毎月積立（期末払い）の将来価値（月複利）。
 * r = annualRate/12, n = round(years*12)
 * r=0 のとき: monthly * n（ゼロ除算回避）
 * r≠0 のとき: monthly * ((1+r)^n - 1) / r
 * 円未満切り捨て。
 */
export function futureValueOfMonthly(
  monthly: number,
  annualRate: number,
  years: number,
): number {
  const m = safeNumber(monthly);
  const r = ratePerMonth(annualRate);
  const n = Math.round(safeNumber(years) * 12);
  if (n <= 0) return 0;
  if (r === 0) return yen(m * n);
  const factor = (Math.pow(1 + r, n) - 1) / r;
  return yen(m * factor);
}
