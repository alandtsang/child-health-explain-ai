export type MetricKey = "heightCm" | "weightKg" | "leftVision" | "rightVision";

export type MetricUnit = "cm" | "kg" | "decimal_vision";

export type MetricInput = {
  key: MetricKey;
  value: number;
  unit: MetricUnit;
};

export type ConfirmedMetric = MetricInput & {
  confirmedBy: "doctor" | "parent";
  confirmedAt: string;
};

export type CreateCheckupRequest = {
  childName: string;
  childSex: "male" | "female";
  childBirthDate: string;
  source: "doctor_manual" | "doctor_upload" | "parent_manual" | "parent_upload";
  metrics: ConfirmedMetric[];
  uploadedFileUrl?: string;
};

export type CreateCheckupResponse = {
  checkup: {
    id: string;
  };
};

export type ReportContent = {
  summary: string;
  indicatorExplanation: string;
  abnormalMeaning: string;
  departmentAdvice: string;
  homeIntervention: string;
  followUpAdvice: string;
  posterTitle: string;
  posterBullets: string[];
};

export type ReportDraft = {
  id: string;
  checkupId: string;
  content: ReportContent;
};

export type DoctorReviewRequest = {
  doctorId: string;
  editedContent: ReportContent;
};
