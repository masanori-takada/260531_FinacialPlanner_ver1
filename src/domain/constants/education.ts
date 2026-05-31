// ============================================================================
// 教育費に関する「改定されうる定数」＝前提（assumption）。
// 進路別の年間教育費の代表値（概算）。出典・適用年度を明記する（FR-041）。
// 出典: 文部科学省「子供の学習費調査」（幼稚園〜高校、学習塾等含む総額の代表値）、
//       日本政策金融公庫「教育費負担の実態調査」等（大学）。
// 適用年度: 公表値を丸めた代表値として使用。実額は地域・個人で大きく変動する概算。
// 単位: 円/年。
// ============================================================================

// 幼稚園（3年: 3〜5歳相当）の年間費用。
export const KINDERGARTEN_ANNUAL = {
  public: 165_000,
  private: 309_000,
} as const;

// 小学校（6年）。
export const ELEMENTARY_ANNUAL = {
  public: 353_000,
  private: 1_667_000,
} as const;

// 中学校（3年）。
export const JUNIOR_HIGH_ANNUAL = {
  public: 539_000,
  private: 1_436_000,
} as const;

// 高等学校（3年）。
export const HIGH_SCHOOL_ANNUAL = {
  public: 513_000,
  private: 1_054_000,
} as const;

// 大学（4年想定）の年間費用。私立は文系/理系で区別。
// 国公立は入学金按分込みの代表値。
export const UNIVERSITY_ANNUAL = {
  nationalPublic: 670_000,
  privateHumanities: 950_000,
  privateScience: 1_300_000,
} as const;

// 下宿（自宅外通学）の年間仕送り・住居費の加算代表値。
export const UNIVERSITY_AWAY_EXTRA_ANNUAL = 900_000;

// 各ステージの標準的な開始年齢と年数（本人=子の年齢基準）。
export const STAGE_SCHEDULE = {
  kindergarten: { startAge: 3, years: 3 },
  elementary: { startAge: 6, years: 6 },
  juniorHigh: { startAge: 12, years: 3 },
  highSchool: { startAge: 15, years: 3 },
  university: { startAge: 18, years: 4 },
} as const;
