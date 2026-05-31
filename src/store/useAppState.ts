// AppState を localStorage と同期する React フック。
// 変更のたびに自動保存する（FR-012相当の永続化、憲章II: ローカルのみ）。

import { useCallback, useEffect, useState } from "react";
import type { AppState } from "../domain/types";
import {
  clearState,
  createInitialState,
  isStorageAvailable,
  loadState,
  saveState,
} from "./persistence";

export function useAppState() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [storageOk] = useState<boolean>(() => isStorageAvailable());

  // 状態変更を自動保存
  useEffect(() => {
    saveState(state);
  }, [state]);

  /** 部分更新ヘルパ。 */
  const update = useCallback((patch: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  /** 全データ削除（FR-005）。 */
  const reset = useCallback(() => {
    clearState();
    setState(createInitialState());
  }, []);

  return { state, setState, update, reset, storageOk };
}
