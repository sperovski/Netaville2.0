import {API_BASE_URL, REQUEST_TIMEOUT_MS} from './config';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {method = 'GET', body, headers = {}, signal} = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  signal?.addEventListener('abort', () => controller.abort());

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : {'Content-Type': 'application/json'}),
        ...(authToken === null ? {} : {Authorization: `Bearer ${authToken}`}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    const payload: unknown = text.length === 0 ? null : JSON.parse(text);

    if (!response.ok) {
      throw new ApiError(
        `${method} ${path} failed with ${response.status}`,
        response.status,
        payload,
      );
    }

    return payload as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, {...options, method: 'GET'}),
  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) => request<T>(path, {...options, method: 'POST', body}),
  put: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) => request<T>(path, {...options, method: 'PUT', body}),
  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) => request<T>(path, {...options, method: 'PATCH', body}),
  delete: <T>(
    path: string,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) => request<T>(path, {...options, method: 'DELETE'}),
};
