const TOKEN_KEY = "accessmanager:token";
const USER_KEY = "accessmanager:user";

export function normalizeRole(role) {
  return String(role || "USER").toUpperCase();
}

export function roleDestination(role) {
  const destinations = {
    ADMIN: "/admin",
    COORDINATOR: "/coordenador",
    USER: "/usuario",
  };

  return destinations[normalizeRole(role)] || "/usuario";
}

export function saveSession(token, user) {
  if (!token || !user?.id || !user?.role) {
    throw new Error("Sessão inválida");
  }

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function updateSessionUser(user) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
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
    const user = JSON.parse(rawUser);

    if (!user || typeof user !== "object" || !user.id || !user.role) {
      clearSession();
      return null;
    }

    return { token, user };
  } catch {
    clearSession();
    return null;
  }
}
