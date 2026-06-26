const API_BASE_URL = "http://localhost:8787";

type HttpMethod = "GET" | "POST";

type ApiError = {
  statusCode: number;
  message: string;
  body: unknown;
};

function toApiError(statusCode: number, body: unknown): ApiError {
  const bodyWithMessage = body as { message?: string } | undefined;

  return {
    statusCode,
    message: bodyWithMessage?.message ?? "请求失败",
    body
  };
}

export function request<T>(path: string, method: HttpMethod, data?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${path}`,
      method,
      data,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
          return;
        }

        reject(toApiError(res.statusCode, res.data));
      },
      fail: reject
    });
  });
}
