export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://localhost:8080";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function fetchClient<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers = {}, ...restOptions } = options;

  const url = path.startsWith("http://") || path.startsWith("https://")
    ? path
    : `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const defaultHeaders: Record<string, string> = {
    Accept: "application/json",
  };

  let formattedBody: BodyInit | undefined;

  if (body !== undefined) {
    if (
      body instanceof FormData ||
      body instanceof URLSearchParams ||
      body instanceof Blob ||
      typeof body === "string"
    ) {
      formattedBody = body as BodyInit;
    } else {
      defaultHeaders["Content-Type"] = "application/json";
      formattedBody = JSON.stringify(body);
    }
  }

  const mergedHeaders = {
    ...defaultHeaders,
    ...(headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...restOptions,
    headers: mergedHeaders,
    credentials: "include",
    body: formattedBody,
  });

  let responseData: any = null;
  const contentType = response.headers.get("content-type");

  if (contentType && contentType.includes("application/json")) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  } else {
    try {
      responseData = await response.text();
    } catch {
      responseData = null;
    }
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;

    if (responseData && typeof responseData === "object") {
      if (typeof responseData.message === "string") {
        errorMessage = responseData.message;
      } else if (typeof responseData.error === "string") {
        errorMessage = responseData.error;
      }
    } else if (typeof responseData === "string" && responseData.trim().length > 0) {
      errorMessage = responseData;
    }

    throw new ApiError(response.status, errorMessage, responseData);
  }

  return responseData as T;
}

export const api = {
  get: <T = unknown>(path: string, options?: RequestOptions) =>
    fetchClient<T>(path, { ...options, method: "GET" }),

  post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    fetchClient<T>(path, { ...options, method: "POST", body }),

  patch: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    fetchClient<T>(path, { ...options, method: "PATCH", body }),

  put: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    fetchClient<T>(path, { ...options, method: "PUT", body }),

  delete: <T = unknown>(path: string, options?: RequestOptions) =>
    fetchClient<T>(path, { ...options, method: "DELETE" }),
};
