# Design Specification: FP Planner Bug Fixes & Coverage Expansion

**Date**: 2026-07-05 | **Status**: Under Review (Updated with UI & Calculation Fixes)

日本版・包括的FP支援アプリにおけるバグ修正および計算コアのテストカバレッジ100%達成のための設計書。

## Proposed Changes

### Component 1: UI Components

#### [MODIFY] [ui.tsx](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/src/components/ui.tsx)
- **バグ内容**: 
  - `NumberField` にて、ユーザーがバックスペースで数値を消そうとしても `0` が強制され、消すことができない。また、その状態から数値を入力すると頭に `0` が残ってしまう（例: `040`）。
- **解決策**:
  - `NumberField` 内にローカル状態（`inputValue: string`）を導入し、ユーザーの入力中（空欄 `""` の状態を含む）はテキストのまま保持できるようにする。
  - 値が変更されたら数値にパースして親の `onChange` に通知し、無効な入力のときは一時的な空欄状態を許容する。

### Component 2: Cashflow Calculation Core

#### [MODIFY] [projection.ts](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/src/domain/cashflow/projection.ts)
- **バグ内容**: 
  - 資産合計残高（`balance`）がマイナス（借金状態）になったときにも、正の運用利回り（`returnRate`）が適用され続け、資産がマイナス方向へ急加速して減少する。結果として、保有資産を登録している場合にグラフが不自然に急降下する不具合が発生する。（保有資産が0のときは利回り0%のため、この急降下は発生しない）。
- **解決策**:
  - 運用利息（`interest`）の計算時に、前年残高がプラスの場合のみ利回りを掛け合わせるように修正する。
    ```typescript
    const interest = balance > 0 ? balance * returnRate : 0;
    balance = yen(balance + interest + net);
    ```

### Component 3: Store Persistence

#### [MODIFY] [persistence.ts](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/src/store/persistence.ts)
- **バグ内容**: ユーザーが項目をすべて手動削除して「空」にした状態でリロードすると、`isEmptyLifeplanState`の判定により、勝手にサンプルデータ（`createInitialState()`）が読み込まれてしまう。
- **解決策**: `loadState()` 関数内の `isEmptyLifeplanState(parsed)` による初期化処理を削除し、ローカルストレージにある空の状態をそのまま読み込めるようにする。

### Component 4: Test Coverage Expansion

#### [MODIFY] [projection.test.ts](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/tests/domain/projection.test.ts)
- **内容**: 
  - `state.budgetRecords`（家計実績）が登録されている場合に、キャッシュフロー（`projection.ts`）に実績ベースの支出が正しく反映されるかを検証するテストケースを追加。
  - 資産がマイナスに転じた際、運用利回りが適用されず利息が0になることを検証するテストケースを追加。

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
  - 数値をバックスペースで消した際に `0` が居座らず、空にした状態からスムーズに新しい数値を入力できること（頭に `0` が残らないこと）。
  - 保有資産を登録し、資産残高がマイナスに転じた後、グラフの減少が急加速（奈落へ落ちるような挙動）せず、緩やか（自然な減少曲線）になること。
  - 「サンプル入力を読み込む」を押し、その後手動ですべての項目を削除して空にし、ページをリロードする。この際、サンプルデータが復活せず空のままであること。
  - コンソールエラーが起きていないこと。
