export const CHILD_GROWTH_STANDARD_VERSION = "MVP-local-reference-2026-06";

type AbnormalityLevel = "normal" | "mild" | "moderate" | "severe" | "unable_to_evaluate";
type Sex = "male" | "female";

type BmiBand = {
  minAgeYears: number;
  maxAgeYears: number;
  overweightBmi: number;
  obesityBmi: number;
  shortHeightCm: number;
  severeShortHeightCm: number;
};

const bands: Record<Sex, BmiBand[]> = {
  male: [
    { minAgeYears: 2, maxAgeYears: 5, overweightBmi: 17.8, obesityBmi: 19.4, shortHeightCm: 98, severeShortHeightCm: 94 },
    { minAgeYears: 6, maxAgeYears: 8, overweightBmi: 18.5, obesityBmi: 20.5, shortHeightCm: 106, severeShortHeightCm: 100 },
    { minAgeYears: 9, maxAgeYears: 12, overweightBmi: 21, obesityBmi: 24, shortHeightCm: 128, severeShortHeightCm: 122 }
  ],
  female: [
    { minAgeYears: 2, maxAgeYears: 5, overweightBmi: 17.6, obesityBmi: 19.1, shortHeightCm: 97, severeShortHeightCm: 93 },
    { minAgeYears: 6, maxAgeYears: 8, overweightBmi: 18.3, obesityBmi: 20.2, shortHeightCm: 105, severeShortHeightCm: 99 },
    { minAgeYears: 9, maxAgeYears: 12, overweightBmi: 20.8, obesityBmi: 23.6, shortHeightCm: 127, severeShortHeightCm: 121 }
  ]
};

export function ageInYears(birthDate: string, at: Date): number {
  const birth = new Date(`${birthDate}T00:00:00.000Z`);

  return Math.floor((at.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function findBand(sex: Sex, ageYears: number): BmiBand | undefined {
  return bands[sex].find((band) => ageYears >= band.minAgeYears && ageYears <= band.maxAgeYears);
}

export function evaluateBmiLevel(
  sex: Sex,
  ageYears: number,
  heightCm: number,
  weightKg: number
): AbnormalityLevel {
  const band = findBand(sex, ageYears);
  if (!band) return "unable_to_evaluate";

  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  if (bmi >= band.obesityBmi) return "moderate";
  if (bmi >= band.overweightBmi) return "mild";

  return "normal";
}

export function evaluateHeightLevel(sex: Sex, ageYears: number, heightCm: number): AbnormalityLevel {
  const band = findBand(sex, ageYears);
  if (!band) return "unable_to_evaluate";

  if (heightCm < band.severeShortHeightCm) return "severe";
  if (heightCm < band.shortHeightCm) return "moderate";

  return "normal";
}
