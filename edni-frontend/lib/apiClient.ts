import axios, { AxiosError } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("edni_access");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Shared refresh promise so concurrent 401s don't each trigger their own refresh call
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem("edni_refresh");
  if (!refreshToken) {
    throw new Error("No refresh token");
  }

  const res = await axios.post(`${BASE_URL}/auth/refresh`, {
    refresh_token: refreshToken,
  });

  const newAccessToken = res.data.access_token;
  localStorage.setItem("edni_access", newAccessToken);

  // Persist the rotated refresh token too - backend issues a new one each call
  if (res.data.refresh_token) {
    localStorage.setItem("edni_refresh", res.data.refresh_token);
  }

  return newAccessToken;
}

function logout() {
  localStorage.removeItem("edni_access");
  localStorage.removeItem("edni_refresh");
  localStorage.removeItem("edni_user");
  window.location.href = "/login";
}

// Response interceptor - handle 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retry?: boolean });

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      try {
        // Reuse an in-flight refresh instead of starting a new one
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }

        await refreshPromise;
        return apiClient(original);
      } catch {
        logout();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;