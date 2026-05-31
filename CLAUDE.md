<!-- SPECKIT START -->
現在アクティブな実装計画: `specs/001-fp-comprehensive/plan.md`

技術スタック・プロジェクト構造・コマンド等の詳細は上記 plan.md と、
`specs/001-fp-comprehensive/` 配下の spec.md / research.md / data-model.md /
contracts/domain-api.md / quickstart.md を参照すること。

要点:
- フロントエンドのみのSPA（TypeScript + React + Vite + Tailwind + Recharts）。バックエンドなし。
- 金融計算は `src/domain` の純粋関数に集約し Vitest でテスト。UIは `src/features`。
- 個人データは localStorage にのみ保存（外部送信禁止）。各結果画面に免責表示を常設。
- 検証可能な数式は厳密にテスト、税率・料率等は出典・適用年度付き定数として「前提」扱い。
<!-- SPECKIT END -->
