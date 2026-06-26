import { request } from "../../../api/client";
import type { DoctorReviewRequest, ReportContent, ReportDraft } from "../../../api/types";

Page({
  data: {
    checkupId: "",
    draftId: "",
    summary: "",
    indicatorExplanation: "",
    abnormalMeaning: "",
    departmentAdvice: "",
    homeIntervention: "",
    followUpAdvice: "",
    posterTitle: "",
    posterBullets: [] as string[],
    loading: true,
    submitting: false
  },

  async onLoad(query: { checkupId?: string }) {
    const checkupId = query.checkupId ?? "";
    this.setData({ checkupId, loading: true });

    try {
      const draft = await request<ReportDraft>(`/checkups/${checkupId}/report-drafts`, "POST");
      this.setData({
        draftId: draft.id,
        summary: draft.content.summary,
        indicatorExplanation: draft.content.indicatorExplanation,
        abnormalMeaning: draft.content.abnormalMeaning,
        departmentAdvice: draft.content.departmentAdvice,
        homeIntervention: draft.content.homeIntervention,
        followUpAdvice: draft.content.followUpAdvice,
        posterTitle: draft.content.posterTitle,
        posterBullets: draft.content.posterBullets
      });
    } catch (error) {
      wx.showToast({ icon: "none", title: "草稿生成失败" });
    } finally {
      this.setData({ loading: false });
    }
  },

  onIndicatorExplanationInput(event: WechatMiniprogram.Input) {
    this.setData({ indicatorExplanation: event.detail.value });
  },

  onAbnormalMeaningInput(event: WechatMiniprogram.Input) {
    this.setData({ abnormalMeaning: event.detail.value });
  },

  onDepartmentAdviceInput(event: WechatMiniprogram.Input) {
    this.setData({ departmentAdvice: event.detail.value });
  },

  onHomeInterventionInput(event: WechatMiniprogram.Input) {
    this.setData({ homeIntervention: event.detail.value });
  },

  onFollowUpAdviceInput(event: WechatMiniprogram.Input) {
    this.setData({ followUpAdvice: event.detail.value });
  },

  editedContent(): ReportContent {
    return {
      summary: this.data.summary,
      indicatorExplanation: this.data.indicatorExplanation,
      abnormalMeaning: this.data.abnormalMeaning,
      departmentAdvice: this.data.departmentAdvice,
      homeIntervention: this.data.homeIntervention,
      followUpAdvice: this.data.followUpAdvice,
      posterTitle: this.data.posterTitle,
      posterBullets: this.data.posterBullets
    };
  },

  async approve() {
    if (!this.data.draftId) return;

    const body: DoctorReviewRequest = {
      doctorId: "doctor_demo",
      editedContent: this.editedContent()
    };

    this.setData({ submitting: true });

    try {
      await request(`/report-drafts/${this.data.draftId}/doctor-review`, "POST", body);
      wx.showToast({ title: "已审核" });
    } catch (error) {
      wx.showToast({ icon: "none", title: "审核失败" });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
