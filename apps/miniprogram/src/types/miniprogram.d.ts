declare const App: (options: Record<string, unknown>) => void;
declare const Page: (options: Record<string, unknown> & ThisType<any>) => void;

declare const wx: {
  navigateTo(options: { url: string }): void;
  request(options: {
    url: string;
    method: "GET" | "POST";
    data?: unknown;
    success(res: { statusCode: number; data: unknown }): void;
    fail(error: unknown): void;
  }): void;
  showToast(options: { title: string; icon?: "none" }): void;
};

declare namespace WechatMiniprogram {
  type Input = {
    detail: {
      value: string;
    };
  };

  type PickerChange = {
    detail: {
      value: string | number;
    };
  };
}
