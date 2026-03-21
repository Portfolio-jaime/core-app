const ACCESS_KEY = "hos_access_token";
const REFRESH_KEY = "hos_refresh_token";
const COOKIE_NAME = "hos_access_token";

export const tokenStore = {
  setTokens(accessToken: string, refreshToken: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    // Write to cookie so middleware (edge) can read it without importing this file
    document.cookie = `${COOKIE_NAME}=${accessToken}; path=/; SameSite=Lax`;
  },

  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_KEY);
  },

  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_KEY);
  },

  clear() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  },
};
