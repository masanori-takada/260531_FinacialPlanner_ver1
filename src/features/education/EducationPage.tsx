// 教育資金計画（US4）。

import { useState } from "react";
import { educationCostSchedule } from "../../domain/education/cost";
import type { EducationPath, SchoolType, UniversityKind, AppState } from "../../domain/types";
import { Card, NumberField, SelectField, StatTile } from "../../components/ui";
import { DisclaimerNote } from "../../components/Disclaimer";
import { formatYen, formatManYen } from "../../components/format";

const SCHOOL_TYPE_OPT: { value: SchoolType; label: string }[] = [
  { value: "public", label: "公立" },
  { value: "private", label: "私立" },
];
const UNIV_KIND_OPT: { value: UniversityKind | "none"; label: string }[] = [
  { value: "nationalPublic", label: "国公立大学" },
  { value: "privateHumanities", label: "私立大学（文系）" },
  { value: "privateScience", label: "私立大学（理系）" },
  { value: "none", label: "大学進学なし" },
];

export function EducationPage({ state: _state, setState: _setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const [childAge, setChildAge] = useState(0);
  const [path, setPath] = useState<EducationPath>({
    kindergarten: "public",
    elementary: "public",
    juniorHigh: "public",
    highSchool: "public",
    university: "nationalPublic",
    universityCommute: "home",
  });

  const result = educationCostSchedule(childAge, path);

  const STAGE_LABELS: Record<string, string> = {
    kindergarten: "幼稚園",
    elementary: "小学校",
    juniorHigh: "中学校",
    highSchool: "高校",
    university: "大学",
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800">教育資金計画</h2>
        <p className="text-sm text-gray-500">お子さんの年齢と進路を選ぶと、かかる教育費の目安が確認できます。</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-5">
          <Card title="お子さんの情報">
            <NumberField label="現在の年齢" value={childAge} onChange={setChildAge} suffix="歳" min={0} />
          </Card>
          <Card title="進路の選択">
            <SelectField label="幼稚園" value={path.kindergarten} options={SCHOOL_TYPE_OPT} onChange={(v) => setPath((p) => ({ ...p, kindergarten: v }))} />
            <SelectField label="小学校" value={path.elementary} options={SCHOOL_TYPE_OPT} onChange={(v) => setPath((p) => ({ ...p, elementary: v }))} />
            <SelectField label="中学校" value={path.juniorHigh} options={SCHOOL_TYPE_OPT} onChange={(v) => setPath((p) => ({ ...p, juniorHigh: v }))} />
            <SelectField label="高校" value={path.highSchool} options={SCHOOL_TYPE_OPT} onChange={(v) => setPath((p) => ({ ...p, highSchool: v }))} />
            <SelectField label="大学" value={path.university} options={UNIV_KIND_OPT} onChange={(v) => setPath((p) => ({ ...p, university: v as UniversityKind | "none" }))} />
            {path.university !== "none" && (
              <SelectField
                label="大学の通学形態"
                value={path.universityCommute ?? "home"}
                options={[
                  { value: "home", label: "自宅通学" },
                  { value: "away", label: "下宿（仕送り込み）" },
                ]}
                onChange={(v) => setPath((p) => ({ ...p, universityCommute: v as "home" | "away" }))}
              />
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="教育費の概算">
            <div className="grid grid-cols-1 gap-3 mb-4">
              <StatTile label="教育費総額（概算）" value={formatManYen(result.total)} tone="neutral" />
            </div>
            <DisclaimerNote extra="教育費は代表的な調査値を元にした目安です。実際の費用は地域・学校・個人の状況により大きく異なります。" />
          </Card>

          <Card title="年次の教育費スケジュール">
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-sm tabular">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-gray-600 border-b border-gray-200">
                    <th className="px-3 py-2 text-left">年齢</th>
                    <th className="px-3 py-2 text-left">段階</th>
                    <th className="px-3 py-2 text-right">年間費用</th>
                  </tr>
                </thead>
                <tbody>
                  {result.perYear.map((r) => (
                    <tr key={r.age} className={`border-b border-gray-100 ${r.cost > 0 ? "" : "text-gray-300"}`}>
                      <td className="px-3 py-1.5">{r.age}歳</td>
                      <td className="px-3 py-1.5">{r.stage ? STAGE_LABELS[r.stage] : "—"}</td>
                      <td className="px-3 py-1.5 text-right">{r.cost > 0 ? formatYen(r.cost) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
