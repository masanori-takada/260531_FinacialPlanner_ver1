// localStorage 永続化層（憲章II: 外部送信を一切行わない）。
// 単一キーにバージョン付きJSONで保存する。

import type { AppState } from "../domain/types";
import { applySampleLifeplan } from "../domain/sampleLifeplan";

const STORAGE_KEY = "fp-app:state";
export const SCHEMA_VERSION = 1;

/** テストや保存データ補完に使う既定の空状態。 */
export function createDefaultState(): AppState {
  const currentYear = new Date().getFullYear();
  return {
    schemaVersion: SCHEMA_VERSION,
    household: {
      members: [
        {
          id: "self",
          role: "self",
          name: "本人",
          birthYear: currentYear - 35,
        },
      ],
    },
    incomes: [],
    expenses: [],
    assets: [],
    lifeEvents: [],
    investmentPlans: [],
    loans: [],
    educationPlans: [],
    pensionProfile: null,
    budgetRecords: [],
    assumptions: {
      currentYear,
      endAge: 95,
      inflationRate: 0,
      salaryGrowthRate: 0,
    },
  };
}

/** 初回起動・リセット時に表示するサンプル入り状態。 */
export function createInitialState(): AppState {
  return applySampleLifeplan(createDefaultState());
}



/** localStorage が利用可能か（プライベートモード等で無効な場合がある）。 */
export function isStorageAvailable(): boolean {
  try {
    const k = "__fp_test__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/**
 * 状態を読み込む。無い/壊れている/スキーマ不一致の場合は既定状態へ初期化。
 * （v1では後方互換マイグレーションは不要なため、不一致は初期化で扱う。）
 */
export function loadState(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      return createInitialState();
    }
    // 既定状態に対して読み込み値を浅くマージし、欠落キーを補完する。
    return { ...createDefaultState(), ...parsed } as AppState;
  } catch {
    return createInitialState();
  }
}

/** 状態を保存する。失敗（容量超過・無効化）は握りつぶし、計算継続を妨げない。 */
export function saveState(state: AppState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 保存不可でもアプリ動作は継続する（呼び出し側でUI通知する）。
  }
}

/** 全データを削除する（FR-005）。 */
export function clearState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
