# Design Specification: FP Planner Bug Fixes & Coverage Expansion

**Date**: 2026-07-05 | **Status**: Approved

日本版・包括的FP支援アプリにおけるバグ修正および計算コアのテストカバレッジ100%達成のための設計書。

## Proposed Changes

### Component 1: Store Persistence

#### [MODIFY] [persistence.ts](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/src/store/persistence.ts)
- **バグ内容**: ユーザーが項目をすべて手動削除して「空」にした状態でリロードすると、`isEmptyLifeplanState`の判定により、勝手にサンプルデータ（`createInitialState()`）が読み込まれてしまう。
- **解決策**: `loadState()` 関数内の `isEmptyLifeplanState(parsed)` による初期化処理を削除し、ローカルストレージにある空の状態をそのまま読み込めるようにする。
- **検証**: 手動でデータをすべて削除した後、リロードしてもサンプルデータが復活しないことを確認する。

### Component 2: Loan Calculation Core

#### [MODIFY] [loan.ts](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/src/domain/finance/loan.ts)
- **バグ内容**: 元金均等返済（`equalPrincipal`）時に「返済額軽減型」の繰上返済を行うと、毎月の元金返済額（`fixedPrincipalPart`）が固定値のままであるため、返済額が軽減されず期間が短縮されてしまう。
- **解決策**:
  - `fixedPrincipalPart` を `let` 定義に変更する。
  - 返済額軽減型の繰上返済時に、`method === "equalPrincipal"` であれば `fixedPrincipalPart = yen(balance / remainMonths)` として毎月の元金部分を再計算する。
- **検証**: 元金均等で返済額軽減型繰上返済を行った際、毎月の返済額が減少し、かつ全体の返済期間が維持されることをテストで検証する。

### Component 3: Test Coverage Expansion

#### [MODIFY] [projection.test.ts](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/tests/domain/projection.test.ts)
- **内容**: `state.budgetRecords`（家計実績）が登録されている場合に、キャッシュフロー（`projection.ts`）に実績ベース of 支出が正しく反映されるかを検証するテストケースを追加。

#### [MODIFY] [warnings.test.ts](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/tests/domain/warnings.test.ts)
- **内容**: `budgetRecords` と `expenses` の双方が登録されている場合に、重複計上を警告する `duplicate-budget` が生成されることを検証するテストケースを追加。

#### [MODIFY] [loan.test.ts](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/tests/domain/loan.test.ts)
- **内容**: 元利均等返済および元金均等返済の「返済額軽減型」繰上返済に対するテストケースを追加。

#### [MODIFY] [education.test.ts](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/tests/domain/education.test.ts)
- **内容**: 進路情報において大学進学を `"none"`（大学進学なし）とした場合に教育費が0になることを検証するテストケースを追加。

#### [MODIFY] [account.test.ts](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/tests/domain/account.test.ts)
- **内容**: `taxableIncomeBand` が `undefined` もしくは未知の値である場合に、iDeCo節税額が0になることを検証するテストケースを追加。

## Verification Plan

### Automated Tests
- `npm run test` (Vitest) を実行し、全テストの通過と `src/domain` 配下のコードカバレッジが 100% に到達することを確認する。

### Manual Verification
- Playwright MCP を使用し、ブラウザ上で以下の挙動を確認する。
  - 「サンプル入力を読み込む」を押し、その後手動ですべての項目を削除して空にし、ページをリロードする。この際、サンプルデータが復活せず空のままであること。
  - コンソールエラーが起きていないこと。
