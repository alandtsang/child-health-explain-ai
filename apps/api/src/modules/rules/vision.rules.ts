export const VISION_STANDARD_VERSION = "MVP-local-reference-2026-06";

type AbnormalityLevel = "normal" | "mild" | "moderate" | "severe" | "unable_to_evaluate";

export function evaluateVisionLevel(ageYears: number, leftVision: number, rightVision: number): AbnormalityLevel {
  const minExpectedVision = ageYears < 5 ? 0.6 : 0.8;
  const worst = Math.min(leftVision, rightVision);

  if (worst < minExpectedVision - 0.2) return "moderate";
  if (worst < minExpectedVision) return "mild";

  return "normal";
}
