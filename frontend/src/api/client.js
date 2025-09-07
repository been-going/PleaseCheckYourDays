const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// A helper function to delay execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function api(path, init) {
    // If there's no token on the first try, wait a bit and try again.
    // This handles the race condition on refresh where the API call is made
    // before the AuthProvider has had time to load the token from localStorage.
    if (!localStorage.getItem('authToken')) {
        await sleep(100); // Wait 100ms for the token to become available
    }

    const token = localStorage.getItem('authToken');
    const headers = {
        "Content-Type": "application/json",
        ...init?.headers,
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers,
    });

    if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.message || `${res.status} ${res.statusText}`);
    }

    if (path.includes('/login')) {
        const body = await res.json();
        return body.token;
    }

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return res.json();
    }

    return {};
}

// ... (the rest of the functions like login, signup, etc. remain the same)

// ─────────────────────────── Auth ───────────────────────────
export async function login(credentials) {
    return api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
    });
}
export async function signup(credentials) {
    return api("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(credentials),
    });
}
export async function getDailyTasks(date // YYYY-MM-DD
) {
    return api(`/api/daily/tasks?date=${date}`);
}
export async function getFixedCosts() {
    return api("/api/fixed-costs");
}
export async function addFixedCost(data) {
    return api("/api/fixed-costs", {
        method: "POST",
        body: JSON.stringify(data),
    });
}
export async function updateFixedCost(id, data) {
    return api(`/api/fixed-costs/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}
export async function deleteFixedCost(id) {
    return api(`/api/fixed-costs/${id}`, {
        method: "DELETE",
    });
}
export async function getGoals() {
    return api("/api/goals");
}
export async function createGoal(data) {
    return api("/api/goals", {
        method: "POST",
        body: JSON.stringify(data),
    });
}
export async function updateGoal(id, data) {
    return api(`/api/goals/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}
export async function deleteGoal(id) {
    return api(`/api/goals/${id}`, {
        method: "DELETE",
    });
}
export async function getStats(year, month) {
    return api(`/api/stats?year=${year}&month=${month}`);
}
export async function getTemplates() {
    return api("/api/templates");
}
export async function createTemplate(data) {
    return api("/api/templates", {
        method: "POST",
        body: JSON.stringify(data),
    });
}
export async function updateTemplate(id, data) {
    return api(`/api/templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}
export async function deleteTemplate(id) {
    return api(`/api/templates/${id}`, {
        method: "DELETE",
    });
}

export async function getDashboardData(year) {
    return api(`/api/dashboard?year=${year}`);
}