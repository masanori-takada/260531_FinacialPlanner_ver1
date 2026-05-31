// 教育資金計算（US4）。進路から年次教育費と総額を返す純粋関数。

import type { EducationCostResult, EducationCostRow, EducationPath, SchoolStage } from "../types";
import {
  KINDERGARTEN_ANNUAL,
  ELEMENTARY_ANNUAL,
  JUNIOR_HIGH_ANNUAL,
  HIGH_SCHOOL_ANNUAL,
  UNIVERSITY_ANNUAL,
  UNIVERSITY_AWAY_EXTRA_ANNUAL,
  STAGE_SCHEDULE,
} from "../constants/education";

type StageKey = keyof typeof STAGE_SCHEDULE;

function annualCost(stage: StageKey, path: EducationPath): number {
  switch (stage) {
    case "kindergarten":
      return KINDERGARTEN_ANNUAL[path.kindergarten];
    case "elementary":
      return ELEMENTARY_ANNUAL[path.elementary];
    case "juniorHigh":
      return JUNIOR_HIGH_ANNUAL[path.juniorHigh];
    case "highSchool":
      return HIGH_SCHOOL_ANNUAL[path.highSchool];
    case "university": {
      if (path.university === "none") return 0;
      const base = UNIVERSITY_ANNUAL[path.university];
      const away = path.universityCommute === "away" ? UNIVERSITY_AWAY_EXTRA_ANNUAL : 0;
      return base + away;
    }
  }
}

/**
 * 子どもの現在年齢と進路から、各年の教育費と総額を返す。
 * 返す perYear は currentAge から大学卒業まで（22歳想定）。
 * cost=0の年も含めて返す（ライフプランへの取り込みに便利）。
 */
export function educationCostSchedule(
  childAge: number,
  path: EducationPath,
): EducationCostResult {
  const stages: { stage: StageKey; startAge: number; endAge: number }[] = (
    Object.entries(STAGE_SCHEDULE) as [StageKey, { startAge: number; years: number }][]
  ).map(([stage, { startAge, years }]) => ({
    stage,
    startAge,
    endAge: startAge + years - 1,
  }));

  const maxAge = 22; // 大学4年生の終了年齢
  const perYear: EducationCostRow[] = [];

  for (let age = childAge; age <= maxAge; age++) {
    // その年齢で在籍しているステージを探す
    const stageEntry = stages.find((s) => age >= s.startAge && age <= s.endAge);
    const stage = stageEntry?.stage ?? null;
    const cost =
      stage !== null && !(stage === "university" && path.university === "none")
        ? annualCost(stage as StageKey, path)
        : 0;

    perYear.push({ age, cost, stage: stage as SchoolStage | null });
  }

  const total = perYear.reduce((s, r) => s + r.cost, 0);
  return { perYear, total };
}
