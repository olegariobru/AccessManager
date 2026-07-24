const TOKEN_KEY = "accessmanager:token";
const USER_KEY = "accessmanager:user";

export function normalizeRole(role) {
  return String(role || "USER").toUpperCase();
}

export function roleDestination(role) {
  return normalizeRole(role) === "ADMIN" ? "/admin" : "/usuario";
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);

  if (!token || !rawUser) return null;

  try {
    return {
      token,
      user: JSON.parse(rawUser)
    };
  } catch {
    clearSession();
    return null;
  }
}