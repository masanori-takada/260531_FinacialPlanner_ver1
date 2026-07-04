// NISA/iDeCo/特定口座の比較シミュレーション（US2）。
// 課税は「概算」であり、受取時課税・個人事情は未考慮（FR-023、spec US2 AS-3）。

import type {
  AccountResult,
  IncomeBandKey,
  InvestmentComparison,
  InvestmentPlan,
} from "../types";
import {
  CAPITAL_GAINS_TAX_RATE,
  INCOME_TAX_MARGINAL_RATE,
  RESIDENT_TAX_RATE,
} from "../constants/tax";
import { futureValueOfMonthly } from "../finance/compound";
import { yen, safeNumber } from "../finance/rounding";

/** 1パターンの積立将来価値と積立総額を計算する。 */
function calcGrowth(
  monthlyAmount: number,
  annualRate: number,
  years: number,
): { finalValue: number; totalContributions: number; grossGain: number } {
  const totalContributions = yen(safeNumber(monthlyAmount) * 12 * safeNumber(years));
  const finalValue = futureValueOfMonthly(monthlyAmount, annualRate, years);
  const grossGain = Math.max(0, finalValue - totalContributions);
  return { finalValue, totalContributions, grossGain };
}

/** iDeCoの掛金所得控除による概算節税額。 */
function calcIDecoTaxSaving(
  monthlyAmount: number,
  years: number,
  band?: IncomeBandKey,
): number {
  if (!band) return 0;
  const marginalRate = INCOME_TAX_MARGINAL_RATE[band];
  if (marginalRate === undefined) return 0;
  const annualContrib = safeNumber(monthlyAmount) * 12;
  return yen(annualContrib * (marginalRate + RESIDENT_TAX_RATE) * safeNumber(years));
}

/**
 * NISA・iDeCo・特定口座の3パターンを一括比較する。
 * すべてのパターンは同一の月額・利回り・期間で計算する。
 * 返す InvestmentComparison の各フィールドは手取り金額。
 */
export function compareAccounts(plan: InvestmentPlan): InvestmentComparison {
  const { monthlyAmount, annualRate, years, taxableIncomeBand } = plan;

  // NISA: 運用益非課税
  const nisaRaw = calcGrowth(monthlyAmount, annualRate, years);
  const nisa: AccountResult = {
    finalValue: nisaRaw.finalValue,
    totalContributions: nisaRaw.totalContributions,
    gain: nisaRaw.grossGain,
  };

  // iDeCo: 運用益非課税（NISAと同じ運用結果）＋掛金所得控除の節税を別途算出
  const ideco: AccountResult = {
    finalValue: nisaRaw.finalValue, // 運用益は NISA と同等（受取時課税は概算注記で許容）
    totalContributions: nisaRaw.totalContributions,
    gain: nisaRaw.grossGain,
    taxSaving: calcIDecoTaxSaving(monthlyAmount, years, taxableIncomeBand),
  };

  // 特定口座: 運用益に CAPITAL_GAINS_TAX_RATE を課税した手取り
  const taxableRaw = calcGrowth(monthlyAmount, annualRate, years);
  const taxOnGain = yen(taxableRaw.grossGain * CAPITAL_GAINS_TAX_RATE);
  const taxable: AccountResult = {
    finalValue: taxableRaw.finalValue - taxOnGain,
    totalContributions: taxableRaw.totalContributions,
    gain: taxableRaw.grossGain - taxOnGain,
  };

  return { nisa, ideco, taxable };
}
