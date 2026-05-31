// アプリのシェル。タブ構成のダッシュボード＋常設の免責バナー＋全データ削除。

import { useState } from "react";
import { DisclaimerBanner } from "./components/Disclaimer";
import { Button } from "./components/ui";
import { useAppState } from "./store/useAppState";
import { LifeplanPage } from "./features/lifeplan/LifeplanPage";
import { LoanPage } from "./features/loan/LoanPage";
import { InvestmentPage } from "./features/investment/InvestmentPage";
import { EducationPage } from "./features/education/EducationPage";
import { PensionPage } from "./features/pension/PensionPage";
import { BudgetPage } from "./features/budget/BudgetPage";

type TabKey =
  | "lifeplan"
  | "loan"
  | "investment"
  | "education"
  | "pension"
  | "budget";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "lifeplan", label: "ライフプラン", icon: "📊" },
  { key: "investment", label: "積立(NISA/iDeCo)", icon: "📈" },
  { key: "loan", label: "住宅ローン", icon: "🏠" },
  { key: "education", label: "教育資金", icon: "🎓" },
  { key: "pension", label: "年金", icon: "👴" },
  { key: "budget", label: "家計簿", icon: "🧾" },
];

export function App() {
  const { state, setState, reset, storageOk } = useAppState();
  const [tab, setTab] = useState<TabKey>("lifeplan");

  const onReset = () => {
    if (
      window.confirm(
        "保存されているすべての入力データを削除して初期状態に戻します。よろしいですか？",
      )
    ) {
      reset();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <DisclaimerBanner />

      <header className="bg-brand-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold">FPプランナー</h1>
            <p className="text-brand-100 text-xs">
              家計と将来設計の見える化（データはこの端末内にのみ保存されます）
            </p>
          </div>
          <Button variant="secondary" onClick={onReset}>
            全データ削除
          </Button>
        </div>
      </header>

      {!storageOk && (
        <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-sm px-4 py-2 text-center">
          ご注意: お使いのブラウザ設定では保存ができません。入力内容は再読み込みで失われます（計算はそのまま利用できます）。
        </div>
      )}

      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-2 flex overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.key
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <span className="mr-1">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === "lifeplan" && <LifeplanPage state={state} setState={setState} />}
        {tab === "investment" && <InvestmentPage state={state} setState={setState} />}
        {tab === "loan" && <LoanPage state={state} setState={setState} />}
        {tab === "education" && <EducationPage state={state} setState={setState} />}
        {tab === "pension" && <PensionPage state={state} setState={setState} />}
        {tab === "budget" && <BudgetPage state={state} setState={setState} />}
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-8 text-center text-xs text-gray-400">
        本アプリは一般的な情報提供を目的とした概算ツールであり、専門的な助言を提供するものではありません。
      </footer>
    </div>
  );
}
