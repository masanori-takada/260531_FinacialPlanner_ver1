# Implementation Plan: 日本版・包括的FP支援アプリ

**Branch**: `001-fp-comprehensive` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-fp-comprehensive/spec.md`

## Summary

ブラウザ完結型（バックエンド・外部送信なし）のSPAとして、生涯キャッシュフロー表を中核に、
NISA/iDeCo積立・住宅ローン・教育資金・公的年金・家計管理の6機能を提供する。
金融計算は副作用のない純粋関数として`src/domain`に集約し、UI（React）から分離。
個人データはlocalStorageに保存する。検証可能な数式（複利・ローン償還・キャッシュフロー）は
ハンド計算の期待値で厳密にテストし、改定されうる税率・料率・教育費・年金式は出典・適用年度を
明記した定数モジュールとして「前提」扱いにする。

## Technical Context

**Language/Version**: TypeScript 5.x（strict） / Node.js 22 LTS

**Primary Dependencies**: React 18, Vite 5, Tailwind CSS 3, Recharts 2（チャート）

**Storage**: ブラウザ localStorage（バージョン付きJSONスキーマ、外部DBなし）

**Testing**: Vitest（計算コアの単体テスト中心）。jsdomは不要（domainは純粋関数）

**Target Platform**: モダンなデスクトップブラウザ（Chrome/Edge/Firefox/Safari 最新）

**Project Type**: シングルプロジェクト（フロントエンドのみのSPA）。バックエンドなし

**Performance Goals**: 入力変更から再計算・再描画まで体感即時（<100ms、95歳までの年次計算規模）

**Constraints**: オフライン動作可能、外部ネットワーク送信ゼロ、個人データは端末内のみ

**Scale/Scope**: 単一世帯・単一利用者。画面はダッシュボード＋6機能タブ。計算系列は最大100年程度

## Constitution Check

*GATE: Phase 0前に通過必須。Phase 1設計後に再確認。*

憲章の5原則に対する適合確認:

- **I. 計算の正確性と検証可能性（NON-NEGOTIABLE）**:
  - ✅ 全計算を`src/domain`の純粋関数に集約。検証可能な数式（複利・元利均等/元金均等償還・
    キャッシュフロー投影・繰上返済）はハンド計算の期待値でVitestテストを必須化。
  - ✅ 改定されうる数値（20.315%、iDeCo所得控除、年金算定式、教育費目安、NISA枠）は
    `src/domain/constants`に出典・適用年度コメント付きで集約し「前提（assumption）」扱い。
    テストは「その定数を所与として数式が正しいか」を検証し、「定数が現行法か」は検証しない。
  - ✅ 丸め方針（円未満切り捨て等）を計算ごとに定義しテストで固定。
- **II. プライバシー優先・ローカルファースト**:
  - ✅ 永続化はlocalStorageのみ。fetch/XHR等の外部送信コードを置かない。解析タグ不使用。
- **III. 「専門的助言ではない」旨の明示**:
  - ✅ 起動時バナー＋各結果画面に免責コンポーネントを常設。商品推奨表現を排除。
- **IV. テストファーストな計算コア**:
  - ✅ domain各モジュールはテスト→実装の順（Red-Green-Refactor）。UIなしで全テスト実行可能。
- **V. シンプルさ・日本語UX・アクセシビリティ**:
  - ✅ 日本語UI既定、段階的入力、YAGNI遵守。仕様外機能は実装しない。

**判定**: 違反なし（GATE通過）。Complexity Tracking記入不要。

## Project Structure

### Documentation (this feature)

```text
specs/001-fp-comprehensive/
├── plan.md              # 本ファイル
├── research.md          # Phase 0 出力（技術選定の根拠）
├── data-model.md        # Phase 1 出力（エンティティ定義）
├── quickstart.md        # Phase 1 出力（起動手順）
├── contracts/
│   └── domain-api.md    # Phase 1 出力（domain関数のI/O契約）
├── checklists/
│   └── requirements.md  # 仕様品質チェックリスト
└── tasks.md             # Phase 2 出力（/speckit-tasksで生成）
```

### Source Code (repository root)

```text
src/
├── domain/                     # 純粋な計算コア（UI非依存・テスト対象の中心）
│   ├── constants/              # 改定されうる定数（出典・適用年度コメント付き＝前提）
│   │   ├── tax.ts              # 譲渡益課税20.315%、所得税率帯 等
│   │   ├── pension.ts          # 年金満額・乗率 等
│   │   └── education.ts        # 進路別教育費の代表値テーブル
│   ├── finance/
│   │   ├── compound.ts         # 複利・積立将来価値（検証可能な数式）
│   │   ├── loan.ts             # 元利均等/元金均等・償還表・繰上返済
│   │   └── rounding.ts         # 丸め方針
│   ├── cashflow/
│   │   └── projection.ts       # 生涯キャッシュフロー投影＋資産枯渇検出
│   ├── investment/
│   │   └── account.ts          # NISA/iDeCo/特定口座の比較＋iDeCo節税概算
│   ├── education/
│   │   └── cost.ts             # 子どもの進路から年次教育費
│   ├── pension/
│   │   └── estimate.ts         # 老齢基礎＋厚生年金の概算＋繰上/繰下調整
│   ├── household/
│   │   └── budget.ts           # 月次収支・貯蓄率・カテゴリ集計
│   └── types.ts                # 共有エンティティ型
├── store/
│   └── persistence.ts          # localStorageの読み書き（バージョン付きスキーマ）
├── features/                   # 機能別UI（domainを呼ぶ薄い層）
│   ├── lifeplan/               # US1 ライフプラン/キャッシュフロー
│   ├── investment/             # US2 積立シミュレーション
│   ├── loan/                   # US3 住宅ローン
│   ├── education/              # US4 教育資金
│   ├── pension/                # US5 公的年金
│   └── budget/                 # US6 家計管理
├── components/                 # 共通UI（免責バナー、入力部品、グラフラッパ等）
│   └── Disclaimer.tsx
├── App.tsx                     # タブ構成のダッシュボード
└── main.tsx                    # エントリポイント

tests/
└── domain/                     # domain各モジュールの単体テスト（Vitest）

index.html, package.json, vite.config.ts, tsconfig.json, tailwind.config.js
```

**Structure Decision**: フロントエンドのみのシングルプロジェクト。最重要の設計判断は
`src/domain`（純粋計算コア）と`src/features`（UI）の厳格な分離。これにより憲章I/IVの
「UIなしで全テスト実行可能」「計算の検証可能性」を構造的に担保する。

## 実装シーケンス（優先度準拠）

「全部入りを一度に着地させず」、優先度順に縦割りスライスで構築する。

1. **基盤**: Viteプロジェクト初期化、Tailwind、Vitest、免責コンポーネント、localStorage層
2. **P1 ライフプラン（縦割り完成）**: domain（compound/projection＋テスト）→ store → UI →
   ブラウザで動作確認。ここで一度`npm run dev`/`npm test`が通る動くMVPを確立。
3. **P2 住宅ローン**: loan domain＋テスト → UI
4. **P2 積立シミュレーション**: compound/account domain＋テスト → UI
5. **P3 教育資金 / 公的年金 / 家計管理**: 各domain＋テスト → UI
6. **統合・仕上げ**: 教育費・年金をライフプランへ取り込み、全テスト・ビルド確認

## Complexity Tracking

> Constitution Checkに違反がないため記入不要。
