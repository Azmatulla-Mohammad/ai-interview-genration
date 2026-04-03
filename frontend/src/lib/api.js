const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

function buildQuery(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });

  const queryString = search.toString();
  return queryString ? `?${queryString}` : "";
}

async function apiRequest(path, options = {}) {
  const { body, token, headers = {}, ...rest } = options;
  const requestHeaders = new Headers(headers);

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const config = {
    ...rest,
    headers: requestHeaders,
  };

  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
    config.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, config);
  } catch (error) {
    throw new Error(
      "Cannot reach the backend API. Make sure the backend is running and the frontend API URL matches it.",
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (
    typeof payload === "string" &&
    contentType.includes("text/html") &&
    /<!doctype html>|<html/i.test(payload)
  ) {
    throw new Error(
      "The frontend is pointing to itself instead of the backend API. Set VITE_API_BASE_URL to your backend URL ending with /api.",
    );
  }

  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : payload?.detail || "Something went wrong.";
    throw new Error(message);
  }

  return payload;
}

export const api = {
  register: (body) =>
    apiRequest("/auth/register", {
      method: "POST",
      body,
    }),

  login: (body) =>
    apiRequest("/auth/login", {
      method: "POST",
      body,
    }),

  me: (token) =>
    apiRequest("/auth/me", {
      method: "GET",
      token,
    }),

  generateQuestions: (body, token) =>
    apiRequest("/questions/generate", {
      method: "POST",
      body,
      token,
    }),

  getQuestions: (params, token) =>
    apiRequest(`/questions${buildQuery(params)}`, {
      method: "GET",
      token,
    }),

  getQuestion: (questionId, token) =>
    apiRequest(`/questions/${questionId}`, {
      method: "GET",
      token,
    }),

  submitAnswer: (body, token) =>
    apiRequest("/evaluations", {
      method: "POST",
      body,
      token,
    }),

  getEvaluation: (evaluationId, token) =>
    apiRequest(`/evaluations/${evaluationId}`, {
      method: "GET",
      token,
    }),

  getHistory: (params, token) =>
    apiRequest(`/history${buildQuery(params)}`, {
      method: "GET",
      token,
    }),

  getAnalytics: (token) =>
    apiRequest("/analytics", {
      method: "GET",
      token,
    }),
};
