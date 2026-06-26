export const ErrorCode = {
  MissingConfirmedMetric: "MISSING_CONFIRMED_METRIC",
  UnsupportedAgeRange: "UNSUPPORTED_AGE_RANGE",
  OcrLowConfidence: "OCR_LOW_CONFIDENCE",
  AiOutputInvalid: "AI_OUTPUT_INVALID",
  ReportRequiresDoctorReview: "REPORT_REQUIRES_DOCTOR_REVIEW"
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
