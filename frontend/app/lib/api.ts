export const API_BASE_URL = "http://localhost:8000/api/v1";
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

export type EmployeeRecord = {
  id: number;
  name: string;
  department: string;
  email: string;
  uid: string;
  is_active?: boolean;
  uid_version?: number;
  created_at?: string;
  updated_at?: string;
};

export type EmployeesListResponse = {
  data: EmployeeRecord[];
  meta: {
    total: number;
  };
};

export type ResendBarcodeResponse = {
  message?: string;
  data?: EmployeeRecord;
};

export type MealLogRecord = {
  id: number;
  employee: {
    name: string;
    department: string;
  };
  meal_date: string;
  served_at: string;
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
