// 丸め方針を一元管理する（憲章I: 丸めを計算ごとに明示しテストで固定）。

/** 有限数でなければ既定値を返すガード。NaN/Infinityの伝播を防ぐ。 */
export function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * 円未満を切り捨てる（floor）。
 * 金額表示の基本丸め。NaN/Infinityは0に丸める。
 */
export function yen(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const v = Math.trunc(value);
  return v === 0 ? 0 : v;
}

/** 年利（小数）を月利（小数）へ。単純に12等分する。 */
export function ratePerMonth(annualRate: number): number {
  return safeNumber(annualRate) / 12;
}
