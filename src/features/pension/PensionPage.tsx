// 公的年金の概算試算（US5）。

import { useState } from "react";
import { estimatePension } from "../../domain/pension/estimate";
import { PENSION_MIN_AGE, PENSION_MAX_AGE } from "../../domain/constants/pension";
import type { PensionCategory, PensionProfile, AppState } from "../../domain/types";
import { Card, NumberField, SelectField, StatTile } from "../../components/ui";
import { DisclaimerNote } from "../../components/Disclaimer";
import { formatYen } from "../../components/format";
import { formatPercent } from "../../components/format";

export function PensionPage({ state: _state, setState: _setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const [category, setCategory] = useState<PensionCategory>("employee");
  const [avgIncome, setAvgIncome] = useState(5_000_000);
  const [enrolledYears, setEnrolledYears] = useState(40);
  const [startAge, setStartAge] = useState(65);

  const profile: PensionProfile = {
    category,
    averageAnnualIncome: avgIncome,
    enrolledYears,
    startAge,
  };
  const result = estimatePension(profile);

  const clampedAge = Math.max(PENSION_MIN_AGE, Math.min(PENSION_MAX_AGE, startAge));
  const adjustSign = result.adjustmentRate >= 1 ? "+" : "";
  const adjustLabel = `${adjustSign}${formatPercent(result.adjustmentRate - 1)} (${clampedAge}歳受給)`;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800">公的年金の概算試算</h2>
        <p className="text-sm text-gray-500">加入条件・受給開始年齢を入力すると、老齢年金の概算額が確認できます。</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="加入・受給条件">
          <SelectField
            label="加入区分"
            value={category}
            options={[
              { value: "employee", label: "会社員・公務員（厚生年金）" },
              { value: "selfEmployed", label: "自営業・フリーランス（国民年金のみ）" },
            ]}
            onChange={(v) => setCategory(v as PensionCategory)}
          />
          {category === "employee" && (
            <NumberField label="平均年収（額面）" value={avgIncome} onChange={setAvgIncome} suffix="円" step={100_000} help="概算のため手取りではなく額面を入力してください" />
          )}
          <NumberField label="加入年数" value={enrolledYears} onChange={setEnrolledYears} suffix="年" min={1} />
          <NumberField
            label="受給開始年齢"
            value={startAge}
            onChange={setStartAge}
            suffix="歳"
            min={PENSION_MIN_AGE}
            help={`${PENSION_MIN_AGE}〜${PENSION_MAX_AGE}歳。65歳が基準。繰下げで増額、繰上げで減額。`}
          />
          <p className="text-xs text-gray-400 mt-1">
            ※ 繰下げ: +0.7%/月、繰上げ: −0.4%/月（65歳基準）。{adjustLabel}
          </p>
        </Card>

        <div className="space-y-4">
          <Card title="年金の概算受給額">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatTile label="月額（概算）" value={formatYen(result.totalMonthly)} tone="good" />
              <StatTile label="年額（概算）" value={formatYen(result.totalAnnual)} />
              <StatTile label="老齢基礎年金（月額）" value={formatYen(Math.floor(result.basicAnnual / 12))} />
              {category === "employee" && (
                <StatTile label="老齢厚生年金（月額）" value={formatYen(Math.floor(result.employeesAnnual / 12))} />
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 border border-gray-200 mb-3">
              <p className="font-medium mb-1">繰上げ・繰下げの比較</p>
              {([60, 65, 70, 75] as const)
                .filter((age) => age >= PENSION_MIN_AGE && age <= PENSION_MAX_AGE)
                .map((age) => {
                  const r = estimatePension({ ...profile, startAge: age });
                  return (
                    <div key={age} className={`flex justify-between py-0.5 ${age === clampedAge ? "font-bold text-brand-700" : ""}`}>
                      <span>{age}歳受給</span>
                      <span>{formatYen(r.totalMonthly)}/月</span>
                    </div>
                  );
                })}
            </div>

            <DisclaimerNote extra="本試算は老齢基礎・厚生年金の概算であり、日本年金機構の正式な試算ではありません。障害年金・遺族年金・マクロ経済スライド・在職老齢年金等は考慮していません。" />
          </Card>
        </div>
      </div>
    </div>
  );
}
