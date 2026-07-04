# Design Specification: FP Planner Bug Fixes & Coverage Expansion

**Date**: 2026-07-05 | **Status**: Under Review (Comprehensive Audit & Visual Evidence)

日本版・包括的FP支援アプリにおける、徹底的なコードレビューと Playwright MCP を用いた実機検証に基づくバグ修正、未実装UIの追加、および計算コアのテストカバレッジ100%達成のための設計書。

## 洗い出された不具合と改善内容（実機検証済み）

### 1. 計算ロジック・丸めの不具合

#### 1.1. 資産残高がマイナス（借金）になった際に、運用利回りによってマイナスが急加速するバグ
* **ファイル**: [projection.ts](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/src/domain/cashflow/projection.ts)
* **実証**: Playwright MCPによる検証にて、35歳時点で資産700万（利回り3%）を入力した際、87歳で資産がマイナスに転じた後、95歳で残高が **-4,687.7万円** という極端な負値に急落することを確認（87〜95歳の8年間の生活支出は合計2400万であるため、利回り適用がなければ -2400万程度に収まるはず）。これは借金に対して正の運用利回り（3%）が複利適用されてマイナスが無限増殖しているためです。（保有資産を0にすると利回りが0%になり、この不自然な急降下が発生しなくなります）。
* **解決策**: 運用利息は前年残高がプラス（`balance > 0`）のときのみ発生するように計算式を修正します。
  ```typescript
  const interest = balance > 0 ? balance * returnRate : 0;
  balance = yen(balance + interest + net);
  ```

#### 1.2. 現在年齢が試算終了年齢を超えた（逆転した）際に、初期状態のメッセージが表示される不整合
* **ファイル**: [CashflowView.tsx](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/src/features/lifeplan/CashflowView.tsx)
* **実証**: Playwright MCPにて「本人の現在年齢」を `100` （終了年齢は `95`）に設定した際、アプリはクラッシュしませんでしたが、結果画面に「本人の年齢を入力すると、生涯のキャッシュフローが表示されます」という初期未入力時のメッセージが表示され、入力矛盾に対する適切な警告が表示されません。
* **解決策**: 開始年齢が終了年齢を超えている場合に、エラー表示（`何歳まで試算するか（95歳）が本人の現在年齢（100歳）より小さくなっています。`）を出すようにUI条件分岐を追加します。

#### 1.3. 日本の円未満切り捨て丸め処理が、負の数に対して不正確なバグ
* **ファイル**: [rounding.ts](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/src/domain/finance/rounding.ts)
* **内容**: `yen(value)` にて `Math.floor(value)` を適用していますが、`Math.floor` は負の数に対して「より小さい（マイナスが大きい）整数」へ丸める（例: `-100.2` → `-101`）ため、収支がマイナスの際に資産が余分に減少します。日本の金額の「切り捨て」は絶対値の切り捨て（零方向への丸め）が基本です。
* **解決策**: `Math.trunc(value)` を使用して、正負に関わらず端数を単に切り捨てる（`-100.2` → `-100`）ように修正します。

#### 1.4. 元金均等ローンの「返済額軽減型」繰上返済で、元金返済額が再計算されないバグ
* **ファイル**: [loan.ts](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/src/domain/finance/loan.ts)
* **内容**: 元金均等返済のときに返済額軽減型の繰上返済を行うと、毎月の元金返済額（`fixedPrincipalPart`）が初期借入額ベースで固定されたままでした。これでは期間短縮型と同じ挙動になってしまいます。
* **解決策**:
  - `fixedPrincipalPart` を `let` に変更。
  - 返済額軽減型の繰上返済時に `method === "equalPrincipal"` であれば `fixedPrincipalPart = yen(balance / remainMonths)` として再計算します。

---

### 2. UI・UXの不具合と未実装機能

#### 2.1. `NumberField` にて数値を消した際に `0` が居座るバグ
* **ファイル**: [ui.tsx](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/src/components/ui.tsx)
* **実証**: Playwright MCPによる操作にて、入力欄の数値をバックスペースで消そうとすると `0` が強制され、消すことができない挙動（およびその後に数値を打ち込むと頭に `0` が残る挙動）を再現・確認しました。
* **解決策**: コンポーネント内にローカル状態 `inputValue: string` を持たせ、入力中は文字列のまま保持し、空欄（`""`）も許容します。変更時にパースして親に通知する仕組みにします。

