import { request } from "../../../api/client";
import type { ConfirmedMetric, CreateCheckupRequest, CreateCheckupResponse } from "../../../api/types";

type SexOption = {
  label: string;
  value: "male" | "female";
};

const sexOptions: SexOption[] = [
  { label: "男孩", value: "male" },
  { label: "女孩", value: "female" }
];

function numberFromText(value: string): number {
  return Number(value.trim());
}

function buildMetric(
  key: ConfirmedMetric["key"],
  value: number,
  unit: ConfirmedMetric["unit"],
  confirmedAt: string
): ConfirmedMetric {
  return {
    key,
    value,
    unit,
    confirmedBy: "doctor",
    confirmedAt
  };
}

Page({
  data: {
    childName: "",
    childBirthDate: "2020-06-24",
    heightCm: "",
    weightKg: "",
    leftVision: "",
    rightVision: "",
    sexIndex: 0,
    sexOptions,
    submitting: false
  },

  onNameInput(event: WechatMiniprogram.Input) {
    this.setData({ childName: event.detail.value });
  },

  onBirthDateInput(event: WechatMiniprogram.Input) {
    this.setData({ childBirthDate: event.detail.value });
  },

  onSexChange(event: WechatMiniprogram.PickerChange) {
    this.setData({ sexIndex: Number(event.detail.value) });
  },

  onHeightInput(event: WechatMiniprogram.Input) {
    this.setData({ heightCm: event.detail.value });
  },

  onWeightInput(event: WechatMiniprogram.Input) {
    this.setData({ weightKg: event.detail.value });
  },

  onLeftVisionInput(event: WechatMiniprogram.Input) {
    this.setData({ leftVision: event.detail.value });
  },

  onRightVisionInput(event: WechatMiniprogram.Input) {
    this.setData({ rightVision: event.detail.value });
  },

  async submit() {
    const now = new Date().toISOString();
    const body: CreateCheckupRequest = {
      childName: this.data.childName.trim(),
      childSex: sexOptions[this.data.sexIndex].value,
      childBirthDate: this.data.childBirthDate.trim(),
      source: "doctor_manual",
      metrics: [
        buildMetric("heightCm", numberFromText(this.data.heightCm), "cm", now),
        buildMetric("weightKg", numberFromText(this.data.weightKg), "kg", now),
        buildMetric("leftVision", numberFromText(this.data.leftVision), "decimal_vision", now),
        buildMetric("rightVision", numberFromText(this.data.rightVision), "decimal_vision", now)
      ]
    };

    this.setData({ submitting: true });

    try {
      const result = await request<CreateCheckupResponse>("/checkups", "POST", body);
      wx.navigateTo({ url: `/src/pages/doctor/review/review?checkupId=${result.checkup.id}` });
    } catch (error) {
      wx.showToast({ icon: "none", title: "提交失败" });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
