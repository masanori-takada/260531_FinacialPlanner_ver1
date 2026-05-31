// 公的年金の概算試算（US5）。純粋関数。
// 出典・注記は constants/pension.ts に集約。簡略モデルであり日本年金機構の正式試算ではない。

import type { PensionEstimate, PensionProfile } from "../types";
import {
  BASIC_PENSION_FULL_ANNUAL,
  BASIC_PENSION_FULL_MONTHS,
  EMPLOYEES_PENSION_MULTIPLIER,
  PENSION_BASE_AGE,
  PENSION_MIN_AGE,
  PENSION_MAX_AGE,
  EARLY_REDUCTION_PER_MONTH,
  DEFERRAL_INCREASE_PER_MONTH,
} from "../constants/pension";
import { yen } from "../finance/rounding";

/**
 * 老齢基礎・厚生年金の概算受給額を算出する。
 * startAge は制度上の範囲（60〜75）に自動クランプする。
 */
export function estimatePension(profile: PensionProfile): PensionEstimate {
  const { category, averageAnnualIncome, enrolledYears, startAge: rawAge } = profile;

  // 受給開始年齢を範囲内にクランプ
  const startAge = Math.max(PENSION_MIN_AGE, Math.min(PENSION_MAX_AGE, rawAge));

  // 繰上げ/繰下げの調整率
  const monthsDiff = (startAge - PENSION_BASE_AGE) * 12;
  const adjustmentRate =
    monthsDiff >= 0
      ? 1 + DEFERRAL_INCREASE_PER_MONTH * monthsDiff
      : 1 - EARLY_REDUCTION_PER_MONTH * Math.abs(monthsDiff);

  // 老齢基礎年金: 満額 × (加入月数 / 480)
  const enrolledMonths = Math.min(enrolledYears * 12, BASIC_PENSION_FULL_MONTHS);
  const basicAnnual = yen(
    (BASIC_PENSION_FULL_ANNUAL * enrolledMonths) / BASIC_PENSION_FULL_MONTHS,
  );

  // 老齢厚生年金（報酬比例部分の概算）: 年収基準で加入月数を乗じる
  // 平均標準報酬額（月額）≈ averageAnnualIncome / 12
  const monthlyIncome = averageAnnualIncome / 12;
  const employeesAnnual =
    category === "employee"
      ? yen(monthlyIncome * EMPLOYEES_PENSION_MULTIPLIER * enrolledYears * 12)
      : 0;

  const totalAnnual = yen((basicAnnual + employeesAnnual) * adjustmentRate);
  const totalMonthly = Math.floor(totalAnnual / 12);

  return {
    basicAnnual: yen(basicAnnual * adjustmentRate),
    employeesAnnual: yen(employeesAnnual * adjustmentRate),
    totalAnnual,
    totalMonthly,
    adjustmentRate,
  };
}
