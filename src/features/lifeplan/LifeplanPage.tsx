// ライフプラン機能ページ（US1）。入力フォームと結果表示を左右に配置。

import type { AppState } from "../../domain/types";
import { Button } from "../../components/ui";
import { LifeplanForm } from "./LifeplanForm";
import { CashflowView } from "./CashflowView";
import { applySampleLifeplan } from "./sampleData";

export function LifeplanPage({
  state,
  setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800">ライフプラン / キャッシュフロー表</h2>
          <p className="text-sm text-gray-500">
            家族・収入・支出・資産を入力すると、生涯の家計推移と老後資金の過不足が見える化されます。
          </p>
        </div>
        <Button variant="secondary" onClick={() => setState((s) => applySampleLifeplan(s))}>
          サンプル入力を読み込む
        </Button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <LifeplanForm state={state} setState={setState} />
        <CashflowView state={state} />
      </div>
    </div>
  );
}
