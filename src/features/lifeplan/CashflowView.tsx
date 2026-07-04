// キャッシュフロー結果表示（US1）。資産推移グラフ・年次表・枯渇年齢警告・免責。

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AppState } from "../../domain/types";
import { projectCashflow } from "../../domain/cashflow/projection";
import { detectCashflowWarnings } from "../../domain/cashflow/warnings";
import { selfCurrentAge } from "../../domain/cashflow/sources";
import { Card, StatTile } from "../../components/ui";
import { DisclaimerNote } from "../../components/Disclaimer";
import { formatManYen, formatYen } from "../../components/format";

export function CashflowView({ state }: { state: AppState }) {
  const startAge = selfCurrentAge(state);

  if (state.assumptions.endAge < startAge) {
    return (
      <Card title="キャッシュフロー">
        <p className="text-red-600 text-sm font-bold">
          エラー: 何歳まで試算するか（{state.assumptions.endAge}歳）が本人の現在年齢（{startAge}歳）より小さくなっています。設定を見直してください。
        </p>
      </Card>
    );
  }

  const result = projectCashflow(state);
  const rows = result.rows;

  if (rows.length === 0) {
    return (
      <Card title="キャッシュフロー">
        <p className="text-gray-500 text-sm">
          本人の年齢を入力すると、生涯のキャッシュフローが表示されます。
        </p>
      </Card>
    );
  }

  const finalBalance = rows[rows.length - 1].balance;
  const minBalance = Math.min(...rows.map((r) => r.balance));
  const peakBalance = Math.max(...rows.map((r) => r.balance));
  const totalAssetTransfer = rows.reduce((sum, r) => sum + r.assetTransfer, 0);
  const warnings = detectCashflowWarnings(state);

  // グラフ用データ（万円単位）
  const chartData = rows.map((r) => ({
    age: r.age,
    残高: Math.round(r.balance / 10_000),
  }));

  return (
    <div className="space-y-5">
      {result.depletionAge !== null ? (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-800">
          <span className="font-bold">⚠ 資産枯渇の警告：</span>
          このままの前提では <span className="font-bold">{result.depletionAge}歳</span> で金融資産がマイナスに転じます。
          収入・支出・資産・前提を見直してみましょう。
        </div>
      ) : (
        <div role="status" className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-emerald-800">
          <span className="font-bold">✓ </span>
          試算期間（{rows[rows.length - 1].age}歳まで）を通じて、金融資産はマイナスになりません。
        </div>
      )}

      {warnings.length > 0 && (
        <div role="alert" className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-800">
          <p className="font-bold mb-1">⚠ 入力の確認をおすすめします（抜け漏れ・ダブり）</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {warnings.map((w) => (
              <li key={w.kind}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="最終残高" value={formatManYen(finalBalance)} tone={finalBalance < 0 ? "warn" : "good"} />
        <StatTile label="最小残高" value={formatManYen(minBalance)} tone={minBalance < 0 ? "warn" : "neutral"} />
        <StatTile label="最大残高" value={formatManYen(peakBalance)} />
        <StatTile label="枯渇年齢" value={result.depletionAge !== null ? `${result.depletionAge}歳` : "なし"} tone={result.depletionAge !== null ? "warn" : "good"} />
      </div>

      <Card title="金融資産残高の推移">
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="age" tickFormatter={(v) => `${v}歳`} />
              <YAxis tickFormatter={(v) => `${v.toLocaleString()}万`} width={70} />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString()}万円`, "残高"]} labelFormatter={(l) => `${l}歳`} />
              <ReferenceLine y={0} stroke="#dc2626" strokeWidth={1} />
              <Line type="monotone" dataKey="残高" stroke="#0c7274" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <DisclaimerNote extra="残高は前提（利回り・物価上昇率等）に依存し、将来を保証するものではありません。" />
      </Card>

      <Card title="年次キャッシュフロー表">
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm tabular">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="text-right text-gray-600 border-b border-gray-200">
                <th className="px-3 py-2 text-left">年齢</th>
                <th className="px-3 py-2 text-left">西暦</th>
                <th className="px-3 py-2">収入</th>
                <th className="px-3 py-2">支出</th>
                <th className="px-3 py-2">資産内移転</th>
                <th className="px-3 py-2">収支</th>
                <th className="px-3 py-2">資産残高</th>
                <th className="px-3 py-2 text-left">主な根拠</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.age} className={`text-right border-b border-gray-100 ${r.balance < 0 ? "bg-red-50" : ""}`}>
                  <td className="px-3 py-1.5 text-left">{r.age}歳</td>
                  <td className="px-3 py-1.5 text-left">{r.year}</td>
                  <td className="px-3 py-1.5">{formatYen(r.income)}</td>
                  <td className="px-3 py-1.5">{formatYen(r.expense)}</td>
                  <td className="px-3 py-1.5 text-gray-500">{r.assetTransfer > 0 ? formatYen(r.assetTransfer) : "—"}</td>
                  <td className={`px-3 py-1.5 ${r.net < 0 ? "text-red-600" : "text-emerald-700"}`}>{formatYen(r.net)}</td>
                  <td className={`px-3 py-1.5 font-medium ${r.balance < 0 ? "text-red-600" : ""}`}>{formatYen(r.balance)}</td>
                  <td className="px-3 py-1.5 text-left text-xs text-gray-500 max-w-56">
                    {r.sourceBreakdown.slice(0, 3).map((s) => s.label).join(" / ")}
                    {r.sourceBreakdown.length > 3 ? " ほか" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalAssetTransfer > 0 && (
          <p className="mt-3 text-xs text-gray-500">
            資産内移転（積立など）は消費支出ではないため収支には含めず、資産形成の根拠として表示しています。
            残高の運用利回りは保有資産全体の加重平均（④ 保有資産の利回り）で計算され、積立先口座ごとの個別利回りは反映していません。
          </p>
        )}
        <DisclaimerNote />
      </Card>
    </div>
  );
}
