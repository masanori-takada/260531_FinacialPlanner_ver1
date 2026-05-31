// 免責表示コンポーネント（憲章III / FR-002）。
// 起動時バナーと各結果画面の注記の2形態を提供する。

export function DisclaimerBanner() {
  return (
    <div
      role="note"
      className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-4 py-2"
    >
      <strong className="font-semibold">ご注意：</strong>
      本アプリの計算結果はすべて一般的な情報提供・概算シミュレーションであり、税理士・
      ファイナンシャルプランナー・金融商品取引業者による個別の専門的助言ではありません。
      特定の金融商品の購入を推奨・勧誘するものでもありません。実際のご判断は最新の制度・
      ご自身の状況をふまえ、必要に応じて専門家にご相談ください。
    </div>
  );
}

export function DisclaimerNote({ extra }: { extra?: string }) {
  return (
    <p className="text-xs text-gray-500 mt-3 leading-relaxed">
      ※ 本結果は概算です。税率・料率・各種算定式は代表値に基づく簡易計算であり、正式な
      試算・申告には使用できません。{extra}
    </p>
  );
}
