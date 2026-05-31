// 表示用フォーマッタ。

/** 円表示（カンマ区切り、円未満なし）。 */
export function formatYen(value: number): string {
  return Math.round(value).toLocaleString("ja-JP") + "円";
}

/** 万円表示（小数1桁まで）。大きな金額の概観用。 */
export function formatManYen(value: number): string {
  const man = value / 10_000;
  return (
    man.toLocaleString("ja-JP", {
      maximumFractionDigits: 1,
    }) + "万円"
  );
}

/** パーセント表示（小数を%へ）。 */
export function formatPercent(rate: number, digits = 1): string {
  return (rate * 100).toFixed(digits) + "%";
}