#### 2.2. 住宅ローンの「繰上返済」がUIから入力できないバグ
* **ファイル**: [LifeplanForm.tsx](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/src/features/lifeplan/LifeplanForm.tsx)
* **内容**: ドメインロジック（`loan.ts`）や型定義（`types.ts`）ではローンの繰上返済（`prepayments`）の計算がサポートされていますが、UI（入力フォーム）に繰上返済を追加・編集する項目が一切存在しません。
* **解決策**: 住宅ローンの各項目の配下に、適用されている繰上返済のリストを表示し、「＋ 繰上返済を追加」ボタンと「削除」ボタン、および「返済月（ヶ月目）」「返済額」「方式（期間短縮/返済額軽減）」を編集するフォームを追加します。

#### 2.3. 教育費プランで「大学通学方法（自宅/自宅外）」がUIから選択できないバグ
* **ファイル**: [LifeplanForm.tsx](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/src/features/lifeplan/LifeplanForm.tsx)
* **内容**: ドメインロジック（`cost.ts`）では自宅外通学（`away`）の際に年間仕送り加算（90万円）を計算するようになっていますが、UIに選択肢がないため、常に `home` （自宅通学）でしか計算されません。
* **解決策**: 大学の進路が `"none"`（進学なし）以外の場合にのみ、「大学通学方法（自宅/自宅外）」の選択フィールド（SelectField）を表示するように追加します。

#### 2.4. iDeCo以外の積立プランでも「課税所得帯」が常に表示されるUX不整合
* **ファイル**: [LifeplanForm.tsx](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/src/features/lifeplan/LifeplanForm.tsx)
* **内容**: NISAや特定口座の積立プランでは「課税所得帯」は計算に使われませんが、UI上で常に表示されており、ユーザーの混乱を招きます。
* **解決策**: 口座種別（`accountType`）が `"ideco"` のときのみ、課税所得帯の選択フィールドを表示するように条件分岐を追加し、不要な入力を隠します。

---

## テストの追加設計（Vitest カバレッジ100%達成用）

#### [MODIFY] [projection.test.ts](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/tests/domain/projection.test.ts)
- `state.budgetRecords`（家計実績）から年次の実績ベース支出がキャッシュフローに正しく計上されるかを検証。
- 資産がマイナスに転じた際、運用利回りが適用されず利息が0になり、バグ修正（`Math.trunc` 等）が効いて正確に計算されるかを検証。

#### [MODIFY] [warnings.test.ts](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/tests/domain/warnings.test.ts)
- `budgetRecords` と `expenses` の双方が登録されている場合に、重複警告 `duplicate-budget` が生成されることを検証。

#### [MODIFY] [loan.test.ts](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/tests/domain/loan.test.ts)
- 元利均等および元金均等の双方での、返済額軽減型繰上返済の計算結果（元金均等は期間が維持され、元利均等は毎月返済額が減少すること）を検証。

#### [MODIFY] [education.test.ts](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/tests/domain/education.test.ts)
- `university: "none"`（大学進学なし）および大学の通学方法（`universityCommute: "away"` 自宅外通学）の各進路での教育費スケジュールを検証。

#### [MODIFY] [account.test.ts](file:///c:/Users/ユーザー/Desktop/antigravity/260531_FinacialPlanner_ver1/tests/domain/account.test.ts)
- `taxableIncomeBand` が `undefined` もしくは未知の値である場合に、iDeCoの所得控除節税額が0になるフォールバック挙動を検証。

---

## 検証計画 (Verification Plan)

### Automated Tests
- `npm run test` (Vitest) を実行し、全テストの通過と `src/domain` 配下のカバレッジ 100% 到達を確認する。

### Manual Verification (Playwright MCP)
- ブラウザ上で以下の一連の動作と結果表示を確認する。
  1. 数値フィールドの値を消した際、`0` が残らず空になり、頭に `0` のない数値（例: `40`）をスムーズに入力できること。
  2. 住宅ローンの入力欄にて「＋ 繰上返済を追加」を押し、追加した繰上返済（軽減型/期間短縮型）がキャッシュフローに正しく反映されること。
  3. 教育費プランにて、大学の進路を「国公立」にし、かつ「自宅外」を選択した際、仕送り加算（90万円）が正しくキャッシュフローの教育費に反映されること。
  4. 積立にて、「NISA」の時は課税所得帯が非表示になり、「iDeCo」の時のみ表示されること。
  5. 資産がマイナスに転じた後、不自然な急降下が起きず、緩やかな減少（利回り0%）になること。
  6. 開始年齢が終了年齢を超えた際、適切に「何歳まで試算するか（95歳）が本人の現在年齢（100歳）より小さくなっています。」のエラー表示が結果画面に出ること。
  7. 項目をすべて手動削除した後にページをリロードしても、サンプルデータが自動復活しないこと。
