import type { OcrField } from "@child-health/contracts";

export class LocalOcrAdapter {
  extract(fileUrl: string): OcrField[] {
    void fileUrl;

    return [
      {
        key: "heightCm",
        rawText: "110 cm",
        normalizedValue: 110,
        confidence: 0.96,
        page: 1
      },
      {
        key: "weightKg",
        rawText: "22 kg",
        normalizedValue: 22,
        confidence: 0.94,
        page: 1
      },
      {
        key: "leftVision",
        rawText: "0.8",
        normalizedValue: 0.8,
        confidence: 0.91,
        page: 1
      },
      {
        key: "rightVision",
        rawText: "0.9",
        normalizedValue: 0.9,
        confidence: 0.91,
        page: 1
      }
    ];
  }
}
