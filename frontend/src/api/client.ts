const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function api<T = any>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = localStorage.getItem('authToken');
  const headers = {
    "Content-Type": "application/json",
    ...init?.headers,
  } as HeadersInit;

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    // Try to parse error response
    const errorBody = await res.json().catch(() => ({}))
    throw new Error(errorBody.message || `${res.status} ${res.statusText}`);
  }

  // For login requests, the token is the whole response
  if (path.includes('/login')) {
    const body = await res.json();
    return body.token as T;
  }

  // For other successful requests that might not return a body (e.g., 204 No Content)
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return res.json();
  }
  
  return {} as T; // Return empty object for non-json responses
}

// ─────────────────────────── Auth ───────────────────────────

export async function login(credentials: {email: string, password: string}):Promise<string> {
    return api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
    });
}

export async function signup(credentials: {email: string, password: string}): Promise<{message: string, userId: string}> {
    return api("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(credentials),
    });
}


// ─────────────────────────────────────────────────────────────────────────────

export interface DailyTask {
  id: string;
  dateYMD: string;
  title: string;
  checked: boolean;
  note: string | null;
  value: number | null;
  weight: number;
  isOneOff: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  templateId: string | null;
  template?: {
    group: string;
  };
}

export async function getDailyTasks(
  date: string // YYYY-MM-DD
): Promise<{ dateYMD: string; tasks: DailyTask[] }> {
  return api(`/api/daily/tasks?date=${date}`);
}

// ─────────────────────────── Fixed Costs ───────────────────────────

export interface FixedCost {
  id: string;
  name: string;
  amount: number;
  paymentDate: number;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export async function getFixedCosts(): Promise<FixedCost[]> {
  return api("/api/fixed-costs");
}

export async function addFixedCost(data: { name: string; amount: number; paymentDate: number }): Promise<FixedCost> {
  return api("/api/fixed-costs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateFixedCost(id: string, data: Partial<{ name: string; amount: number; paymentDate: number }>): Promise<FixedCost> {
  return api(`/api/fixed-costs/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteFixedCost(id: string): Promise<{ ok: boolean }> {
  return api(`/api/fixed-costs/${id}`, {
    method: "DELETE",
  });
}

// ─────────────────────────── Goals ───────────────────────────

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  startDate: string; // ISO date string
  targetDate: string; // ISO date string
  progress: number;
  isAchieved: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  userId: string;
}

export async function getGoals(): Promise<Goal[]> {
  return api("/api/goals");
}

export async function createGoal(data: { title: string; description?: string; startDate: string; targetDate: string }): Promise<Goal> {
  return api("/api/goals", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateGoal(id: number, data: Partial<Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<Goal> {
  return api(`/api/goals/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteGoal(id: number): Promise<{}> {
  return api(`/api/goals/${id}`, {
    method: "DELETE",
  });
}

// ─────────────────────────── Stats ───────────────────────────

export interface StatsData {
  taskStats: {
    total: number;
    completed: number;
    completionRate: number;
  };
  categoryStats: Array<{ name: string; count: number }>;
  fixedCostStats: {
    total: number;
    count: number;
  };
}

export async function getStats(year: number, month: number): Promise<StatsData> {
  return api(`/api/stats?year=${year}&month=${month}`);
}