// 住宅ローン返済シミュレーション（US3）。

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildAmortization, monthlyPaymentEqual } from "../../domain/finance/loan";
import type { Loan, LoanMethod, PrepaymentMode } from "../../domain/types";
import { Card, NumberField, PercentField, SelectField, StatTile } from "../../components/ui";
import { DisclaimerNote } from "../../components/Disclaimer";
import { formatYen, formatManYen } from "../../components/format";
import type { AppState } from "../../domain/types";

export function LoanPage({ state: _state, setState: _setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const [principal, setPrincipal] = useState(30_000_000);
  const [annualRate, setAnnualRate] = useState(0.01);
  const [years, setYears] = useState(35);
  const [method, setMethod] = useState<LoanMethod>("equalPayment");
  const [prepayAt, setPrepayAt] = useState(120);
  const [prepayAmount, setPrepayAmount] = useState(0);
  const [prepayMode, setPrepayMode] = useState<PrepaymentMode>("shortenTerm");

  const loan: Loan = {
    id: "sim",
    principal,
    annualRate,
    years,
    method,
    prepayments:
      prepayAmount > 0
        ? [{ atMonth: prepayAt, amount: prepayAmount, mode: prepayMode }]
        : [],
  };
  const result = buildAmortization(loan);
  const monthly = monthlyPaymentEqual(principal, annualRate, years);

  // 繰上なしの基本ケースと比較
  const baseLoan: Loan = { ...loan, prepayments: [] };
  const baseResult = buildAmortization(baseLoan);

  const interestSaved = baseResult.totalInterest - result.totalInterest;
  const monthsSaved = baseResult.monthsToPayoff - result.monthsToPayoff;

  // グラフ: 年次の元金・利息の積み上げ（最初の30年分）
  const annualData = Array.from(
    { length: Math.min(Math.ceil(result.monthsToPayoff / 12), 40) },
    (_, yi) => {
      const monthStart = yi * 12 + 1;
      const monthEnd = Math.min(monthStart + 11, result.rows.length);
      const rows = result.rows.slice(monthStart - 1, monthEnd);
      return {
        year: `${yi + 1}年目`,
        元金: Math.round(rows.reduce((s, r) => s + r.principalPart, 0) / 10_000),
        利息: Math.round(rows.reduce((s, r) => s + r.interestPart, 0) / 10_000),
      };
    },
  );

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800">住宅ローン返済シミュレーション</h2>
        <p className="text-sm text-gray-500">借入条件を入力すると毎月返済額・総支払額・償還表が確認できます。</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 入力 */}
        <div className="space-y-5">
          <Card title="借入条件">
            <NumberField label="借入金額" value={principal} onChange={setPrincipal} suffix="円" step={1_000_000} />
            <PercentField label="年利（固定金利）" value={annualRate} onChange={setAnnualRate} help="変動金利の場合は現在の適用金利を入力してください" />
            <NumberField label="返済期間" value={years} onChange={setYears} suffix="年" min={1} />
            <SelectField
              label="返済方式"
              value={method}
              options={[
                { value: "equalPayment", label: "元利均等（毎月の返済額が一定）" },
                { value: "equalPrincipal", label: "元金均等（元金部分が一定・初回返済額が最大）" },
              ]}
              onChange={setMethod}
            />
          </Card>

          <Card title="繰上返済（任意）">
            <NumberField label="繰上返済を行う時期（返済開始から何ヶ月後）" value={prepayAt} onChange={setPrepayAt} suffix="ヶ月後" min={1} />
            <NumberField label="繰上返済額（0なら繰上返済なし）" value={prepayAmount} onChange={setPrepayAmount} suffix="円" step={100_000} />
            <SelectField
              label="繰上返済の方式"
              value={prepayMode}
              options={[
                { value: "shortenTerm", label: "期間短縮型（返済期間を短縮）" },
                { value: "reducePayment", label: "返済額軽減型（毎月の返済額を減らす）" },
              ]}
              onChange={setPrepayMode}
            />
          </Card>
        </div>

        {/* 結果 */}
        <div className="space-y-5">
          <Card title="シミュレーション結果">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatTile label="毎月返済額（初回）" value={formatYen(method === "equalPayment" ? monthly : result.rows[0]?.payment ?? 0)} />
              <StatTile label="総返済額" value={formatManYen(result.totalPayment)} />
              <StatTile label="総利息額" value={formatManYen(result.totalInterest)} />
              <StatTile label="返済完了" value={`${Math.ceil(result.monthsToPayoff / 12)}年 ${result.monthsToPayoff % 12}ヶ月`} />
            </div>
            {prepayAmount > 0 && (
              <div className="bg-emerald-50 rounded-lg p-3 text-sm text-emerald-800 border border-emerald-200">
                <p className="font-semibold">繰上返済の効果（基本ケースとの比較）</p>
                <p>利息軽減額: <span className="font-bold">{formatYen(Math.max(0, interestSaved))}</span></p>
                {prepayMode === "shortenTerm" && (
                  <p>期間短縮: <span className="font-bold">{Math.max(0, monthsSaved)}ヶ月（{Math.floor(Math.max(0, monthsSaved) / 12)}年{Math.max(0, monthsSaved) % 12}ヶ月）</span></p>
                )}
              </div>
            )}
            <DisclaimerNote extra="変動金利・元利金の変動は考慮していません。" />
          </Card>

          <Card title="年次の返済内訳（元金・利息）">
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={annualData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${v}万`} width={55} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString()}万円`]} />
                  <Bar dataKey="元金" stackId="a" fill="#0c7274" />
                  <Bar dataKey="利息" stackId="a" fill="#94d5d6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="償還表（最初の60回）">
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-sm tabular">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-right text-gray-600 border-b border-gray-200">
                    <th className="px-3 py-2 text-left">回</th>
                    <th className="px-3 py-2">返済額</th>
                    <th className="px-3 py-2">元金</th>
                    <th className="px-3 py-2">利息</th>
                    <th className="px-3 py-2">残高</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, 60).map((r) => (
                    <tr key={r.index} className="text-right border-b border-gray-100">
                      <td className="px-3 py-1 text-left">{r.index}回</td>
                      <td className="px-3 py-1">{formatYen(r.payment)}</td>
                      <td className="px-3 py-1">{formatYen(r.principalPart)}</td>
                      <td className="px-3 py-1 text-amber-700">{formatYen(r.interestPart)}</td>
                      <td className="px-3 py-1">{formatYen(r.balance)}</td>
                    </tr>
                  ))}
                  {result.rows.length > 60 && (
                    <tr className="text-center text-gray-400 text-xs">
                      <td colSpan={5} className="py-2">… 以降{result.rows.length - 60}回省略（全{result.rows.length}回）</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
