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

export class ApiTimeoutError extends ApiError {
  constructor(message: string = "Request timed out") {
    super(408, message);
    this.name = "ApiTimeoutError";
  }
}

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:8080";

const DEFAULT_RETRYABLE_STATUS_CODES = [502, 503, 504];
const DEFAULT_IDEMPOTENT_METHODS = [
  "GET",
  "HEAD",
  "PUT",
  "DELETE",
  "OPTIONS",
  "TRACE",
];

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  retryableStatusCodes?: number[];
  allowPostRetry?: boolean;
};

function formatRequestBody(
  body: unknown,
  headers: Record<string, string>,
): BodyInit | undefined {
  if (body === undefined) return undefined;

  if (
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    typeof body === "string"
  ) {
    return body as BodyInit;
  }

  headers["Content-Type"] = "application/json";
  return JSON.stringify(body);
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");

  if (contentType && contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    return await response.text();
  } catch {
    return null;
  }
}

function mergeSignals(
  userSignal: AbortSignal | undefined,
  timeoutSignal: AbortSignal,
): AbortSignal {
  if (!userSignal) return timeoutSignal;
  const controller = new AbortController();

  const onAbort = () => {
    controller.abort();
    userSignal.removeEventListener("abort", onAbort);
    timeoutSignal.removeEventListener("abort", onAbort);
  };

  userSignal.addEventListener("abort", onAbort);
  timeoutSignal.addEventListener("abort", onAbort);

  return controller.signal;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchClient<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    body,
    headers = {},
    timeoutMs = 10000,
    retries = 0,
    retryDelayMs = 1000,
    retryableStatusCodes = DEFAULT_RETRYABLE_STATUS_CODES,
    allowPostRetry = false,
    signal: userSignal,
    method = "GET",
    ...restOptions
  } = options;

  const url =
    path.startsWith("http://") || path.startsWith("https://")
      ? path
      : `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const defaultHeaders: Record<string, string> = {
    Accept: "application/json",
  };

  const formattedBody = formatRequestBody(body, defaultHeaders);
  const mergedHeaders = {
    ...defaultHeaders,
    ...(headers as Record<string, string>),
  };

  let lastError: Error | undefined;
  const maxRetries = Math.max(0, retries);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
      const mergedSignal = mergeSignals(
        userSignal || undefined,
        timeoutController.signal,
      );

      const response = await fetch(url, {
        ...restOptions,
        method,
        headers: mergedHeaders,
        credentials: "include",
        body: formattedBody,
        signal: mergedSignal,
      });

      clearTimeout(timeoutId);
      const responseData = await parseResponse(response);

      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;

        if (
          responseData &&
          typeof responseData === "object" &&
          responseData !== null
        ) {
          if (
            "message" in responseData &&
            typeof (responseData as { message: unknown }).message === "string"
          ) {
            errorMessage = (responseData as { message: string }).message;
          } else if (
            "error" in responseData &&
            typeof (responseData as { error: unknown }).error === "string"
          ) {
            errorMessage = (responseData as { error: string }).error;
          }
        } else if (
          typeof responseData === "string" &&
          responseData.trim().length > 0
        ) {
          errorMessage = responseData;
        }

        const isRetryable =
          attempt < maxRetries &&
          retryableStatusCodes.includes(response.status) &&
          (method !== "POST" || allowPostRetry);

        if (isRetryable) {
          lastError = new ApiError(response.status, errorMessage, responseData);
          const backoffDelay = retryDelayMs * Math.pow(2, attempt);
          await delay(backoffDelay);
          continue;
        }

        throw new ApiError(response.status, errorMessage, responseData);
      }

      return responseData as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        if (userSignal?.aborted) {
          throw error;
        }
        throw new ApiTimeoutError();
      }

      const isNetworkError =
        error instanceof TypeError &&
        (error.message.includes("Failed to fetch") ||
          error.message.includes("NetworkError"));
      const isRetryable =
        attempt < maxRetries &&
        isNetworkError &&
        (method !== "POST" || allowPostRetry);

      if (isRetryable) {
        lastError = error as Error;
        const backoffDelay = retryDelayMs * Math.pow(2, attempt);
        await delay(backoffDelay);
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new ApiError(0, "Max retries exceeded");
}

export const api = {
  get: <T = unknown>(path: string, options?: RequestOptions) =>
    fetchClient<T>(path, { ...options, method: "GET" }),

  post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    fetchClient<T>(path, { ...options, method: "POST", body }),

  patch: <T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ) => fetchClient<T>(path, { ...options, method: "PATCH", body }),

  put: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    fetchClient<T>(path, { ...options, method: "PUT", body }),

  delete: <T = unknown>(path: string, options?: RequestOptions) =>
    fetchClient<T>(path, { ...options, method: "DELETE" }),
};
