import { request } from "../../../api/client";
import type { CreateCheckupResponse } from "../../../api/types";
import { buildCheckupDraftRequest, sexOptions } from "./checkup-edit.form";

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
    selectedSexLabel: sexOptions[0].label,
    submitting: false
  },

  onNameInput(event: WechatMiniprogram.Input) {
    this.setData({ childName: event.detail.value });
  },

  onBirthDateInput(event: WechatMiniprogram.Input) {
    this.setData({ childBirthDate: event.detail.value });
  },

  onSexChange(event: WechatMiniprogram.PickerChange) {
    const sexIndex = Number(event.detail.value);
    const selectedSexLabel = sexOptions[sexIndex]?.label ?? sexOptions[0].label;

    this.setData({ sexIndex, selectedSexLabel });
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
    const result = buildCheckupDraftRequest(this.data, now);

    if (result.ok === false) {
      wx.showToast({ icon: "none", title: result.message });
      return;
    }

    this.setData({ submitting: true });

    try {
      const response = await request<CreateCheckupResponse>("/checkups", "POST", result.body);
      wx.navigateTo({ url: `/src/pages/doctor/review/review?checkupId=${response.checkup.id}` });
    } catch (error) {
      wx.showToast({ icon: "none", title: "提交失败" });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
