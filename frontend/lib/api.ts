export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Role = "student" | "staff";
export type Category = "notes" | "past_questions" | "slides" | "other";

export const CATEGORY_LABELS: Record<Category, string> = {
  notes: "Lecture Notes",
  past_questions: "Past Questions",
  slides: "Slides",
  other: "Other",
};

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  description: string;
  course_code: string;
  category: Category;
  s3_key: string;
  file_size_bytes: number;
  content_type: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  download_url?: string;
}

export interface PaginatedDocuments {
  items: DocumentItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface DocumentQuery {
  course_code?: string;
  category?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

export interface PresignedUrlRequest {
  filename: string;
  content_type: string;
  file_size_bytes: number;
}

export interface PresignedUrlResponse {
  upload_url: string;
  s3_key: string;
}

export interface DocumentCreate {
  title: string;
  description: string;
  course_code: string;
  category: Category;
  s3_key: string;
  file_size_bytes: number;
  content_type: string;
}

export interface DocumentUpdate {
  title?: string;
  description?: string;
  course_code?: string;
  category?: Category;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface CourseInfo {
  course_code: string;
  course_name: string;
  document_count: number;
}

export interface CategoryInfo {
  category: string;
  document_count: number;
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : undefined;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getCookie("access_token");
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function safeGet<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

const STATIC_CATEGORIES: CategoryInfo[] = [
  { category: "notes", document_count: 0 },
  { category: "past_questions", document_count: 0 },
  { category: "slides", document_count: 0 },
  { category: "other", document_count: 0 },
];

export const api = {
  getCurrentUser: async (): Promise<User | null> => {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
    if (res.status === 401) return null;
    if (!res.ok) return null;
    return (await res.json()) as User;
  },
  login: (body: LoginRequest) => request<{ access_token: string; token_type: string }>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body: RegisterRequest) => request<User>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request<{ detail: string }>("/auth/logout", { method: "POST" }),

  getDocuments: (query: DocumentQuery = {}) => {
    const params = new URLSearchParams();
    if (query.course_code) params.set("course_code", query.course_code);
    if (query.category) params.set("category", query.category);
    if (query.q) params.set("q", query.q);
    if (query.page) params.set("page", String(query.page));
    if (query.page_size) params.set("page_size", String(query.page_size));
    const qs = params.toString();
    return request<PaginatedDocuments>(`/documents${qs ? `?${qs}` : ""}`);
  },
  getDocument: (id: string) => request<DocumentItem>(`/documents/${id}`),
  requestUploadUrl: (body: PresignedUrlRequest) =>
    request<PresignedUrlResponse>("/documents/upload-url", { method: "POST", body: JSON.stringify(body) }),
  createDocument: (body: DocumentCreate) =>
    request<DocumentItem>("/documents", { method: "POST", body: JSON.stringify(body) }),
  updateDocument: (id: string, body: DocumentUpdate) =>
    request<DocumentItem>(`/documents/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteDocument: (id: string) => request<void>(`/documents/${id}`, { method: "DELETE" }),

  getCourses: async (): Promise<CourseInfo[]> => {
    const data = await safeGet<CourseInfo[]>("/courses");
    return data ?? [];
  },
  getCategories: async (): Promise<CategoryInfo[]> => {
    const data = await safeGet<CategoryInfo[]>("/categories");
    if (data && data.length > 0) return data;
    return STATIC_CATEGORIES;
  },
};

export { ApiError };
