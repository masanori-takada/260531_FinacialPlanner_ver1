// 積立シミュレーション NISA/iDeCo/特定口座（US2）。

import { useState } from "react";
import { compareAccounts } from "../../domain/investment/account";
import { INCOME_BAND_LABELS } from "../../domain/constants/tax";
import type { IncomeBandKey, InvestmentPlan, AppState } from "../../domain/types";
import { Card, NumberField, PercentField, SelectField, StatTile } from "../../components/ui";
import { DisclaimerNote } from "../../components/Disclaimer";
import { formatManYen } from "../../components/format";

const BAND_OPTIONS = Object.entries(INCOME_BAND_LABELS).map(([value, label]) => ({
  value: value as IncomeBandKey,
  label,
}));

export function InvestmentPage({ state: _state, setState: _setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const [monthly, setMonthly] = useState(30_000);
  const [annualRate, setAnnualRate] = useState(0.04);
  const [years, setYears] = useState(20);
  const [band, setBand] = useState<IncomeBandKey>("band695");

  const plan: InvestmentPlan = {
    id: "sim",
    monthlyAmount: monthly,
    annualRate,
    years,
    accountType: "nisa", // compareAccountsは全口座を計算する
    taxableIncomeBand: band,
  };
  const result = compareAccounts(plan);

  const rows: { label: string; key: "nisa" | "ideco" | "taxable"; color: string }[] = [
    { label: "NISA（非課税）", key: "nisa", color: "bg-brand-500" },
    { label: "iDeCo（所得控除＋非課税）", key: "ideco", color: "bg-emerald-600" },
    { label: "特定口座（課税）", key: "taxable", color: "bg-gray-400" },
  ];

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800">積立シミュレーション（NISA / iDeCo / 特定口座）</h2>
        <p className="text-sm text-gray-500">3つの口座種別の将来評価額と税制メリットを比較します。</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card title="積立条件">
          <NumberField label="毎月の積立額" value={monthly} onChange={setMonthly} suffix="円" step={1_000} />
          <PercentField label="想定年利（複利）" value={annualRate} onChange={setAnnualRate} help="長期の株式インデックスファンドの代表値目安は3〜5%程度（元本保証なし）" />
          <NumberField label="積立期間" value={years} onChange={setYears} suffix="年" min={1} />
          <SelectField
            label="課税所得帯（iDeCoの節税概算に使用）"
            value={band}
            options={BAND_OPTIONS}
            onChange={setBand}
          />
          <p className="text-xs text-gray-400 mt-2">※ 積立総額: {formatManYen(monthly * 12 * years)}</p>
        </Card>

        <div className="space-y-4">
          {rows.map(({ label, key, color }) => {
            const r = result[key];
            return (
              <Card key={key}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-block w-3 h-3 rounded-full ${color}`} />
                  <span className="font-semibold text-gray-800">{label}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatTile label="最終評価額（手取り）" value={formatManYen(r.finalValue)} tone="good" />
                  <StatTile label="運用益（税引後）" value={formatManYen(r.gain)} />
                  {r.taxSaving !== undefined && (
                    <StatTile label="掛金節税額（概算）" value={formatManYen(r.taxSaving)} tone="good" />
                  )}
                </div>
              </Card>
            );
          })}

          <Card>
            <h4 className="font-semibold text-gray-700 mb-3">比較まとめ</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">NISA vs 特定口座 — 差額</span>
                <span className="font-bold text-brand-700">
                  +{formatManYen(result.nisa.finalValue - result.taxable.finalValue)}
                </span>
              </div>
              {result.ideco.taxSaving !== undefined && result.ideco.taxSaving > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">iDeCo 節税＋運用 vs 特定口座 — 差額</span>
                  <span className="font-bold text-emerald-700">
                    +{formatManYen(result.ideco.finalValue - result.taxable.finalValue + result.ideco.taxSaving)}
                  </span>
                </div>
              )}
            </div>
            <DisclaimerNote extra="iDeCoは受取時に退職所得控除・公的年金等控除の対象となりますが、個人の状況により異なるため受取時課税は本計算に含まれていません。" />
          </Card>
        </div>
      </div>
    </div>
  );
}
