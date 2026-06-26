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

export function ageInYears(birthDate: string, at: Date): number | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return undefined;

  const [, yearText, monthText, dayText] = match;
  const birthYear = Number(yearText);
  const birthMonth = Number(monthText);
  const birthDay = Number(dayText);
  const birth = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));
  if (
    birth.getUTCFullYear() !== birthYear ||
    birth.getUTCMonth() !== birthMonth - 1 ||
    birth.getUTCDate() !== birthDay
  ) {
    return undefined;
  }

  const atYear = at.getUTCFullYear();
  const atMonth = at.getUTCMonth() + 1;
  const atDay = at.getUTCDate();
  if (
    birthYear > atYear ||
    (birthYear === atYear && birthMonth > atMonth) ||
    (birthYear === atYear && birthMonth === atMonth && birthDay > atDay)
  ) {
    return undefined;
  }

  const hadBirthdayThisYear = atMonth > birthMonth || (atMonth === birthMonth && atDay >= birthDay);

  return atYear - birthYear - (hadBirthdayThisYear ? 0 : 1);
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
