const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

export const API_BASE_URL = configuredApiUrl?.replace(/\/+$/, "") ?? "";
export const TOKEN_KEY = "meal_token";
export const ROLE_KEY = "meal_role";

export type UserRole = "admin" | "operator";

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getRole(): UserRole | null {
  if (typeof window === "undefined") {
    return null;
  }

  const role = localStorage.getItem(ROLE_KEY);

  if (role === "admin" || role === "operator") {
    return role;
  }

  return null;
}

export function setRole(role: UserRole): void {
  localStorage.setItem(ROLE_KEY, role);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export async function logoutRequest(): Promise<void> {
  const token = getToken();

  if (!token || !API_BASE_URL) {
    return;
  }

  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: authHeaders(),
    });
  } catch {
    // Best-effort server-side token revoke; local session is cleared regardless.
  }
}

export async function logout(): Promise<void> {
  await logoutRequest();
  clearToken();
  window.location.href = "/login";
}

export function redirectToLogin(): void {
  clearToken();
  window.location.href = "/login";
}

export function authHeaders(): HeadersInit {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return null;
  }

  return response.json() as Promise<T>;
}

export function handleUnauthorized(response: Response): boolean {
  if (response.status === 401 || response.status === 403) {
    redirectToLogin();
    return true;
  }

  return false;
}

export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...authHeaders(),
      ...init.headers,
    },
  });

  handleUnauthorized(response);

  return response;
}

export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  role: UserRole;
  user: {
    name: string;
    email: string;
  };
  message?: string;
  errors?: Record<string, string[]>;
};

export function assertApiBaseUrl(): void {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }
}

export async function loginRequest(credentials: LoginCredentials): Promise<Response> {
  assertApiBaseUrl();

  return fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email: credentials.email.trim(),
      password: credentials.password,
    }),
  });
}

export type EmployeeStatus = "active" | "inactive";

export type EmployeeRecord = {
  id: number;
  name: string;
  department: string;
  position: string;
  email: string;
  uid: string;
  status?: EmployeeStatus;
  is_active?: boolean;
  uid_version?: number;
  quota_today?: number;
  created_at?: string;
  updated_at?: string;
};

export function getEmployeeStatus(employee: EmployeeRecord): EmployeeStatus {
  if (employee.status === "active" || employee.status === "inactive") {
    return employee.status;
  }

  return employee.is_active === false ? "inactive" : "active";
}

export function isEmployeeActive(employee: EmployeeRecord): boolean {
  return getEmployeeStatus(employee) === "active";
}

export type MealType = "breakfast" | "lunch" | "dinner" | "other";

export type EmployeesListResponse = {
  data: EmployeeRecord[];
  meta: {
    total: number;
  };
};

export type BulkImportRowError = {
  row: number;
  message: string;
};

export type BulkImportSuccessResponse = {
  message: string;
  data: {
    imported_count: number;
  };
};

export type BulkImportErrorResponse = {
  message: string;
  errors?: BulkImportRowError[];
};

export async function bulkImportEmployees(file: File): Promise<Response> {
  assertApiBaseUrl();

  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/admin/employees/bulk`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  handleUnauthorized(response);

  return response;
}

export type MealLogRecord = {
  id: number;
  employee: {
    name: string;
    department: string;
  };
  meal_date: string;
  served_at: string;
  meal_type?: MealType;
};

export type MealLogsListResponse = {
  data: MealLogRecord[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type AnalyticsRange = "today" | "week" | "month" | "year";

export type AnalyticsPoint = {
  label: string;
  count: number;
};

export type AnalyticsResponse = {
  data: AnalyticsPoint[];
  meta: {
    range: AnalyticsRange;
    granularity: "hour" | "day" | "month";
    total: number;
    start: string;
    end: string;
  };
};

export type ReportRow = {
  id: number;
  name: string;
  department: string;
  meal_date: string;
  served_at: string;
  meal_type: MealType;
};

export type ReportSummary = {
  total: number;
  by_type: Record<MealType, number>;
  top_meal_type: MealType | null;
  top_department: string | null;
  unique_employees: number;
};

export type ReportResponse = {
  data: ReportRow[];
  summary: ReportSummary;
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  other: "Other",
};

export function buildQuery(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}
