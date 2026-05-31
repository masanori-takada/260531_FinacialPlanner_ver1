import { describe, it, expect } from "vitest";
import { educationCostSchedule } from "../../src/domain/education/cost";
import { ELEMENTARY_ANNUAL } from "../../src/domain/constants/education";

const allPublicPath = {
  kindergarten: "public" as const,
  elementary: "public" as const,
  juniorHigh: "public" as const,
  highSchool: "public" as const,
  university: "nationalPublic" as const,
  universityCommute: "home" as const,
};

describe("educationCostSchedule", () => {
  it("全公立・国公立大（自宅）: 年次費用と合計が返る", () => {
    const result = educationCostSchedule(3, allPublicPath); // 3歳（幼稚園入学年）
    expect(result.perYear.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
  });

  it("費用が発生しない年の cost は 0", () => {
    // 2歳の場合、まだ幼稚園に入っていない年が存在するはず
    const result = educationCostSchedule(2, allPublicPath);
    const age2row = result.perYear.find((r) => r.age === 2);
    expect(age2row?.cost).toBe(0);
  });

  it("全公立の小学校6年分の合計は定数×6と一致する", () => {
    const result = educationCostSchedule(6, allPublicPath); // 6歳（小学校入学年）
    const elementaryRows = result.perYear.filter((r) => r.stage === "elementary");
    const elementaryTotal = elementaryRows.reduce((s, r) => s + r.cost, 0);
    expect(elementaryTotal).toBe(ELEMENTARY_ANNUAL.public * 6);
  });

  it("大学なし（university='none'）のとき大学費用が0", () => {
    const nounivPath = { ...allPublicPath, university: "none" as const };
    const result = educationCostSchedule(3, nounivPath);
    const univRows = result.perYear.filter((r) => r.stage === "university");
    expect(univRows.reduce((s, r) => s + r.cost, 0)).toBe(0);
  });

  it("下宿（away）で仕送り分が加算されてホームより高い", () => {
    const awayPath = { ...allPublicPath, universityCommute: "away" as const };
    const homeResult = educationCostSchedule(3, allPublicPath);
    const awayResult = educationCostSchedule(3, awayPath);
    expect(awayResult.total).toBeGreaterThan(homeResult.total);
  });
});
