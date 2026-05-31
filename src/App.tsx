// アプリのシェル。ライフプランを単一の正本にし、常設の免責バナー＋全データ削除を提供する。

import { DisclaimerBanner } from "./components/Disclaimer";
import { Button } from "./components/ui";
import { useAppState } from "./store/useAppState";
import { LifeplanPage } from "./features/lifeplan/LifeplanPage";

export function App() {
  const { state, setState, reset, storageOk } = useAppState();

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
        <div className="max-w-6xl mx-auto px-4 py-3 text-sm text-gray-600">
          ライフプランに、積立・住宅ローン・教育費・年金・家計実績を抜けもれなく反映します。
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <LifeplanPage state={state} setState={setState} />
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-8 text-center text-xs text-gray-400">
        本アプリは一般的な情報提供を目的とした概算ツールであり、専門的な助言を提供するものではありません。
      </footer>
    </div>
  );
}
